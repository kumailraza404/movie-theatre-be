import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShowtimeDocument = Showtime & Document;

@Schema({ timestamps: true })
export class Showtime {
  @Prop({ type: Types.ObjectId, ref: 'Movie', required: true })
  movieId: Types.ObjectId;

  @Prop({ required: true })
  datetime: Date;

  @Prop({ required: true, default: 5 })
  totalRows: number;

  @Prop({ required: true, default: 10 })
  totalColumns: number;
}

export const ShowtimeSchema = SchemaFactory.createForClass(Showtime);
