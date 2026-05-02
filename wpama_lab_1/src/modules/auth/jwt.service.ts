import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtManualService {
  generateAccessToken(
    userId: string,
    email: string,
  ): { token: string; jti: string } {
    const jti = randomBytes(16).toString('hex');
    const payload: JwtPayload = { sub: userId, email, jti };
    const secret = process.env.JWT_ACCESS_SECRET;
    const expiresIn = process.env.JWT_ACCESS_EXPIRATION || '15m';

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    const options: jwt.SignOptions = {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    };
    const token = jwt.sign(payload, secret, options);
    return { token, jti };
  }

  generateRefreshToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    const secret = process.env.JWT_REFRESH_SECRET;
    const expiresIn = process.env.JWT_REFRESH_EXPIRATION || '7d';

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const options: jwt.SignOptions = {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload, secret, options);
  }

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) return null;
      const decoded = jwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  verifyRefreshToken(token: string): JwtPayload | null {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) return null;
      const decoded = jwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }
}
