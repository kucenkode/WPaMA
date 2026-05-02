import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtManualService, JwtPayload } from '../jwt.service';

interface CookieRequest extends Request {
  cookies: {
    access_token?: string;
    refresh_token?: string;
  };
}

interface RequestWithUser extends CookieRequest {
  user?: JwtPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtManualService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Извлекаем access token из cookies с правильной типизацией
    const token: string | undefined = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Токен не предоставлен');
    }

    // Верифицируем токен
    const payload: JwtPayload | null = this.jwtService.verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedException('Невалидный или истёкший токен');
    }

    // Добавляем информацию о пользователе в request
    request.user = payload;

    return true;
  }
}
