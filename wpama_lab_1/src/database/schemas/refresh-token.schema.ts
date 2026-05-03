import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  @Prop({ default: false })
  revoked!: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });
RefreshTokenSchema.index({ tokenHash: 1 });
