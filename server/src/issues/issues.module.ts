import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue, IssueEvent } from '../entities/issue.entity';
import { Consignment } from '../entities/consignment.entity';
import { FurnitureItem } from '../entities/item.entity';
import { Order, DeliveryTask } from '../entities/order.entity';
import { Settlement } from '../entities/settlement.entity';
import { User } from '../entities/user.entity';
import { IssuesService } from './issues.service';
import { IssueResolutionService } from './issue-resolution.service';
import { IssuesController } from './issues.controller';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Issue,
      IssueEvent,
      Consignment,
      FurnitureItem,
      Order,
      DeliveryTask,
      Settlement,
      User,
    ]),
    SettlementsModule,
  ],
  providers: [IssuesService, IssueResolutionService],
  controllers: [IssuesController],
  exports: [IssuesService],
})
export class IssuesModule {}
