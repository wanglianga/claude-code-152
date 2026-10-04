import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  username: string;
  name: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('缺少登录令牌');
    }
    try {
      req.user = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-secret-change-me',
      ) as JwtPayload;
    } catch {
      throw new UnauthorizedException('登录令牌无效或已过期');
    }
    return true;
  }
}
