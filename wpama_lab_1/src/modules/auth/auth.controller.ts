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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, WhoamiResponseDto } from './dto/auth.dto';
import { AuthGuard } from './guards/auth.guard';
import { randomBytes } from 'crypto';

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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

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
  @ApiOperation({
    summary: 'Регистрация нового пользователя',
    description:
      'Создает нового пользователя и устанавливает cookies с access_token и refresh_token',
  })
  @ApiBody({ type: RegisterDto, description: 'Данные для регистрации' })
  @ApiCreatedResponse({
    description: 'Пользователь успешно создан',
    schema: {
      example: {
        success: true,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          isOAuthUser: false,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Пользователь с таким email уже существует',
    schema: {
      example: {
        statusCode: 400,
        message: 'Пользователь с таким email уже существует',
        error: 'Bad Request',
      },
    },
  })
  public async register(
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
  @ApiOperation({
    summary: 'Вход в систему',
    description:
      'Аутентификация пользователя и установка cookies с access_token и refresh_token',
  })
  @ApiBody({ type: LoginDto, description: 'Данные для входа' })
  @ApiOkResponse({
    description: 'Успешный вход',
    schema: {
      example: {
        success: true,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          isOAuthUser: false,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Неверный email или пароль',
    schema: {
      example: {
        statusCode: 401,
        message: 'Неверный email или пароль',
        error: 'Unauthorized',
      },
    },
  })
  public async login(
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление токенов',
    description:
      'Обновляет access и refresh токены с использованием refresh_token из cookies',
  })
  @ApiOkResponse({
    description: 'Токены успешно обновлены',
    schema: {
      example: {
        success: true,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          isOAuthUser: false,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh токен не найден, невалиден или истек',
    schema: {
      example: {
        statusCode: 401,
        message: 'Refresh token не найден',
        error: 'Unauthorized',
      },
    },
  })
  public async refresh(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const refreshToken = (req.cookies as any)?.refresh_token;

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
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Выход из системы',
    description:
      'Завершает текущую сессию (отзывает refresh токен) и очищает cookies',
  })
  @ApiOkResponse({
    description: 'Успешный выход',
    schema: {
      example: {
        success: true,
        message: 'Успешный выход из системы',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
    schema: {
      example: {
        statusCode: 401,
        message: 'Токен не предоставлен',
        error: 'Unauthorized',
      },
    },
  })
  public async logout(
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
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Завершение всех сессий',
    description:
      'Отзывает все refresh токены пользователя (все активные сессии)',
  })
  @ApiOkResponse({
    description: 'Все сессии завершены',
    schema: {
      example: {
        success: true,
        message: 'Все сессии завершены',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
  })
  public async logoutAll(
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
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Проверка авторизации',
    description:
      'Возвращает информацию о текущем авторизованном пользователе. Используется фронтендом для проверки статуса авторизации.',
  })
  @ApiOkResponse({
    description: 'Пользователь авторизован',
    type: WhoamiResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
    schema: {
      example: {
        statusCode: 401,
        message: 'Токен не предоставлен',
        error: 'Unauthorized',
      },
    },
  })
  public async whoami(@Req() req: RequestWithUser): Promise<WhoamiResponseDto> {
    const userId = req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    return this.authService.whoami(userId);
  }

  @Get('oauth/yandex')
  @ApiOperation({
    summary: 'Инициация OAuth через Yandex',
    description:
      'Перенаправляет пользователя на страницу авторизации Яндекса для входа через Yandex ID',
  })
  @ApiResponse({
    status: 302,
    description: 'Редирект на Yandex OAuth',
  })
  public yandexAuth(@Res() res: Response): void {
    const state = randomBytes(32).toString('hex');

    res.cookie('oauth_state', state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    });

    const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${process.env.YANDEX_CLIENT_ID}&redirect_uri=${process.env.YANDEX_CALLBACK_URL}&state=${state}`;

    res.redirect(authUrl);
  }

  @Get('oauth/yandex/callback')
  @ApiOperation({
    summary: 'Callback OAuth Yandex',
    description: 'Обрабатывает ответ от Яндекса, обменивает code на access_token, получает данные пользователя, создает/находит пользователя в БД и устанавливает cookies',
  })
  @ApiResponse({
    status: 302,
    description: 'Редирект на фронтенд после успешной авторизации',
  })
  @ApiUnauthorizedResponse({
    description: 'Неверный state параметр (CSRF защита) или ошибка OAuth',
  })
  public async yandexCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { code, state } = req.query;
    const savedState = (req.cookies as any)?.oauth_state;

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
      };

      const userResponse = await fetch(
        'https://login.yandex.ru/info?format=json',
        {
          headers: { Authorization: `OAuth ${tokenData.access_token}` },
        },
      );

      const userData = (await userResponse.json()) as {
        id: string;
        default_email: string;
      };

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
      console.error('OAuth error:', (err as Error).message);
      res.status(500).send('Ошибка авторизации через Яндекс');
    }
  }
}
