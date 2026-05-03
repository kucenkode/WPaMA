import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { TripsModule } from './modules/trips/trips.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    TripsModule,
    AuthModule,
    RedisModule,
  ],
})
export class AppModule {}