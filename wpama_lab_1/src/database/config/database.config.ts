import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Trip],
  synchronize: false, // Не создавать таблицы автоматически
  migrations: ['dist/migrations/*.js'],
  migrationsRun: true, // Автоматически запускать миграции
};
