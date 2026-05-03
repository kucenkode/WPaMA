import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtManualService } from './jwt.service';
import { AuthGuard } from './guards/auth.guard';
import { User, UserSchema } from '../../database/schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../../database/schemas/refresh-token.schema';
import { RedisModule } from '../../common/redis/redis.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    RedisModule,
    forwardRef(() => StorageModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtManualService, AuthGuard],
  exports: [AuthService, JwtManualService, AuthGuard],
})
export class AuthModule {}
