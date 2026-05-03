import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { Trip, TripSchema } from '../../database/schemas/trip.schema';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trip.name, schema: TripSchema }]),
    AuthModule,
    RedisModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
