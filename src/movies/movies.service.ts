import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import axios from "axios";
import "dotenv/config";
import { Model } from "mongoose";
import { Movie, MovieDocument } from "./schemas/movie.schema";

@Injectable()
export class MoviesService {
  private readonly tmdbBaseUrl = "https://api.themoviedb.org/3";
  private readonly tmdbToken = process.env.TMDB_API_TOKEN;

  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
  ) {}

  async getNowPlaying(page: number = 1) {
    try {
      const response = await axios.get(
        `${this.tmdbBaseUrl}/movie/now_playing?language=en-US&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${this.tmdbToken}`,
            accept: "application/json",
          },
        },
      );

      const movies = response.data.results;

      // Cache movies in database
      for (const movieData of movies) {
        await this.cacheMovie(movieData);
      }

      return {
        results: movies,
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      throw new Error(`Failed to fetch now playing movies: ${error.message}`);
    }
  }

  async getMovieDetails(tmdbId: number) {
    try {
      // Check cache first
      // const cachedMovie = await this.movieModel.findOne({ tmdbId });
      // if (cachedMovie) {
      //   return cachedMovie.toObject();
      // }

      // Fetch from TMDB
      const response = await axios.get(
        `${this.tmdbBaseUrl}/movie/${tmdbId}?language=en-US`,
        {
          headers: {
            Authorization: `Bearer ${this.tmdbToken}`,
            accept: "application/json",
          },
        },
      );

      const movieData = response.data;
      const movie = await this.cacheMovie(movieData);

      return movie.toObject();
    } catch (error) {
      throw new Error(`Failed to fetch movie details: ${error.message}`);
    }
  }

  async addMovieToDb(movieData: any) {
    return this.cacheMovie(movieData);
  }

  private async cacheMovie(movieData: any): Promise<MovieDocument> {
    const movie = await this.movieModel.findOneAndUpdate(
      { tmdbId: movieData.id },
      {
        tmdbId: movieData.id,
        title: movieData.title,
        overview: movieData.overview,
        posterPath: movieData.poster_path,
        backdropPath: movieData.backdrop_path,
        releaseDate: movieData.release_date
          ? new Date(movieData.release_date)
          : null,
        voteAverage: movieData.vote_average,
        voteCount: movieData.vote_count,
        popularity: movieData.popularity,
        runtime: movieData.runtime,
        genres: movieData.genres?.map((g: any) => g.name) || [],
      },
      { upsert: true, new: true },
    );

    return movie;
  }

  async getMovieByTmdbId(tmdbId: number): Promise<MovieDocument | null> {
    return this.movieModel.findOne({ tmdbId });
  }
}
