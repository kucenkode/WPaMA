import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtManualService {
  generateAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    const secret = process.env.JWT_ACCESS_SECRET;
    const expiresIn = process.env.JWT_ACCESS_EXPIRATION || '15m';

    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET is not defined in environment variables',
      );
    }

    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  generateRefreshToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    const secret = process.env.JWT_REFRESH_SECRET;
    const expiresIn = process.env.JWT_REFRESH_EXPIRATION || '7d';

    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined in environment variables',
      );
    }

    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not defined');
      }
      const decoded = jwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  verifyRefreshToken(token: string): JwtPayload | null {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not defined');
      }
      const decoded = jwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
}
