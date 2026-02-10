import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MoviesService } from '../movies/movies.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { Showtime, ShowtimeDocument } from './schemas/showtime.schema';

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectModel(Showtime.name) private showtimeModel: Model<ShowtimeDocument>,
    private moviesService: MoviesService,
  ) {}

  async createShowtime(createShowtimeDto: CreateShowtimeDto): Promise<ShowtimeDocument> {
    const { movieId, datetime, totalRows = 5, totalColumns = 10 } = createShowtimeDto;

    const showtime = new this.showtimeModel({
      movieId: new Types.ObjectId(movieId),
      datetime: new Date(datetime),
      totalRows,
      totalColumns,
    });

    return showtime.save();
  }

  async getShowtimesByMovie(movieId: string): Promise<ShowtimeDocument[]> {
    return this.showtimeModel
      .find({ movieId: new Types.ObjectId(movieId) })
      .sort({ datetime: 1 })
      .exec();
  }

  async getShowtimeById(showtimeId: string): Promise<ShowtimeDocument | null> {
    return this.showtimeModel.findById(showtimeId).exec();
  }

  async autoGenerateShowtimes(movieId: string, days: number = 7): Promise<ShowtimeDocument[]> {
    // Try to find movie by TMDB ID first
    const tmdbId = parseInt(movieId, 10);
    let movie;
    let mongoMovieId: Types.ObjectId;

    if (!isNaN(tmdbId)) {
      // If it's a number, treat it as TMDB ID
      movie = await this.moviesService.getMovieByTmdbId(tmdbId);
      if (!movie) {
        throw new Error(`Movie with TMDB ID ${tmdbId} not found. Please make sure the movie exists in the database.`);
      }
      mongoMovieId = movie._id as Types.ObjectId;
    } else {
      // Otherwise, treat it as MongoDB ObjectId
      if (!Types.ObjectId.isValid(movieId)) {
        throw new Error(`Invalid movieId: ${movieId}. Must be a valid TMDB ID (number) or MongoDB ObjectId.`);
      }
      mongoMovieId = new Types.ObjectId(movieId);
    }

    const showtimes: ShowtimeDocument[] = [];
    const now = new Date();
    const defaultRows = 5;
    const defaultColumns = 10;

    // Generate 3 showtimes per day for the next N days
    for (let day = 0; day < days; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(0, 0, 0, 0);

      // Create 3 showtimes: 2:00 PM, 5:00 PM, 8:00 PM
      const times = [14, 17, 20];
      
      for (const hour of times) {
        const showtimeDate = new Date(date);
        showtimeDate.setHours(hour, 0, 0, 0);

        // Check if showtime already exists
        const existing = await this.showtimeModel.findOne({
          movieId: mongoMovieId,
          datetime: showtimeDate,
        });

        if (!existing) {
          const showtime = new this.showtimeModel({
            movieId: mongoMovieId,
            datetime: showtimeDate,
            totalRows: defaultRows,
            totalColumns: defaultColumns,
          });
          await showtime.save();
          showtimes.push(showtime);
        }
      }
    }

    return showtimes;
  }

  async getAllShowtimes(): Promise<ShowtimeDocument[]> {
    return this.showtimeModel.find().sort({ datetime: 1 }).exec();
  }
}
