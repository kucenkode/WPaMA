import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsModule } from './modules/trips/trips.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { Trip } from './database/entities/trip.entity';
import { User } from './database/entities/user.entity';
import { RefreshToken } from './database/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: Number(configService.get('DB_PORT')),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [Trip, User, RefreshToken],
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: true,
      }),
      inject: [ConfigService],
    }),
    TripsModule,
    AuthModule,
    RedisModule,
  ],
})
export class AppModule {}
