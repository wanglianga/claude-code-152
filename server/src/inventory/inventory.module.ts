import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FurnitureItem, PrepTask } from '../entities/item.entity';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { User } from '../entities/user.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FurnitureItem,
      PrepTask,
      Consignment,
      Appraisal,
      User,
    ]),
    IssuesModule,
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
