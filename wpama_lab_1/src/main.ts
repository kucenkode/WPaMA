import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Подключение Swagger только в режиме разработки
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Travel API')
      .setDescription(
        `
          Документация API для управления поездками.

          ## Возможности API:
          - Регистрация и аутентификация пользователей (JWT + HttpOnly cookies)
          - Вход через Yandex ID (OAuth 2.0)
          - CRUD операции с поездками
          - Пагинация и мягкое удаление

          ## Авторизация:
          Для доступа к защищенным эндпоинтам необходимо:
          1. Выполнить вход через \`/auth/login\` или \`/auth/register\`
          2. Cookie с токеном будет установлена автоматически
          3. Swagger автоматически отправляет cookie при запросах
      `,
      )
      .setVersion('1.0')
      .addTag('Auth', 'Эндпоинты аутентификации и авторизации')
      .addTag('Trips', 'CRUD операции с поездками')
      .addCookieAuth('access_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description:
          'JWT токен для авторизации (HttpOnly cookie). Устанавливается автоматически после входа.',
      })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    console.log(
      'Swagger документация доступна по адресу: http://localhost:4200/api/docs',
    );
  }

  const port = process.env.PORT || 4200;
  await app.listen(port);
}

bootstrap();
