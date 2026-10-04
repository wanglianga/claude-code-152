import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { UserRole } from '../entities/user.entity';
import { SettlementStatus } from '../entities/settlement.entity';

@Controller('settlements')
export class SettlementsController {
  constructor(private settlementsService: SettlementsService) {}

  @Get()
  @Roles(UserRole.OPERATIONS, UserRole.CUSTOMER_SERVICE)
  list(@Query('status') status?: SettlementStatus) {
    return this.settlementsService.findAll(status);
  }

  @Get('mine')
  @Roles(UserRole.SELLER)
  mine(@CurrentUser() user: any) {
    return this.settlementsService.findMine(user.sub);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.settlementsService.findOne(Number(id));
  }

  @Post(':id/finalize')
  @Roles(UserRole.OPERATIONS)
  finalize(@Param('id') id: string) {
    return this.settlementsService.finalize(Number(id));
  }
}
