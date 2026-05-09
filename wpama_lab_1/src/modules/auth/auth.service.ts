import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../../database/schemas/refresh-token.schema';
import { JwtManualService } from './jwt.service';
import { RedisService } from '../../common/redis/redis.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { RabbitMQService } from '../../common/queue/rabbitmq.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtManualService,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
  ) {}

  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token + (process.env.JWT_REFRESH_SECRET || 'secret'))
      .digest('hex');
  }

  private getAccessTokenKey(userId: string, jti: string): string {
    return `wp:auth:user:${userId}:access:${jti}`;
  }

  private getUserProfileCacheKey(userId: string): string {
    return `wp:auth:user:${userId}:profile`;
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

  private async publishUserRegisteredEvent(user: UserDocument): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'user.registered',
      timestamp: new Date().toISOString(),
      payload: {
        userId: (user._id as Types.ObjectId).toString(),
        email: user.email,
        displayName: user.email.split('@')[0],
      },
      metadata: {
        attempt: 1,
        sourceService: 'auth-service',
      },
    };

    try {
      await this.rabbitMQService.publish(
        'app.events',
        'user.registered',
        event,
      );
      console.log(
        `[RabbitMQ] Event published: ${event.eventId} for user ${user.email}`,
      );
    } catch (error) {
      console.error(`[RabbitMQ] Failed to publish event: ${error.message}`);
    }
  }

  async register(dto: RegisterDto, userAgent?: string, ip?: string) {
    const existingUser = await this.userModel
      .findOne({
        email: dto.email,
        deletedAt: null,
      })
      .exec();

    if (existingUser) {
      throw new BadRequestException(
        'Пользователь с таким email уже существует',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = new this.userModel({
      email: dto.email,
      passwordHash: hashedPassword,
      isOAuthUser: false,
    });

    await user.save();

    // Публикация события в RabbitMQ
    this.publishUserRegisteredEvent(user).catch((err) => {
      console.error(`[RabbitMQ] Failed to publish event: ${err.message}`);
    });

    return this.generateTokens(user, userAgent, ip);
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.userModel
      .findOne({
        email: dto.email,
        deletedAt: null,
      })
      .exec();

    if (!user || user.isOAuthUser) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash!,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.generateTokens(user, userAgent, ip);
  }

  async generateTokens(user: UserDocument, userAgent?: string, ip?: string) {
    const userId = (user._id as Types.ObjectId).toString();
    const { token: accessToken, jti } = this.jwtService.generateAccessToken(
      userId,
      user.email,
    );
    const refreshToken = this.jwtService.generateRefreshToken(
      userId,
      user.email,
    );

    const accessTtl = 15 * 60;
    await this.redisService.set(
      this.getAccessTokenKey(userId, jti),
      'valid',
      accessTtl,
    );

    const hashedRefreshToken = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenDoc = new this.refreshTokenModel({
      tokenHash: hashedRefreshToken,
      expiresAt,
      userAgent,
      ipAddress: ip,
      userId: user._id,
    });

    await refreshTokenDoc.save();

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: user.email,
        isOAuthUser: user.isOAuthUser,
      },
    };
  }

  async refreshTokens(refreshToken: string, userAgent?: string, ip?: string) {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Невалидный refresh токен');
    }

    const hashedToken = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenModel
      .findOne({
        tokenHash: hashedToken,
        revoked: false,
        expiresAt: { $gt: new Date() },
      })
      .populate('userId')
      .exec();

    if (!storedToken) {
      throw new UnauthorizedException('Refresh токен истёк или отозван');
    }

    const user = storedToken.userId as unknown as UserDocument;
    await this.refreshTokenModel.deleteOne({ _id: storedToken._id }).exec();

    return this.generateTokens(user, userAgent, ip);
  }

  async logout(refreshToken: string, accessToken?: string) {
    const hashedToken = this.hashToken(refreshToken);
    await this.refreshTokenModel
      .updateOne(
        { tokenHash: hashedToken, revoked: false },
        { $set: { revoked: true, revokedAt: new Date() } },
      )
      .exec();

    if (accessToken) {
      const payload = this.jwtService.verifyAccessToken(accessToken);
      if (payload && payload.jti) {
        await this.revokeAccessToken(payload.sub, payload.jti);
      }
    }

    return { message: 'Успешный выход из системы' };
  }

  async logoutAll(userId: string) {
    await this.refreshTokenModel
      .updateMany(
        { userId: new Types.ObjectId(userId), revoked: false },
        { $set: { revoked: true, revokedAt: new Date() } },
      )
      .exec();

    await this.revokeAllUserAccessTokens(userId);

    return { message: 'Все сессии завершены' };
  }

  async whoami(userId: string) {
    const cacheKey = this.getUserProfileCacheKey(userId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userModel
      .findOne({
        _id: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const profile = {
      id: userId,
      email: user.email,
      isOAuthUser: user.isOAuthUser,
    };

    await this.redisService.set(cacheKey, profile);
    return profile;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, deletedAt: null }).exec();
  }

  async createOAuthUser(
    email: string,
    providerId: string,
    provider: string,
  ): Promise<UserDocument> {
    const user = new this.userModel({
      email,
      isOAuthUser: true,
      yandexId: provider === 'yandex' ? providerId : undefined,
      vkId: provider === 'vk' ? providerId : undefined,
    });

    // Публикация события для OAuth пользователей тоже!
    this.publishUserRegisteredEvent(user).catch((err) => {
      console.error(
        `[RabbitMQ] Failed to publish event for OAuth user: ${err.message}`,
      );
    });

    return user.save();
  }

  async updateUser(user: UserDocument): Promise<UserDocument> {
    return user.save();
  }
}
