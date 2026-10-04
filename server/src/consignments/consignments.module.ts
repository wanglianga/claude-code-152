import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { FurnitureItem, PrepTask } from '../entities/item.entity';
import { Issue } from '../entities/issue.entity';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { ConsignmentsService } from './consignments.service';
import { AppraisalsService } from './appraisals.service';
import {
  ConsignmentsController,
  AppraisalsController,
} from './consignments.controller';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consignment,
      Appraisal,
      FurnitureItem,
      PrepTask,
      Issue,
      Order,
      User,
    ]),
    IssuesModule,
  ],
  providers: [ConsignmentsService, AppraisalsService],
  controllers: [ConsignmentsController, AppraisalsController],
  exports: [ConsignmentsService],
})
export class ConsignmentsModule {}
