import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Issue,
  IssueEvent,
  IssueType,
  IssueStatus,
  CompensationBearer,
} from '../entities/issue.entity';
import {
  Consignment,
  ConsignmentStatus,
} from '../entities/consignment.entity';
import { FurnitureItem, ItemStatus } from '../entities/item.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { DeliveryTask, DeliveryStatus } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { bizNo } from '../common/constants';

export interface RaiseIssueInput {
  type: IssueType;
  consignmentId: number;
  itemId?: number;
  orderId?: number;
  deliveryTaskId?: number;
  raisedBy: User;
  description: string;
}

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue) private issues: Repository<Issue>,
    @InjectRepository(IssueEvent) private events: Repository<IssueEvent>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(DeliveryTask) private deliveryTasks: Repository<DeliveryTask>,
  ) {}

  /** 各角色围绕同一件家具发起异常工单，并做即时联动（冻结商品/订单等） */
  async raise(input: RaiseIssueInput): Promise<Issue> {
    const issue = await this.issues.save(
      this.issues.create({
        issueNo: bizNo('IS'),
        type: input.type,
        status: IssueStatus.OPEN,
        consignmentId: input.consignmentId,
        itemId: input.itemId ?? null,
        orderId: input.orderId ?? null,
        deliveryTaskId: input.deliveryTaskId ?? null,
        raisedById: input.raisedBy.id,
        raisedByRole: input.raisedBy.role,
        description: input.description,
      }),
    );
    await this.addEvent(
      issue.id,
      input.raisedBy,
      `发起工单【${input.description.slice(0, 50)}】`,
    );

    // 即时联动：冻结相关商品/订单，等待客服处置
    if (input.itemId) {
      const item = await this.items.findOne({ where: { id: input.itemId } });
      if (item) {
        if (
          (input.type === IssueType.SELLER_REGRET ||
            input.type === IssueType.APPRAISAL_MISMATCH) &&
          item.status === ItemStatus.LISTED
        ) {
          item.status = ItemStatus.OFF_SHELF;
          await this.items.save(item);
          await this.addEvent(issue.id, input.raisedBy, '系统：商品已临时下架冻结');
        }
      }
    }
    return issue;
  }

  async addEvent(issueId: number, actor: User, content: string) {
    await this.events.save(
      this.events.create({
        issueId,
        actorName: actor?.name ?? '系统',
        actorRole: actor?.role ?? 'system',
        content,
      }),
    );
  }

  async findAll(status?: IssueStatus, type?: IssueType) {
    const qb = this.issues
      .createQueryBuilder('i')
      .leftJoinAndMapOne('i.raisedByUser', User, 'u', 'u.id = i.raisedById')
      .orderBy('i.createdAt', 'DESC');
    if (status) qb.andWhere('i.status = :status', { status });
    if (type) qb.andWhere('i.type = :type', { type });
    return qb.getMany();
  }

  async findOne(id: number) {
    const issue = await this.issues.findOne({ where: { id } });
    if (!issue) throw new NotFoundException('工单不存在');
    const events = await this.events.find({
      where: { issueId: id },
      order: { createdAt: 'ASC' },
    });
    const consignment = await this.consignments.findOne({
      where: { id: issue.consignmentId },
    });
    const item = issue.itemId
      ? await this.items.findOne({ where: { id: issue.itemId } })
      : null;
    const order = issue.orderId
      ? await this.orders.findOne({ where: { id: issue.orderId } })
      : null;
    return { ...issue, events, consignment, item, order };
  }

  async claim(id: number, handler: User) {
    const issue = await this.issues.findOne({ where: { id } });
    if (!issue) throw new NotFoundException('工单不存在');
    issue.handlerId = handler.id;
    issue.status = IssueStatus.PROCESSING;
    await this.issues.save(issue);
    await this.addEvent(id, handler, `客服 ${handler.name} 接手处理`);
    return issue;
  }

  async progress(id: number, actor: User, note: string) {
    const issue = await this.issues.findOne({ where: { id } });
    if (!issue) throw new NotFoundException('工单不存在');
    await this.addEvent(id, actor, note);
    return { ok: true };
  }

  /** 标记工单已解决（仅更新状态与赔付，业务联动由调用方处理） */
  async markResolved(
    id: number,
    handler: User,
    resolution: string,
    action: string,
    compensationAmount: number,
    compensationBearer: CompensationBearer,
  ) {
    const issue = await this.issues.findOne({ where: { id } });
    if (!issue) throw new NotFoundException('工单不存在');
    if (issue.status === IssueStatus.RESOLVED || issue.status === IssueStatus.CLOSED) {
      throw new BadRequestException('工单已处理完毕');
    }
    issue.status = IssueStatus.RESOLVED;
    issue.handlerId = handler.id;
    issue.resolution = resolution;
    issue.resolutionAction = action;
    issue.compensationAmount = compensationAmount || 0;
    issue.compensationBearer = compensationBearer;
    await this.issues.save(issue);
    await this.addEvent(
      id,
      handler,
      `工单结案：${resolution}（动作=${action}，赔付=${compensationAmount || 0}元/${compensationBearer}）`,
    );
    return issue;
  }

  /** 供结算使用：查询某商品/订单已解决工单的赔付 */
  async resolvedCompensations(itemId: number, orderId: number) {
    const list = await this.issues.find({
      where: { itemId, status: IssueStatus.RESOLVED },
    });
    return list.filter(
      (i) =>
        i.compensationAmount > 0 &&
        (!orderId || !i.orderId || i.orderId === orderId),
    );
  }
}
