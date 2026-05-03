import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID файла аватара',
  })
  @IsOptional()
  @IsUUID()
  avatarFileId?: string;
}

export class ProfileResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID пользователя',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  email!: string;

  @ApiProperty({
    example: false,
    description: 'Зарегистрирован ли через OAuth',
  })
  isOAuthUser!: boolean;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID файла аватара',
  })
  avatarFileId?: string;
}
