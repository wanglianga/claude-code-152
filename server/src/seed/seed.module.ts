import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { FurnitureItem, PrepTask } from '../entities/item.entity';
import { Order, DeliveryTask } from '../entities/order.entity';
import { Issue, IssueEvent } from '../entities/issue.entity';
import { Settlement, SettlementLine } from '../entities/settlement.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Consignment,
      Appraisal,
      FurnitureItem,
      PrepTask,
      Order,
      DeliveryTask,
      Issue,
      IssueEvent,
      Settlement,
      SettlementLine,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
