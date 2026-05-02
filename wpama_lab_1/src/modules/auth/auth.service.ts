import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { JwtManualService } from './jwt.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private redisService: RedisService,
    private jwtService: JwtManualService,
  ) {}

  // Хеширование токена для хранения в БД
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token + (process.env.JWT_REFRESH_SECRET || 'secret'))
      .digest('hex');
  }

  async register(dto: RegisterDto, userAgent?: string, ip?: string) {
    // Проверка существования пользователя
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Пользователь с таким email уже существует',
      );
    }

    // Хеширование пароля (bcrypt автоматически генерирует соль)
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Создание пользователя
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash: hashedPassword,
      isOAuthUser: false,
    });

    await this.userRepository.save(user);

    // Генерация токенов
    return this.generateTokens(user, userAgent, ip);
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    // Поиск пользователя
    const user = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });

    if (!user || user.isOAuthUser) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash!,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Генерация токенов
    return this.generateTokens(user, userAgent, ip);
  }

  async getYandexUser(accessToken: string) {
    try {
      const response = await axios.get('https://login.yandex.ru/info', {
        params: { format: 'json' },
        headers: { Authorization: `OAuth ${accessToken}` },
      });

      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Ошибка получения данных пользователя');
    }
  }

  async findOrCreateYandexUser(yandexId: string, email: string) {
    // Поиск пользователя по yandex_id
    let user = await this.userRepository.findOne({
      where: { yandexId, deletedAt: IsNull() },
    });

    // Если не найден, ищем по email
    if (!user) {
      user = await this.userRepository.findOne({
        where: { email, deletedAt: IsNull() },
      });
    }

    // Если пользователь не существует - создаем
    if (!user) {
      user = this.userRepository.create({
        email,
        yandexId,
        isOAuthUser: true,
      });
      await this.userRepository.save(user);
    } else if (!user.yandexId) {
      // Обновляем существующего пользователя
      user.yandexId = yandexId;
      await this.userRepository.save(user);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });
  }

  async createOAuthUser(
    email: string,
    providerId: string,
    provider: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      email,
      isOAuthUser: true,
      yandexId: provider === 'yandex' ? providerId : undefined,
      vkId: provider === 'vk' ? providerId : undefined,
    });
    return this.userRepository.save(user);
  }

  async updateUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async generateTokens(user: User, userAgent?: string, ip?: string) {
    const { token: accessToken, jti } = this.jwtService.generateAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = this.jwtService.generateRefreshToken(
      user.id,
      user.email,
    );

    // Сохранение JTI в Redis
    const accessTtl = 15 * 60;
    await this.redisService.set(
      this.getAccessTokenKey(user.id, jti),
      'valid',
      accessTtl,
    );

    const hashedRefreshToken = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      tokenHash: hashedRefreshToken,
      expiresAt,
      userAgent,
      ipAddress: ip,
      userId: user.id,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        isOAuthUser: user.isOAuthUser,
      },
    };
  }

  async refreshTokens(refreshToken: string, userAgent?: string, ip?: string) {
    // Верификация refresh токена
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Невалидный refresh токен');
    }

    // Поиск токена в БД
    const hashedToken = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hashedToken, revoked: false },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh токен истёк или отозван');
    }

    // Получаем пользователя
    const user = storedToken.user;

    // Удаляем старый токен
    await this.refreshTokenRepository.delete(storedToken.id);

    // Генерируем новую пару токенов
    return this.generateTokens(user, userAgent, ip);
  }

  async logout(refreshToken: string, accessToken?: string) {
    const hashedToken = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hashedToken, revoked: false },
    });

    if (storedToken) {
      // Помечаем refresh токен как отозванный
      storedToken.revoked = true;
      storedToken.revokedAt = new Date();
      await this.refreshTokenRepository.save(storedToken);
    }

    // Отзыв access токена из Redis
    if (accessToken) {
      const payload = this.jwtService.verifyAccessToken(accessToken);
      if (payload && payload.jti) {
        await this.revokeAccessToken(payload.sub, payload.jti);
      }
    }

    return { message: 'Успешный выход из системы' };
  }

  async logoutAll(userId: string) {
    // Отзываем все refresh токены пользователя
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    return { message: 'Все сессии завершены' };
  }

  async whoami(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: IsNull() },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return {
      id: user.id,
      email: user.email,
      isOAuthUser: user.isOAuthUser,
      createdAt: user.createdAt,
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, deletedAt: IsNull() },
    });
  }

  private getAccessTokenKey(userId: string, jti: string): string {
    return `wp:auth:user:${userId}:access:${jti}`;
  }

  async isAccessTokenValid(userId: string, jti: string): Promise<boolean> {
    const key = this.getAccessTokenKey(userId, jti);
    const value = await this.redisService.get(key);
    return value !== null;
  }

  async revokeAccessToken(userId: string, jti: string): Promise<void> {
    const key = this.getAccessTokenKey(userId, jti);
    await this.redisService.del(key);
  }

  async revokeAllUserAccessTokens(userId: string): Promise<void> {
    const pattern = `wp:auth:user:${userId}:access:*`;
    await this.redisService.delByPattern(pattern);
  }
}
