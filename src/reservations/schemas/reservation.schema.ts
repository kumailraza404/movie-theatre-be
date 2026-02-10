import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReservationDocument = Reservation & Document;

export class Seat {
  row: number;
  column: number;
}

@Schema({ timestamps: true })
export class Reservation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Showtime', required: true })
  showtimeId: Types.ObjectId;

  @Prop({ type: [{ row: Number, column: Number }], required: true })
  seats: Seat[];

  @Prop({ required: true, enum: ['hold', 'confirmed'], default: 'hold' })
  status: string;

  @Prop()
  expiresAt: Date;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
