import { IsNotEmpty, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SeatDto {
  @IsNotEmpty()
  row: number;

  @IsNotEmpty()
  column: number;
}

export class HoldSeatsDto {
  @IsString()
  @IsNotEmpty()
  showtimeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats: SeatDto[];
}

export class ConfirmReservationDto {
  @IsString()
  @IsNotEmpty()
  reservationId: string;
}
