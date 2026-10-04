import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settlement, SettlementLine } from '../entities/settlement.entity';
import { Order } from '../entities/order.entity';
import { FurnitureItem } from '../entities/item.entity';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { Issue } from '../entities/issue.entity';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Settlement,
      SettlementLine,
      Order,
      FurnitureItem,
      Consignment,
      Appraisal,
      Issue,
    ]),
  ],
  providers: [SettlementsService],
  controllers: [SettlementsController],
  exports: [SettlementsService],
})
export class SettlementsModule {}
