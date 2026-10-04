import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Issue,
  IssueType,
  CompensationBearer,
} from '../entities/issue.entity';
import {
  Consignment,
  ConsignmentStatus,
} from '../entities/consignment.entity';
import { FurnitureItem, ItemStatus } from '../entities/item.entity';
import {
  Order,
  OrderStatus,
  DeliveryTask,
  DeliveryStatus,
} from '../entities/order.entity';
import { Settlement } from '../entities/settlement.entity';
import { User } from '../entities/user.entity';
import { IssuesService } from './issues.service';
import { SettlementsService } from '../settlements/settlements.service';

export interface ResolveInput {
  resolution: string;
  action: string;
  compensationAmount?: number;
  compensationBearer?: CompensationBearer;
}

/**
 * 客服结案时的业务联动：让卖家、买家、仓库、翻新师、配送围绕同一件家具协同。
 */
@Injectable()
export class IssueResolutionService {
  constructor(
    @InjectRepository(Issue) private issues: Repository<Issue>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(DeliveryTask) private deliveryTasks: Repository<DeliveryTask>,
    @InjectRepository(Settlement) private settlements: Repository<Settlement>,
    private issuesService: IssuesService,
    private settlementsService: SettlementsService,
  ) {}

  async resolve(id: number, handler: User, input: ResolveInput) {
    const issue = await this.issues.findOne({ where: { id } });
    if (!issue) throw new NotFoundException('工单不存在');
    const bearer = input.compensationBearer ?? CompensationBearer.NONE;
    const amount = Number(input.compensationAmount || 0);
    if (amount > 0 && bearer === CompensationBearer.NONE) {
      throw new BadRequestException('有赔付金额时必须选择赔付承担方');
    }

    await this.applySideEffects(issue, input.action, handler);

    const resolved = await this.issuesService.markResolved(
      id,
      handler,
      input.resolution,
      input.action,
      amount,
      bearer,
    );

    // 若结算单已存在，追加赔付行
    if (amount > 0 && issue.orderId) {
      const settlement = await this.settlements.findOne({
        where: { orderId: issue.orderId },
      });
      if (settlement) {
        await this.settlementsService.appendCompensation(
          issue.orderId,
          resolved,
        );
      }
    }
    return resolved;
  }

