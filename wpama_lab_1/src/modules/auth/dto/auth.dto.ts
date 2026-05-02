import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Минимум 6 символов' })
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class WhoamiResponseDto {
  id!: string;
  email!: string;
  isOAuthUser!: boolean;
  createdAt!: Date;
}

export class OAuthUserDto {
  email!: string;
  name?: string;
  yandexId?: string;
}
