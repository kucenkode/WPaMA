import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UpdateProfileDto, ProfileResponseDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';

interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
  };
}

@ApiTags('Profile')
@Controller('profile')
@UseGuards(AuthGuard)
@ApiCookieAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Получение профиля пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Профиль получен',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getProfile(@Req() req: RequestWithUser): Promise<ProfileResponseDto> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
    return this.profileService.getProfile(userId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление профиля пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Профиль обновлен',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: RequestWithUser,
  ): Promise<ProfileResponseDto> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
    return this.profileService.updateProfile(userId, dto);
  }
}
