import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { HoldSeatsDto, ConfirmReservationDto } from './dto/hold-seats.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('my-reservations')
  @UseGuards(JwtAuthGuard)
  async getMyReservations(@CurrentUser() user: any) {
    return this.reservationsService.getUserReservations(user.userId);
  }

  @Get('showtime/:showtimeId')
  async getSeatAvailability(@Param('showtimeId') showtimeId: string) {
    return this.reservationsService.getSeatAvailability(showtimeId);
  }

  @Post('hold')
  @UseGuards(JwtAuthGuard)
  async holdSeats(
    @CurrentUser() user: any,
    @Body() holdSeatsDto: HoldSeatsDto,
  ) {
    return this.reservationsService.holdSeats(user.userId, holdSeatsDto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async confirmReservation(
    @CurrentUser() user: any,
    @Body() confirmDto: ConfirmReservationDto,
  ) {
    return this.reservationsService.confirmReservation(user.userId, confirmDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelReservation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    await this.reservationsService.cancelReservation(user.userId, id);
    return { message: 'Reservation cancelled successfully' };
  }

  @Post('cleanup-expired')
  async cleanupExpiredHolds() {
    await this.reservationsService.cleanupExpiredHolds();
    return { message: 'Expired holds cleaned up successfully' };
  }
}
