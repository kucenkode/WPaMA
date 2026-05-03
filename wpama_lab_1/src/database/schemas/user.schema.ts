import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop()
  passwordHash?: string;

  @Prop()
  salt?: string;

  @Prop()
  yandexId?: string;

  @Prop()
  vkId?: string;

  @Prop({ default: false })
  isOAuthUser!: boolean;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 });
UserSchema.index({ deletedAt: 1 });
UserSchema.index({ yandexId: 1 });
