import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';
import { SellerProfile } from '../entities/seller-profile.entity';
import { JwtAuthGuard, JwtPayload } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';

class LoginDto {
  username: string;
  password: string;
}

class RegisterDto {
  username: string;
  password: string;
  name: string;
  phone?: string;
  role: 'SELLER' | 'BUYER';
}

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(SellerProfile)
    private readonly profiles: Repository<SellerProfile>,
  ) {}

  private sign(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { expiresIn: '12h' },
    );
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.users.findOne({
      where: { username: dto.username },
    });
    if (!user || !bcrypt.compareSync(dto.password || '', user.passwordHash)) {
      throw new BadRequestException('用户名或密码错误');
    }
    return {
      token: this.sign(user),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    if (!dto?.username || !dto?.password || !dto?.name) {
      throw new BadRequestException('用户名、密码、姓名为必填');
    }
    if (!['SELLER', 'BUYER'].includes(dto.role)) {
      throw new BadRequestException('自助注册仅支持卖家或买家身份');
    }
    const exists = await this.users.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      throw new BadRequestException('用户名已存在');
    }
    const user = this.users.create({
      username: dto.username,
      passwordHash: bcrypt.hashSync(dto.password, 10),
      name: dto.name,
      phone: dto.phone || '',
      role: dto.role as UserRole,
    });
    await this.users.save(user);
    if (dto.role === 'SELLER') {
      await this.profiles.save(
        this.profiles.create({
          sellerId: user.id,
          riskNote: '新卖家，暂无历史记录',
        }),
      );
    }
    return {
      token: this.sign(user),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() u: JwtPayload) {
    return u;
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User, SellerProfile])],
  controllers: [AuthController],
})
export class AuthModule {}
