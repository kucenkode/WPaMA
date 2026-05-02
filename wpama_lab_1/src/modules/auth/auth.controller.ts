import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AuthGuard } from './guards/auth.guard';
import { randomBytes } from 'crypto';

// Кастомный интерфейс для Request с user
interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
  };
  cookies: {
    access_token?: string;
    refresh_token?: string;
    oauth_state?: string;
  };
}

// Интерфейс для данных от Яндекс OAuth
interface YandexTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface YandexUserResponse {
  id: string;
  default_email: string;
  login?: string;
  display_name?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    const { accessToken, refreshToken, user } = await this.authService.register(
      dto,
      userAgent,
      ip,
    );

    this.setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      user,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    const { accessToken, refreshToken, user } = await this.authService.login(
      dto,
      userAgent,
      ip,
    );

    this.setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      user,
    });
  }

  @Get('oauth/yandex')
  yandexAuth(@Res() res: Response): void {
    const state = randomBytes(32).toString('hex');

    res.cookie('oauth_state', state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    });

    const clientId = process.env.YANDEX_CLIENT_ID;
    const redirectUri = process.env.YANDEX_CALLBACK_URL;

    const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;

    res.redirect(authUrl);
  }

  @Get('oauth/yandex/callback')
  async yandexCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const { code, state } = req.query;
    const savedState = req.cookies?.oauth_state;

    if (!state || state !== savedState) {
      throw new UnauthorizedException('Неверный state параметр');
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code as string);
      params.append('client_id', process.env.YANDEX_CLIENT_ID!);
      params.append('client_secret', process.env.YANDEX_CLIENT_SECRET!);

      const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const tokenData = (await tokenResponse.json()) as YandexTokenResponse;

      if (!tokenResponse.ok) {
        throw new Error(`Yandex token error: ${JSON.stringify(tokenData)}`);
      }

      const accessToken = tokenData.access_token;

      const userResponse = await fetch(
        'https://login.yandex.ru/info?format=json',
        {
          headers: {
            Authorization: `OAuth ${accessToken}`,
          },
        },
      );

      const userData = (await userResponse.json()) as YandexUserResponse;

      let user = await this.authService.findByEmail(userData.default_email);

      if (!user) {
        user = await this.authService.createOAuthUser(
          userData.default_email,
          userData.id,
          'yandex',
        );
      } else if (!user.yandexId) {
        user.yandexId = userData.id;
        await this.authService.updateUser(user);
      }

      const userAgent = req.headers['user-agent'];
      const ip = req.ip;
      const tokens = await this.authService.generateTokens(user, userAgent, ip);

      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      res.clearCookie('oauth_state');

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(frontendUrl);
    } catch (err) {
      const error = err as Error;
      console.error('OAuth error:', error.message);
      res.status(500).send('Ошибка авторизации через Яндекс');
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<Response> {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token не найден');
    }

    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    const { accessToken, refreshToken: newRefreshToken, user } = 
      await this.authService.refreshTokens(refreshToken, userAgent, ip);

    this.setAuthCookies(res, accessToken, newRefreshToken);

    return res.json({
      success: true,
      user,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<Response> {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearAuthCookies(res);

    return res.json({
      success: true,
      message: 'Успешный выход из системы',
    });
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logoutAll(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<Response> {
    const userId = req.user?.sub;

    if (userId) {
      await this.authService.logoutAll(userId);
    }
    this.clearAuthCookies(res);

    return res.json({
      success: true,
      message: 'Все сессии завершены',
    });
  }

  @Get('whoami')
  @UseGuards(AuthGuard)
  async whoami(
    @Req() req: RequestWithUser,
  ): Promise<ReturnType<AuthService['whoami']>> {
    const userId = req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    return this.authService.whoami(userId);
  }
}
