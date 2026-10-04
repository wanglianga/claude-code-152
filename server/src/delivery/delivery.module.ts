import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryTask, Order } from '../entities/order.entity';
import { FurnitureItem } from '../entities/item.entity';
import { User } from '../entities/user.entity';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryTask, Order, FurnitureItem, User]),
    IssuesModule,
  ],
  providers: [DeliveryService],
  controllers: [DeliveryController],
})
export class DeliveryModule {}
