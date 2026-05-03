import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto, ProfileResponseDto } from './dto/profile.dto';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private storageService: StorageService,
    private redisService: RedisService,
  ) {}

  private getUserProfileCacheKey(userId: string): string {
    return `wp:auth:user:${userId}:profile`;
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const cacheKey = this.getUserProfileCacheKey(userId);
    const cached = await this.redisService.get<ProfileResponseDto>(cacheKey);
    if (cached) return cached;

    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .exec();
    if (!user) throw new NotFoundException('User not found');

    return {
      id: userId,
      email: user.email,
      isOAuthUser: user.isOAuthUser,
      avatarFileId: user.avatarFileId?.toString(),
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const updateData: any = {};

    if (dto.avatarFileId) {
      const isValid = await this.storageService.validateFileOwnership(
        dto.avatarFileId,
        userId,
      );
      if (!isValid) {
        throw new ForbiddenException('File does not belong to this user');
      }
      updateData.avatarFileId = new Types.ObjectId(dto.avatarFileId);
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        new Types.ObjectId(userId),
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!user) throw new NotFoundException('User not found');

    await this.redisService.del(this.getUserProfileCacheKey(userId));

    return {
      id: userId,
      email: user.email,
      isOAuthUser: user.isOAuthUser,
      avatarFileId: user.avatarFileId?.toString(),
    };
  }
}
