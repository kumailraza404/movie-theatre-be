import { IsNotEmpty, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateShowtimeDto {
  @IsNotEmpty()
  movieId: string;

  @IsDateString()
  @IsNotEmpty()
  datetime: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalRows?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalColumns?: number;
}
