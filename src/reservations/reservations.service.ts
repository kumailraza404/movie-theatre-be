import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument, Seat } from './schemas/reservation.schema';
import { HoldSeatsDto, ConfirmReservationDto } from './dto/hold-seats.dto';
import { RedisService } from '../config/redis.config';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { ReservationsGateway } from './reservations.gateway';

@Injectable()
export class ReservationsService {
  private readonly HOLD_EXPIRATION_SECONDS = 300; // 5 minutes

  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    private redisService: RedisService,
    private showtimesService: ShowtimesService,
    @Optional() @Inject(forwardRef(() => ReservationsGateway))
    private reservationsGateway?: ReservationsGateway,
  ) {}

  async getSeatAvailability(showtimeId: string) {
    const showtime = await this.showtimesService.getShowtimeById(showtimeId);
    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    // Get all reservations for this showtime
    const reservations = await this.reservationModel.find({
      showtimeId: new Types.ObjectId(showtimeId),
      status: { $in: ['hold', 'confirmed'] },
    });

    // Build seat map
    const seatMap: Map<string, { status: string; reservationId?: string }> = new Map();
    
    // Mark confirmed seats
    reservations
      .filter((r) => r.status === 'confirmed')
      .forEach((reservation) => {
        reservation.seats.forEach((seat) => {
          const key = `${seat.row}-${seat.column}`;
          seatMap.set(key, { status: 'confirmed', reservationId: reservation._id.toString() });
        });
      });

    // Mark held seats
    reservations
      .filter((r) => r.status === 'hold' && r.expiresAt && r.expiresAt > new Date())
      .forEach((reservation) => {
        reservation.seats.forEach((seat) => {
          const key = `${seat.row}-${seat.column}`;
          if (!seatMap.has(key)) {
            seatMap.set(key, { status: 'hold', reservationId: reservation._id.toString() });
          }
        });
      });

    // Build availability grid
    const availability: Array<Array<{ row: number; column: number; status: string }>> = [];
    for (let row = 1; row <= showtime.totalRows; row++) {
      const rowSeats: Array<{ row: number; column: number; status: string }> = [];
      for (let col = 1; col <= showtime.totalColumns; col++) {
        const key = `${row}-${col}`;
        const seatInfo = seatMap.get(key);
        rowSeats.push({
          row,
          column: col,
          status: seatInfo?.status || 'available',
        });
      }
      availability.push(rowSeats);
    }

    return {
      showtime: {
        id: showtime._id,
        movieId: showtime.movieId,
        datetime: showtime.datetime,
        totalRows: showtime.totalRows,
        totalColumns: showtime.totalColumns,
      },
      availability,
    };
  }

  async holdSeats(userId: string, holdSeatsDto: HoldSeatsDto): Promise<ReservationDocument> {
    const { showtimeId, seats } = holdSeatsDto;

    // Validate showtime exists
    const showtime = await this.showtimesService.getShowtimeById(showtimeId);
    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    // Validate seats are within bounds
    for (const seat of seats) {
      if (seat.row < 1 || seat.row > showtime.totalRows) {
        throw new BadRequestException(`Invalid row: ${seat.row}`);
      }
      if (seat.column < 1 || seat.column > showtime.totalColumns) {
        throw new BadRequestException(`Invalid column: ${seat.column}`);
      }
    }

    // Check Redis locks for all seats
    const lockKeys: string[] = [];
    const lockedSeats: Seat[] = [];

    for (const seat of seats) {
      const lockKey = `seat:lock:${showtimeId}:${seat.row}:${seat.column}`;
      lockKeys.push(lockKey);

      // Try to acquire lock
      const lockAcquired = await this.redisService.setLock(
        lockKey,
        userId,
        this.HOLD_EXPIRATION_SECONDS,
      );

      if (!lockAcquired) {
        // Release all previously acquired locks
        for (const key of lockKeys.slice(0, -1)) {
          await this.redisService.del(key);
        }
        throw new BadRequestException(`Seat ${seat.row}-${seat.column} is already held`);
      }

      lockedSeats.push(seat);
    }

    // Check if seats are already reserved
    const existingReservations = await this.reservationModel.find({
      showtimeId: new Types.ObjectId(showtimeId),
      status: 'confirmed',
    });

    for (const seat of seats) {
      const isReserved = existingReservations.some((reservation) =>
        reservation.seats.some(
          (s) => s.row === seat.row && s.column === seat.column,
        ),
      );

      if (isReserved) {
        // Release all locks
        for (const key of lockKeys) {
          await this.redisService.del(key);
        }
        throw new BadRequestException(`Seat ${seat.row}-${seat.column} is already reserved`);
      }
    }

    // Create reservation with hold status
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.HOLD_EXPIRATION_SECONDS);

    const reservation = new this.reservationModel({
      userId: new Types.ObjectId(userId),
      showtimeId: new Types.ObjectId(showtimeId),
      seats: lockedSeats,
      status: 'hold',
      expiresAt,
    });

    await reservation.save();

    // Broadcast seat update via WebSocket
    if (this.reservationsGateway) {
      const availability = await this.getSeatAvailability(showtimeId);
      this.reservationsGateway.broadcastSeatUpdate(showtimeId, availability);
    }

    return reservation;
  }

  async confirmReservation(
    userId: string,
    confirmDto: ConfirmReservationDto,
  ): Promise<ReservationDocument> {
    const { reservationId } = confirmDto;

    const reservation = await this.reservationModel.findOne({
      _id: new Types.ObjectId(reservationId),
      userId: new Types.ObjectId(userId),
      status: 'hold',
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found or already confirmed');
    }

    // Check if hold has expired
    if (reservation.expiresAt && reservation.expiresAt < new Date()) {
      await this.releaseSeats(reservation);
      throw new BadRequestException('Reservation hold has expired');
    }

    // Verify Redis locks still exist
    const showtime = await this.showtimesService.getShowtimeById(
      reservation.showtimeId.toString(),
    );
    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    for (const seat of reservation.seats) {
      const lockKey = `seat:lock:${reservation.showtimeId}:${seat.row}:${seat.column}`;
      const lockValue = await this.redisService.get(lockKey);

      if (!lockValue || lockValue !== userId) {
        await this.releaseSeats(reservation);
        throw new BadRequestException('Seat locks have expired or been released');
      }
    }

    // Convert hold to confirmed
    reservation.status = 'confirmed';
    reservation.expiresAt = undefined;
    await reservation.save();

    // Release Redis locks (they're now confirmed, not held)
    for (const seat of reservation.seats) {
      const lockKey = `seat:lock:${reservation.showtimeId}:${seat.row}:${seat.column}`;
      await this.redisService.del(lockKey);
    }

    // Broadcast seat update via WebSocket
    if (this.reservationsGateway) {
      const availability = await this.getSeatAvailability(reservation.showtimeId.toString());
      this.reservationsGateway.broadcastSeatUpdate(reservation.showtimeId.toString(), availability);
    }

    return reservation;
  }

  async cancelReservation(userId: string, reservationId: string): Promise<void> {
    const reservation = await this.reservationModel.findOne({
      _id: new Types.ObjectId(reservationId),
      userId: new Types.ObjectId(userId),
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    await this.releaseSeats(reservation);
    await this.reservationModel.deleteOne({ _id: reservation._id });

    // Broadcast seat update via WebSocket
    if (this.reservationsGateway) {
      const availability = await this.getSeatAvailability(reservation.showtimeId.toString());
      this.reservationsGateway.broadcastSeatUpdate(reservation.showtimeId.toString(), availability);
    }
  }

  private async releaseSeats(reservation: ReservationDocument): Promise<void> {
    // Release Redis locks
    for (const seat of reservation.seats) {
      const lockKey = `seat:lock:${reservation.showtimeId}:${seat.row}:${seat.column}`;
      await this.redisService.del(lockKey);
    }
  }

  async getUserReservations(userId: string) {
    const reservations = await this.reservationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'showtimeId',
        populate: {
          path: 'movieId',
          model: 'Movie',
        },
      })
      .sort({ createdAt: -1 })
      .exec();

    return reservations.map((reservation: any) => {
      const showtime = reservation.showtimeId;
      const movie = showtime?.movieId;

      return {
        _id: reservation._id,
        showtime: {
          _id: showtime?._id,
          datetime: showtime?.datetime,
          totalRows: showtime?.totalRows,
          totalColumns: showtime?.totalColumns,
        },
        movie: movie ? {
          _id: movie._id,
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          backdropPath: movie.backdropPath,
        } : null,
        seats: reservation.seats,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
        createdAt: reservation.createdAt,
      };
    });
  }

  async cleanupExpiredHolds(): Promise<void> {
    const expiredHolds = await this.reservationModel.find({
      status: 'hold',
      expiresAt: { $lt: new Date() },
    });

    for (const hold of expiredHolds) {
      await this.releaseSeats(hold);
      await this.reservationModel.deleteOne({ _id: hold._id });
    }
  }
}
