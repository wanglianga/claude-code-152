import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { CurrentUser, Public, Roles } from '../auth/decorators';
import { UserRole } from '../entities/user.entity';
import { OrderStatus } from '../entities/order.entity';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private ordersService: OrdersService) {}

  @Public()
  @Get()
  list(@Query('category') category?: string, @Query('keyword') keyword?: string) {
    return this.ordersService.marketplace(category, keyword);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.ordersService.marketItem(Number(id));
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.BUYER)
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create({ id: user.sub } as any, dto);
  }

  @Get('mine')
  @Roles(UserRole.BUYER)
  mine(@CurrentUser() user: any) {
    return this.ordersService.mine(user.sub);
  }

  @Get()
  @Roles(UserRole.CUSTOMER_SERVICE, UserRole.OPERATIONS, UserRole.DELIVERY)
  list(@Query('status') status?: OrderStatus) {
    return this.ordersService.findAll(status);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.ordersService.findOne(Number(id));
  }

  @Post(':id/confirm')
  @Roles(UserRole.BUYER)
  confirm(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.confirm(Number(id), { id: user.sub } as any);
  }
}
