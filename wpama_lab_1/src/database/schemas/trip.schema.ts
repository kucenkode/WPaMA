import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TripDocument = HydratedDocument<Trip>;

@Schema({ timestamps: true })
export class Trip {
  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  destination!: string;

  @Prop({ required: true, type: Date })
  startDate!: Date;

  @Prop({ required: true, type: Date })
  endDate!: Date;

  @Prop({ default: 0 })
  price!: number;

  @Prop({ default: 'planned' })
  status!: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

TripSchema.index({ deletedAt: 1 });
TripSchema.index({ createdAt: -1 });