  private async applySideEffects(issue: Issue, action: string, handler: User) {
    const note = (msg: string) =>
      this.issuesService.addEvent(issue.id, handler, `系统联动：${msg}`);

    const item = issue.itemId
      ? await this.items.findOne({ where: { id: issue.itemId } })
      : null;
    const order = issue.orderId
      ? await this.orders.findOne({ where: { id: issue.orderId } })
      : null;
    const consignment = await this.consignments.findOne({
      where: { id: issue.consignmentId },
    });

    switch (`${issue.type}:${action}`) {
      // ---------- 卖家临时反悔 ----------
      case `${IssueType.SELLER_REGRET}:confirm`: {
        if (order && [OrderStatus.PAID, OrderStatus.SCHEDULED, OrderStatus.DELIVERING].includes(order.status)) {
          order.status = OrderStatus.CANCELLED;
          await this.orders.save(order);
          await this.deliveryTasks.update(
            { orderId: order.id, status: DeliveryStatus.SCHEDULED },
            { status: DeliveryStatus.FAILED, failureReason: '卖家反悔，配送取消' },
          );
          await note(`订单 ${order.orderNo} 已取消，买家款项原路退回`);
        }
        if (item) {
          item.status = ItemStatus.RETURNED_TO_SELLER;
          await this.items.save(item);
        }
        consignment.status = ConsignmentStatus.CANCELLED;
        await this.consignments.save(consignment);
        await note('寄卖申请已取消，家具退回卖家');
        break;
      }
      case `${IssueType.SELLER_REGRET}:reject`: {
        if (item && item.status === ItemStatus.OFF_SHELF) {
          item.status = ItemStatus.LISTED;
          await this.items.save(item);
          await note('反悔不成立，商品恢复上架');
        }
        break;
      }

      // ---------- 估价与实物不符 ----------
      case `${IssueType.APPRAISAL_MISMATCH}:reappraise`: {
        consignment.status = ConsignmentStatus.PENDING_APPRAISAL;
        consignment.requiresStrictVerification = true;
        consignment.strictVerificationReason = '因估价与实物不符，重新估价需严格验真';
        await this.consignments.save(consignment);
        if (item && item.status === ItemStatus.LISTED) {
          item.status = ItemStatus.OFF_SHELF;
          await this.items.save(item);
        }
        await note('寄卖单已退回待估价队列，需重新上门严格验真');
        break;
      }
      case `${IssueType.APPRAISAL_MISMATCH}:off_shelf`: {
        if (item) {
          item.status = ItemStatus.OFF_SHELF;
          await this.items.save(item);
          await note('商品已下架');
        }
        break;
      }
      case `${IssueType.APPRAISAL_MISMATCH}:adjust_price`: {
        await note('维持寄卖，仓库可按新评估调整上架价');
        break;
      }

      // ---------- 翻新成本超预期 ----------
      case `${IssueType.REFURBISHMENT_OVERRUN}:seller_bears`:
      case `${IssueType.REFURBISHMENT_OVERRUN}:platform_bears`:
      case `${IssueType.REFURBISHMENT_OVERRUN}:share`: {
        await note('翻新超支承担方案已确认，将在结算中体现');
        break;
      }

      // ---------- 色差 / 磕碰 / 退货 ----------
      case `${IssueType.COLOR_DIFFERENCE}:compensate`:
      case `${IssueType.DELIVERY_DAMAGE}:compensate`: {
        if (order && order.status === OrderStatus.DELIVERED) {
          order.status = OrderStatus.COMPLETED;
          order.completedAt = new Date();
          await this.orders.save(order);
          if (item) {
            item.status = ItemStatus.COMPLETED;
            await this.items.save(item);
          }
          consignment.status = ConsignmentStatus.COMPLETED;
          await this.consignments.save(consignment);
          await this.settlementsService.generateForOrder(order.id);
          await note('赔付达成，订单完结并生成结算单');
        }
        break;
      }
      case `${IssueType.COLOR_DIFFERENCE}:approve_return`:
      case `${IssueType.DELIVERY_DAMAGE}:approve_return`:
      case `${IssueType.RETURN_REQUEST}:approve_return`: {
        if (order) {
          order.status = OrderStatus.REFUNDED;
          await this.orders.save(order);
          await note(`订单 ${order.orderNo} 已退货退款`);
        }
        if (item) {
          item.status = ItemStatus.LISTED; // 退回后重新上架
          await this.items.save(item);
          await note('家具已重新上架');
        }
        break;
      }
      case `${IssueType.DELIVERY_DAMAGE}:repair`: {
        if (item) {
          item.status = ItemStatus.PREPARING;
          item.repaintingDone = false;
          await this.items.save(item);
          await note('家具已退回仓库安排修复，修复后重新上架');
        }
        if (order) {
          order.status = OrderStatus.REFUNDED;
          await this.orders.save(order);
        }
        break;
      }
      case `${IssueType.COLOR_DIFFERENCE}:reject`:
      case `${IssueType.RETURN_REQUEST}:reject`: {
        if (order && order.status === OrderStatus.DELIVERED) {
          order.status = OrderStatus.COMPLETED;
          order.completedAt = new Date();
          await this.orders.save(order);
          if (item) {
            item.status = ItemStatus.COMPLETED;
            await this.items.save(item);
          }
          consignment.status = ConsignmentStatus.COMPLETED;
          await this.consignments.save(consignment);
          await this.settlementsService.generateForOrder(order.id);
          await note('诉求不成立，订单正常完结并生成结算单');
        }
        break;
      }

      // ---------- 进不了电梯 ----------
      case `${IssueType.ELEVATOR_UNFIT}:reschedule`: {
        if (order) {
          order.status = OrderStatus.PAID; // 回到待调度，重新安排大车/拆装
          await this.orders.save(order);
          await note('订单已退回待调度，需改用拆装方案或大型车辆重新预约');
        }
        break;
      }
      case `${IssueType.ELEVATOR_UNFIT}:cancel_order`: {
        if (order) {
          order.status = OrderStatus.CANCELLED;
          await this.orders.save(order);
          await note('订单已取消并退款');
        }
        if (item) {
          item.status = ItemStatus.LISTED;
          await this.items.save(item);
        }
        break;
      }

      default:
        // 其他类型/动作仅记录结案信息
        break;
    }
  }
}
