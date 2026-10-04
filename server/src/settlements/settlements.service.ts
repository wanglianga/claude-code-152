import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Settlement,
  SettlementLine,
  SettlementLineType,
  SettlementStatus,
} from '../entities/settlement.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { FurnitureItem } from '../entities/item.entity';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { Issue, IssueStatus, CompensationBearer } from '../entities/issue.entity';
import { bizNo, calcStorageFee } from '../common/constants';

@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(Settlement) private settlements: Repository<Settlement>,
    @InjectRepository(SettlementLine) private lines: Repository<SettlementLine>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(Appraisal) private appraisals: Repository<Appraisal>,
    @InjectRepository(Issue) private issues: Repository<Issue>,
  ) {}

  /**
   * 订单完成时生成结算单。
   * 结算来源：成交价(订单)、佣金(估价单比例)、翻新费(备货实际成本)、
   * 仓储费(入仓天数×费率)、配送费(订单计费规则)、售后赔付(已结案工单)。
   */
  async generateForOrder(orderId: number): Promise<Settlement> {
    const existing = await this.settlements.findOne({ where: { orderId } });
    if (existing) return existing;

    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('订单未完成，不能结算');
    }
    const item = await this.items.findOne({ where: { id: order.itemId } });
    const consignment = await this.consignments.findOne({
      where: { id: item.consignmentId },
    });
    const appraisal = await this.appraisals.findOne({
      where: { consignmentId: consignment.id },
    });

    const transactionPrice = Number(order.price);
    const commissionRate = appraisal ? Number(appraisal.commissionRate) : 0.15;
    const commissionAmount =
      Math.round(transactionPrice * commissionRate * 100) / 100;
    const refurbishmentCost = Number(item.actualRefurbishmentCost || 0);
    const { days: storageDays, fee: storageFee } =
      item.locationType === 'warehouse'
        ? calcStorageFee(item.storageStartAt, order.createdAt)
        : { days: 0, fee: 0 };
    const deliveryFee = Number(order.deliveryFee || 0);

    // 已结案工单的售后赔付
    const compensatedIssues = await this.issues.find({
      where: { itemId: item.id, status: IssueStatus.RESOLVED },
    });
    const relevant = compensatedIssues.filter(
      (i) => i.compensationAmount > 0,
    );
    const sellerComp = relevant
      .filter((i) => i.compensationBearer === CompensationBearer.SELLER)
      .reduce((s, i) => s + Number(i.compensationAmount), 0);
    const platformComp = relevant
      .filter((i) => i.compensationBearer === CompensationBearer.PLATFORM)
      .reduce((s, i) => s + Number(i.compensationAmount), 0);
    const afterSalesCompensation = sellerComp + platformComp;

    const sellerPayout =
      Math.round(
        (transactionPrice -
          commissionAmount -
          refurbishmentCost -
          storageFee -
          sellerComp) *
          100,
      ) / 100;
    const platformRevenue =
      Math.round((commissionAmount - platformComp) * 100) / 100;

    const settlement = await this.settlements.save(
      this.settlements.create({
        settlementNo: bizNo('ST'),
        orderId: order.id,
        itemId: item.id,
        sellerId: consignment.sellerId,
        transactionPrice,
        commissionAmount,
        refurbishmentCost,
        storageFee,
        deliveryFee,
        afterSalesCompensation,
        sellerPayout,
        platformRevenue,
        status: SettlementStatus.PENDING,
      }),
    );

    const lineData: Partial<SettlementLine>[] = [
      {
        type: SettlementLineType.TRANSACTION_PRICE,
        amount: transactionPrice,
        direction: 'credit',
        bearer: 'buyer',
        description: `买家支付成交价（订单 ${order.orderNo}）`,
        sourceRef: order.orderNo,
      },
      {
        type: SettlementLineType.COMMISSION,
        amount: commissionAmount,
        direction: 'debit',
        bearer: 'seller',
        description: `平台佣金 = 成交价 × ${(commissionRate * 100).toFixed(1)}%（估价单约定）`,
        sourceRef: `AP-${appraisal?.id ?? '-'}`,
      },
    ];
    if (refurbishmentCost > 0) {
      lineData.push({
        type: SettlementLineType.REFURBISHMENT,
        amount: refurbishmentCost,
        direction: 'debit',
        bearer: 'seller',
        description: `翻新费 = 备货任务实际成本合计（清洁/补漆/拍照）`,
        sourceRef: item.itemNo,
      });
    }
    if (storageFee > 0) {
      lineData.push({
        type: SettlementLineType.STORAGE,
        amount: storageFee,
        direction: 'debit',
        bearer: 'seller',
        description: `仓储费 = ${storageDays} 天 × 3 元/天（入仓寄卖）`,
        sourceRef: item.itemNo,
      });
    }
    lineData.push({
      type: SettlementLineType.DELIVERY,
      amount: deliveryFee,
      direction: 'credit',
      bearer: 'delivery',
      description: `配送费（买家另行支付，平台代收转付配送方）`,
      sourceRef: order.orderNo,
    });
    for (const issue of relevant) {
      lineData.push({
        type: SettlementLineType.AFTERSALES_COMPENSATION,
        amount: Number(issue.compensationAmount),
        direction: 'debit',
        bearer: issue.compensationBearer,
        description: `售后赔付（工单 ${issue.issueNo}：${issue.resolution ?? ''}）`,
        sourceRef: issue.issueNo,
      });
    }
    await this.lines.save(
      lineData.map((l) => this.lines.create({ ...l, settlementId: settlement.id })),
    );
    return settlement;
  }

  /** 结算单已生成后又产生赔付（如售后结案晚于结算）→ 追加赔付行并重算 */
  async appendCompensation(orderId: number, issue: Issue) {
    const settlement = await this.settlements.findOne({ where: { orderId } });
    if (!settlement) return null;
    await this.lines.save(
      this.lines.create({
        settlementId: settlement.id,
        type: SettlementLineType.AFTERSALES_COMPENSATION,
        amount: Number(issue.compensationAmount),
        direction: 'debit',
        bearer: issue.compensationBearer,
        description: `售后赔付（工单 ${issue.issueNo}：${issue.resolution ?? ''}）`,
        sourceRef: issue.issueNo,
      }),
    );
    settlement.afterSalesCompensation =
      Number(settlement.afterSalesCompensation) + Number(issue.compensationAmount);
    if (issue.compensationBearer === CompensationBearer.SELLER) {
      settlement.sellerPayout =
        Number(settlement.sellerPayout) - Number(issue.compensationAmount);
    } else if (issue.compensationBearer === CompensationBearer.PLATFORM) {
      settlement.platformRevenue =
        Number(settlement.platformRevenue) - Number(issue.compensationAmount);
    }
    return this.settlements.save(settlement);
  }

  async findAll(status?: SettlementStatus) {
    const qb = this.settlements
      .createQueryBuilder('s')
      .orderBy('s.createdAt', 'DESC');
    if (status) qb.where('s.status = :status', { status });
    return qb.getMany();
  }

  async findMine(sellerId: number) {
    return this.settlements.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const settlement = await this.settlements.findOne({ where: { id } });
    if (!settlement) throw new NotFoundException('结算单不存在');
    const lines = await this.lines.find({
      where: { settlementId: id },
      order: { id: 'ASC' },
    });
    const order = await this.orders.findOne({
      where: { id: settlement.orderId },
    });
    const item = await this.items.findOne({
      where: { id: settlement.itemId },
    });
    return { ...settlement, lines, order, item };
  }

  async finalize(id: number) {
    const settlement = await this.settlements.findOne({ where: { id } });
    if (!settlement) throw new NotFoundException('结算单不存在');
    settlement.status = SettlementStatus.FINALIZED;
    return this.settlements.save(settlement);
  }
}
