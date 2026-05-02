import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { Trip } from '../../database/entities/trip.entity';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Trip]), AuthModule, RedisModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
