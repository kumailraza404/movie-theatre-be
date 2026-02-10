import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MoviesService } from '../movies/movies.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { ShowtimesService } from './showtimes.service';

@Controller('showtimes')
export class ShowtimesController {
  constructor(
    private readonly showtimesService: ShowtimesService,
    private readonly moviesService: MoviesService,
  ) {}

  @Get('movie/:movieId')
  async getShowtimesByMovie(@Param('movieId') movieId: string) {
    // movieId can be either MongoDB ObjectId or TMDB ID
    // Try to find movie by TMDB ID first, then use MongoDB _id
    const tmdbId = parseInt(movieId, 10);
    if (!isNaN(tmdbId)) {
      const movie = await this.moviesService.getMovieByTmdbId(tmdbId);
      if (movie) {
        return this.showtimesService.getShowtimesByMovie(movie._id.toString());
      }
    }
    // If not found by TMDB ID, try as MongoDB ObjectId
    return this.showtimesService.getShowtimesByMovie(movieId);
  }

  @Get(':id')
  async getShowtimeById(@Param('id') id: string) {
    return this.showtimesService.getShowtimeById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createShowtime(@Body() createShowtimeDto: CreateShowtimeDto) {
    return this.showtimesService.createShowtime(createShowtimeDto);
  }

  @Post('auto-generate/:movieId')
//   @UseGuards(JwtAuthGuard)
  async autoGenerateShowtimes(
    @Param('movieId') movieId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.showtimesService.autoGenerateShowtimes(movieId, daysNum);
  }
}
