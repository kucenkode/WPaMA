import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FileDocument = HydratedDocument<File>;

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  objectKey!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true })
  mimetype!: string;

  @Prop({ required: true })
  bucket!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);

FileSchema.index({ userId: 1 });
FileSchema.index({ deletedAt: 1 });
