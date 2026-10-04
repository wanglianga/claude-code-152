import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { UserRole } from '../entities/user.entity';
import { DeliveryStatus, VehicleType } from '../entities/order.entity';
import { IssueType } from '../entities/issue.entity';

@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('tasks')
  @Roles(UserRole.DELIVERY, UserRole.OPERATIONS, UserRole.CUSTOMER_SERVICE)
  tasks(
    @Query('status') status?: DeliveryStatus,
    @Query('courierId') courierId?: string,
  ) {
    return this.deliveryService.listTasks(
      status,
      courierId ? Number(courierId) : undefined,
    );
  }

  @Post('schedule')
  @Roles(UserRole.DELIVERY, UserRole.OPERATIONS)
  schedule(
    @Body()
    body: {
      orderId: number;
      courierId?: number;
      vehicleType?: VehicleType;
      scheduledAt?: string;
      notes?: string;
    },
  ) {
    return this.deliveryService.schedule(
      body.orderId,
      body.courierId,
      body.vehicleType,
      body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      body.notes,
    );
  }

  @Post('tasks/:id/start')
  @Roles(UserRole.DELIVERY)
  start(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveryService.start(Number(id), { id: user.sub } as any);
  }

  @Post('tasks/:id/complete')
  @Roles(UserRole.DELIVERY)
  complete(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.deliveryService.complete(Number(id), { id: user.sub } as any, body?.notes);
  }

  @Post('tasks/:id/fail')
  @Roles(UserRole.DELIVERY)
  fail(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason: string; issueType?: IssueType },
  ) {
    return this.deliveryService.fail(
      Number(id),
      { id: user.sub } as any,
      body.reason,
      body.issueType,
    );
  }
}
