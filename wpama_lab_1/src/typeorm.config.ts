import { DataSource } from 'typeorm';
import { Trip } from './database/entities/trip.entity';
import { User } from './database/entities/user.entity';
import { RefreshToken } from './database/entities/refresh-token.entity';
import 'dotenv/config';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Trip, User, RefreshToken],
  migrations: ['dist/database/migrations/*.ts'],
});
