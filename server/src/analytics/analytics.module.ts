import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consignment } from '../entities/consignment.entity';
import { FurnitureItem } from '../entities/item.entity';
import { Order, DeliveryTask } from '../entities/order.entity';
import { Issue } from '../entities/issue.entity';
import { User } from '../entities/user.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ConsignmentsModule } from '../consignments/consignments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consignment, FurnitureItem, Order, DeliveryTask, Issue, User]),
    ConsignmentsModule,
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
