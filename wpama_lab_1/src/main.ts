import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Используем cookie-parser
  app.use(cookieParser());

  // Включаем CORS для фронтенда
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 4200;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();