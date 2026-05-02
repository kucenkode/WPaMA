import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Trip, User, RefreshToken],
  synchronize: false,
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: true,
};
