import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { UserRole } from '../entities/user.entity';
import { ItemStatus, PrepTaskStatus } from '../entities/item.entity';

@Controller('inventory')
@Roles(UserRole.WAREHOUSE, UserRole.REFURBISHER, UserRole.OPERATIONS)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('items')
  items(@Query('status') status?: ItemStatus) {
    return this.inventoryService.listItems(status);
  }

  @Get('items/:id')
  item(@Param('id') id: string) {
    return this.inventoryService.getItem(Number(id));
  }

  @Get('prep-tasks')
  tasks(@Query('status') status?: PrepTaskStatus) {
    return this.inventoryService.listTasks(status);
  }

  @Post('prep-tasks/:id/claim')
  claimTask(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.claimTask(Number(id), { id: user.sub } as any);
  }

  @Post('prep-tasks/:id/complete')
  completeTask(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { cost?: number; notes?: string },
  ) {
    return this.inventoryService.completeTask(
      Number(id),
      { id: user.sub } as any,
      body.cost || 0,
      body.notes,
    );
  }

  @Post('items/:id/list')
  listItem(
    @Param('id') id: string,
    @Body()
    body: {
      listingTitle: string;
      listingDescription: string;
      listPrice: number;
      photos: string[];
      deliveryZones: string[];
    },
  ) {
    return this.inventoryService.list(Number(id), body);
  }

  @Post('items/:id/off-shelf')
  offShelf(@Param('id') id: string) {
    return this.inventoryService.offShelf(Number(id));
  }

  @Post('items/:id/location')
  updateLocation(
    @Param('id') id: string,
    @Body() body: { warehouseLocation: string },
  ) {
    return this.inventoryService.updateLocation(Number(id), body.warehouseLocation);
  }

  @Post('items/:id/report-mismatch')
  reportMismatch(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { description: string },
  ) {
    return this.inventoryService.reportMismatch(
      Number(id),
      { id: user.sub } as any,
      body.description,
    );
  }
}
