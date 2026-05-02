import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtManualService } from './jwt.service';
import { AuthGuard } from './guards/auth.guard';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken]), RedisModule],
  controllers: [AuthController],
  providers: [AuthService, JwtManualService, AuthGuard],
  exports: [AuthService, JwtManualService, AuthGuard],
})
export class AuthModule {}
