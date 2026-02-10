import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationsGateway } from './reservations.gateway';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { ShowtimesModule } from '../showtimes/showtimes.module';
import { MoviesModule } from '../movies/movies.module';
import { RedisService } from '../config/redis.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
    ]),
    ShowtimesModule,
    MoviesModule,
  ],
  controllers: [ReservationsController],
  providers: [
    RedisService,
    ReservationsGateway,
    ReservationsService,
  ],
  exports: [ReservationsService, ReservationsGateway],
})
export class ReservationsModule {}
