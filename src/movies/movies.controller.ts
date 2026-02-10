import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('now-playing')
  async getNowPlaying(@Query('page') page?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.moviesService.getNowPlaying(pageNum);
  }

  @Get(':id')
  async getMovieDetails(@Param('id') id: string) {
    const tmdbId = parseInt(id, 10);
    return this.moviesService.getMovieDetails(tmdbId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addMovie(@Body() movieData: any) {
    return this.moviesService.addMovieToDb(movieData);
  }
}
