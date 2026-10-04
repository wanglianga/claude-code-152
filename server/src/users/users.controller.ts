import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, ROLE_LABELS } from '../entities/user.entity';
import { Roles } from '../auth/decorators';

@Controller('users')
export class UsersController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  // 员工下拉选项（客服/运营/管理员可用）
  @Get()
  @Roles(
    UserRole.CUSTOMER_SERVICE,
    UserRole.OPERATIONS,
    UserRole.WAREHOUSE,
    UserRole.APPRAISER,
  )
  async list(@Query('role') role?: UserRole) {
    const where = role ? { role } : {};
    const list = await this.users.find({ where, order: { id: 'ASC' } });
    return list.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      roleLabel: ROLE_LABELS[u.role],
    }));
  }
}
