import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '12345678',
    description: 'Пароль (минимум 6 символов)',
    minLength: 6,
    required: true,
  })
  @IsString()
  @MinLength(6, { message: 'Минимум 6 символов' })
  password!: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '12345678',
    description: 'Пароль',
    required: true,
  })
  @IsString()
  password!: string;
}

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh токен из cookies',
    required: true,
  })
  @IsString()
  refreshToken!: string;
}

export class WhoamiResponseDto {
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

  @ApiProperty({
    example: '2026-01-01T12:00:00.000Z',
    description: 'Дата регистрации',
  })
  createdAt!: Date;
}

export class UserResponseDto {
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

  @ApiProperty({
    example: '2026-01-01T12:00:00.000Z',
    description: 'Дата регистрации',
  })
  createdAt!: Date;
}
