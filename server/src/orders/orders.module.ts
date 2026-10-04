import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { FurnitureItem } from '../entities/item.entity';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { OrdersService } from './orders.service';
import { MarketplaceController, OrdersController } from './orders.controller';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, FurnitureItem, Consignment, Appraisal]),
    SettlementsModule,
  ],
  providers: [OrdersService],
  controllers: [MarketplaceController, OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
