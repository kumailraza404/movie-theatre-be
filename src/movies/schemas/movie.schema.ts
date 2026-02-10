import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MovieDocument = Movie & Document;

@Schema({ timestamps: true })
export class Movie {
  @Prop({ required: true, unique: true })
  tmdbId: number;

  @Prop({ required: true })
  title: string;

  @Prop()
  overview: string;

  @Prop()
  posterPath: string;

  @Prop()
  backdropPath: string;

  @Prop()
  releaseDate: Date;

  @Prop()
  voteAverage: number;

  @Prop()
  voteCount: number;

  @Prop()
  popularity: number;

  @Prop()
  runtime: number;

  @Prop([String])
  genres: string[];
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
