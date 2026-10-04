import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryTask,
  DeliveryStatus,
  Order,
  OrderStatus,
  VehicleType,
} from '../entities/order.entity';
import { FurnitureItem, ItemStatus } from '../entities/item.entity';
import { IssueType } from '../entities/issue.entity';
import { User } from '../entities/user.entity';
import { IssuesService } from '../issues/issues.service';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryTask) private deliveryTasks: Repository<DeliveryTask>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(User) private users: Repository<User>,
    private issuesService: IssuesService,
  ) {}

  /** 调度：为已支付订单创建配送任务（车辆、时间、人员） */
  async schedule(
    orderId: number,
    courierId: number,
    vehicleType: VehicleType,
    scheduledAt: Date,
    notes?: string,
  ) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('订单当前状态不可调度');
    }
    const task = await this.deliveryTasks.save(
      this.deliveryTasks.create({
        orderId,
        courierId,
        vehicleType: vehicleType || order.vehicleType,
        scheduledAt: scheduledAt || order.appointmentAt || new Date(),
        status: DeliveryStatus.SCHEDULED,
        notes,
      }),
    );
    order.status = OrderStatus.SCHEDULED;
    await this.orders.save(order);
    return task;
  }

  async listTasks(status?: DeliveryStatus, courierId?: number) {
    const qb = this.deliveryTasks
      .createQueryBuilder('t')
      .orderBy('t.scheduledAt', 'DESC');
    if (status) qb.andWhere('t.status = :status', { status });
    if (courierId) qb.andWhere('t.courierId = :courierId', { courierId });
    const tasks = await qb.getMany();
    return Promise.all(
      tasks.map(async (t) => {
        const order = await this.orders.findOne({ where: { id: t.orderId } });
        const item = order
          ? await this.items.findOne({ where: { id: order.itemId } })
          : null;
        const courier = t.courierId
          ? await this.users.findOne({ where: { id: t.courierId } })
          : null;
        return { ...t, order, item, courierName: courier?.name };
      }),
    );
  }

  async start(taskId: number, user: User) {
    const task = await this.deliveryTasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('配送任务不存在');
    if (task.status !== DeliveryStatus.SCHEDULED) {
      throw new BadRequestException('任务当前状态不可出发');
    }
    task.status = DeliveryStatus.EN_ROUTE;
    await this.deliveryTasks.save(task);
    await this.orders.update({ id: task.orderId }, { status: OrderStatus.DELIVERING });
    return task;
  }

  async complete(taskId: number, user: User, notes?: string) {
    const task = await this.deliveryTasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('配送任务不存在');
    if (![DeliveryStatus.SCHEDULED, DeliveryStatus.EN_ROUTE].includes(task.status)) {
      throw new BadRequestException('任务当前状态不可完成');
    }
    task.status = DeliveryStatus.DELIVERED;
    task.notes = notes ?? task.notes;
    await this.deliveryTasks.save(task);
    const order = await this.orders.findOne({ where: { id: task.orderId } });
    order.status = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();
    await this.orders.save(order);
    const item = await this.items.findOne({ where: { id: order.itemId } });
    if (item) {
      item.status = ItemStatus.SOLD;
      await this.items.save(item);
    }
    return task;
  }

  /** 配送失败（如沙发进不了电梯）→ 自动生成异常工单 */
  async fail(taskId: number, user: User, reason: string, issueType?: IssueType) {
    const task = await this.deliveryTasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('配送任务不存在');
    if (task.status === DeliveryStatus.DELIVERED) {
      throw new BadRequestException('已送达任务不能标记失败');
    }
    task.status = DeliveryStatus.FAILED;
    task.failureReason = reason;
    await this.deliveryTasks.save(task);

    const order = await this.orders.findOne({ where: { id: task.orderId } });
    order.status = OrderStatus.PAID; // 回到待调度
    await this.orders.save(order);
    const item = await this.items.findOne({ where: { id: order.itemId } });

    const fullUser = await this.users.findOne({ where: { id: user.id } });
    await this.issuesService.raise({
      type: issueType || IssueType.ELEVATOR_UNFIT,
      consignmentId: item.consignmentId,
      itemId: item.id,
      orderId: order.id,
      deliveryTaskId: task.id,
      raisedBy: fullUser,
      description: `配送失败：${reason}`,
    });
    return task;
  }
}
