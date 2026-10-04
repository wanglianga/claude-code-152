import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Consignment,
  FurnitureCategory,
  CATEGORY_LABELS,
} from '../entities/consignment.entity';
import { FurnitureItem, ItemStatus } from '../entities/item.entity';
import { Order, OrderStatus, DeliveryTask, DeliveryStatus } from '../entities/order.entity';
import { Issue, IssueType } from '../entities/issue.entity';
import { User, UserRole } from '../entities/user.entity';
import { ConsignmentsService } from '../consignments/consignments.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(DeliveryTask) private deliveryTasks: Repository<DeliveryTask>,
    @InjectRepository(Issue) private issues: Repository<Issue>,
    @InjectRepository(User) private users: Repository<User>,
    private consignmentsService: ConsignmentsService,
  ) {}

  /**
   * 按品类沉淀：成交周期、翻新投入、退货率、配送失败率，
   * 并给出「入仓寄卖 / 同城自提」运营建议。
   */
  async categoryStats() {
    const consignments = await this.consignments.find();
    const items = await this.items.find();
    const orders = await this.orders.find();
    const deliveries = await this.deliveryTasks.find();
    const issues = await this.issues.find();

    const result = [];
    for (const cat of Object.values(FurnitureCategory)) {
      const catConsignments = consignments.filter((c) => c.category === cat);
      const catIds = new Set(catConsignments.map((c) => c.id));
      const catItems = items.filter((i) => catIds.has(i.consignmentId));
      const catItemIds = new Set(catItems.map((i) => i.id));
      const catOrders = orders.filter((o) => catItemIds.has(o.itemId));
      const catOrderIds = new Set(catOrders.map((o) => o.id));
      const catDeliveries = deliveries.filter((d) => catOrderIds.has(d.orderId));
      const catIssues = issues.filter((i) => catIds.has(i.consignmentId));

      // 成交周期：上架 → 下单 的平均天数（仅统计实际履约的订单）
      const fulfilledOrders = catOrders.filter((o) =>
        [OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.DELIVERING, OrderStatus.SCHEDULED].includes(o.status),
      );
      const soldItems = catItems.filter(
        (i) => i.listedAt && fulfilledOrders.some((o) => o.itemId === i.id),
      );
      const cycles = soldItems.map((i) => {
        const order = fulfilledOrders.find((o) => o.itemId === i.id);
        return (
          (new Date(order.createdAt).getTime() - new Date(i.listedAt).getTime()) /
          (1000 * 60 * 60 * 24)
        );
      });
      const avgCycleDays = cycles.length
        ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10
        : null;

      // 平均翻新投入
      const refurbCosts = catItems
        .map((i) => Number(i.actualRefurbishmentCost || 0))
        .filter((c) => c > 0);
      const avgRefurbishmentCost = refurbCosts.length
        ? Math.round(refurbCosts.reduce((a, b) => a + b, 0) / refurbCosts.length)
        : 0;

      // 退货率：退货退款订单 / 全部订单
      const refunded = catOrders.filter(
        (o) => o.status === OrderStatus.REFUNDED,
      ).length;
      const returnRate = catOrders.length
        ? Math.round((refunded / catOrders.length) * 1000) / 10
        : 0;

      // 配送失败率
      const failedDeliveries = catDeliveries.filter(
        (d) => d.status === DeliveryStatus.FAILED,
      ).length;
      const deliveryFailureRate = catDeliveries.length
        ? Math.round((failedDeliveries / catDeliveries.length) * 1000) / 10
        : 0;

      // 退货原因分布
      const returnReasons = catIssues
        .filter((i) =>
          [
            IssueType.RETURN_REQUEST,
            IssueType.COLOR_DIFFERENCE,
            IssueType.DELIVERY_DAMAGE,
          ].includes(i.type),
        )
        .map((i) => i.type);

      // 运营建议：周转快、退货低、配送稳 → 适合入仓；否则建议同城自提
      let recommendation = '数据不足，持续观察';
      if (catOrders.length > 0 || soldItems.length > 0) {
        const cycleOk = avgCycleDays === null || avgCycleDays <= 30;
        const returnOk = returnRate < 15;
        const deliveryOk = deliveryFailureRate < 20;
        recommendation =
          cycleOk && returnOk && deliveryOk
            ? '适合入仓寄卖'
            : '建议同城自提（卖家家中存放）';
      }

      result.push({
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat],
        consignmentCount: catConsignments.length,
        listedCount: catItems.filter((i) => i.status === ItemStatus.LISTED).length,
        soldCount: catOrders.filter((o) =>
          [OrderStatus.COMPLETED, OrderStatus.DELIVERED].includes(o.status),
        ).length,
        orderCount: catOrders.length,
        avgCycleDays,
        avgRefurbishmentCost,
        returnRate,
        deliveryFailureRate,
        returnReasons,
        recommendation,
      });
    }
    return result;
  }

  /** 卖家风险列表：历史反悔/描述不符/售后争议 → 严格验真 */
  async sellerRiskList() {
    const sellers = await this.users.find({ where: { role: UserRole.SELLER } });
    const result = [];
    for (const seller of sellers) {
      const risk = await this.consignmentsService.sellerRisk(seller.id);
      const consignmentCount = await this.consignments.count({
        where: { sellerId: seller.id },
      });
      result.push({
        sellerId: seller.id,
        name: seller.name,
        username: seller.username,
        consignmentCount,
        ...risk,
      });
    }
    return result.sort((a, b) => b.score - a.score);
  }

  /** 运营总览 */
  async overview() {
    const [
      consignmentCount,
      listedCount,
      orderCount,
      openIssueCount,
      completedOrders,
    ] = await Promise.all([
      this.consignments.count(),
      this.items.count({ where: { status: ItemStatus.LISTED } }),
      this.orders.count(),
      this.issues.count({ where: { status: 'open' as any } }),
      this.orders.find({ where: { status: OrderStatus.COMPLETED } }),
    ]);
    const gmv = completedOrders.reduce((s, o) => s + Number(o.price), 0);
    return { consignmentCount, listedCount, orderCount, openIssueCount, gmv };
  }
}
