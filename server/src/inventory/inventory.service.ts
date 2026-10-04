import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FurnitureItem,
  ItemStatus,
  PrepTask,
  PrepTaskStatus,
  PrepTaskType,
} from '../entities/item.entity';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { IssueType } from '../entities/issue.entity';
import { User } from '../entities/user.entity';
import { IssuesService } from '../issues/issues.service';
import { OVERRUN_THRESHOLD } from '../common/constants';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(PrepTask) private prepTasks: Repository<PrepTask>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(Appraisal) private appraisals: Repository<Appraisal>,
    @InjectRepository(User) private users: Repository<User>,
    private issuesService: IssuesService,
  ) {}

  async listItems(status?: ItemStatus) {
    const where = status ? { status } : {};
    const list = await this.items.find({ where, order: { createdAt: 'DESC' } });
    return Promise.all(list.map((i) => this.withDetail(i)));
  }

  async getItem(id: number) {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new NotFoundException('家具不存在');
    return this.withDetail(item);
  }

  private async withDetail(item: FurnitureItem) {
    const consignment = await this.consignments.findOne({
      where: { id: item.consignmentId },
    });
    const appraisal = await this.appraisals.findOne({
      where: { consignmentId: item.consignmentId },
    });
    const tasks = await this.prepTasks.find({
      where: { itemId: item.id },
      order: { id: 'ASC' },
    });
    return { ...item, consignment, appraisal, prepTasks: tasks };
  }

  async listTasks(status?: PrepTaskStatus) {
    const qb = this.prepTasks
      .createQueryBuilder('t')
      .leftJoinAndMapOne('t.item', FurnitureItem, 'i', 'i.id = t.itemId')
      .orderBy('t.createdAt', 'DESC');
    if (status) qb.where('t.status = :status', { status });
    const tasks = await qb.getMany();
    // 补充寄卖信息
    return Promise.all(
      tasks.map(async (t) => {
        const item = await this.items.findOne({ where: { id: t.itemId } });
        const consignment = item
          ? await this.consignments.findOne({ where: { id: item.consignmentId } })
          : null;
        return { ...t, item, consignment };
      }),
    );
  }

  async claimTask(taskId: number, user: User) {
    const task = await this.prepTasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    task.assigneeId = user.id;
    task.status = PrepTaskStatus.IN_PROGRESS;
    return this.prepTasks.save(task);
  }

  /** 完成备货任务；翻新成本超预估 120% 时自动生成预警工单 */
  async completeTask(
    taskId: number,
    user: User,
    cost: number,
    notes?: string,
  ) {
    const task = await this.prepTasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status === PrepTaskStatus.DONE) {
      throw new BadRequestException('任务已完成');
    }
    task.status = PrepTaskStatus.DONE;
    task.assigneeId = user.id;
    task.cost = Number(cost || 0);
    task.notes = notes;
    await this.prepTasks.save(task);

    const item = await this.items.findOne({ where: { id: task.itemId } });
    if (task.type === PrepTaskType.CLEANING) item.cleaningDone = true;
    if (task.type === PrepTaskType.REPAINTING) item.repaintingDone = true;
    if (task.type === PrepTaskType.PHOTOGRAPHY) item.photographyDone = true;

    // 汇总实际翻新成本
    const allTasks = await this.prepTasks.find({ where: { itemId: item.id } });
    item.actualRefurbishmentCost = allTasks
      .filter((t) => t.type !== PrepTaskType.PHOTOGRAPHY)
      .reduce((s, t) => s + Number(t.cost || 0), 0);
    await this.items.save(item);

    // 翻新成本超预期 → 自动预警工单
    const appraisal = await this.appraisals.findOne({
      where: { consignmentId: item.consignmentId },
    });
    const estimated = Number(appraisal?.estimatedRefurbishmentCost || 0);
    if (
      task.type === PrepTaskType.REPAINTING &&
      estimated > 0 &&
      item.actualRefurbishmentCost > estimated * OVERRUN_THRESHOLD
    ) {
      const fullUser = await this.users.findOne({ where: { id: user.id } });
      await this.issuesService.raise({
        type: IssueType.REFURBISHMENT_OVERRUN,
        consignmentId: item.consignmentId,
        itemId: item.id,
        raisedBy: fullUser,
        description: `翻新实际成本 ${item.actualRefurbishmentCost} 元，超出预估 ${estimated} 元的 ${Math.round(OVERRUN_THRESHOLD * 100)}%`,
      });
    }
    return this.getItem(item.id);
  }

  /** 上架：填写描述、定价、可配送范围 */
  async list(
    itemId: number,
    data: {
      listingTitle: string;
      listingDescription: string;
      listPrice: number;
      photos: string[];
      deliveryZones: string[];
    },
  ) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('家具不存在');
    if (![ItemStatus.PREPARING, ItemStatus.OFF_SHELF].includes(item.status)) {
      throw new BadRequestException('当前状态不可上架');
    }
    if (!item.cleaningDone || !item.photographyDone) {
      throw new BadRequestException('清洁与拍照任务完成后才能上架');
    }
    const appraisal = await this.appraisals.findOne({
      where: { consignmentId: item.consignmentId },
    });
    if (appraisal && Number(data.listPrice) < Number(appraisal.minPrice)) {
      throw new BadRequestException(
        `上架价不能低于最低成交价 ${appraisal.minPrice} 元`,
      );
    }
    item.listingTitle = data.listingTitle;
    item.listingDescription = data.listingDescription;
    item.listPrice = data.listPrice;
    item.photos = data.photos || [];
    item.deliveryZones = data.deliveryZones || [];
    item.status = ItemStatus.LISTED;
    item.listedAt = new Date();
    return this.items.save(item);
  }

  async offShelf(itemId: number) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('家具不存在');
    if (item.status !== ItemStatus.LISTED) {
      throw new BadRequestException('仅在售商品可下架');
    }
    item.status = ItemStatus.OFF_SHELF;
    return this.items.save(item);
  }

  async updateLocation(itemId: number, warehouseLocation: string) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('家具不存在');
    item.warehouseLocation = warehouseLocation;
    return this.items.save(item);
  }

  /** 仓库/翻新师发现实物与估价描述不符 → 工单 */
  async reportMismatch(itemId: number, user: User, description: string) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('家具不存在');
    const fullUser = await this.users.findOne({ where: { id: user.id } });
    return this.issuesService.raise({
      type: IssueType.APPRAISAL_MISMATCH,
      consignmentId: item.consignmentId,
      itemId: item.id,
      raisedBy: fullUser,
      description,
    });
  }
}
