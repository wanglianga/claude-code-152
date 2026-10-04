import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum SettlementLineType {
  TRANSACTION_PRICE = 'transaction_price', // 成交价
  COMMISSION = 'commission', // 平台佣金
  REFURBISHMENT = 'refurbishment', // 翻新费
  STORAGE = 'storage', // 仓储费
  DELIVERY = 'delivery', // 配送费
  AFTERSALES_COMPENSATION = 'aftersales_compensation', // 售后赔付
  ADJUSTMENT = 'adjustment', // 其他调整
}

export const SETTLEMENT_LINE_LABELS: Record<SettlementLineType, string> = {
  [SettlementLineType.TRANSACTION_PRICE]: '成交价',
  [SettlementLineType.COMMISSION]: '平台佣金',
  [SettlementLineType.REFURBISHMENT]: '翻新费',
  [SettlementLineType.STORAGE]: '仓储费',
  [SettlementLineType.DELIVERY]: '配送费',
  [SettlementLineType.AFTERSALES_COMPENSATION]: '售后赔付',
  [SettlementLineType.ADJUSTMENT]: '调整项',
};

export enum SettlementStatus {
  PENDING = 'pending',
  FINALIZED = 'finalized',
}

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  [SettlementStatus.PENDING]: '待结算',
  [SettlementStatus.FINALIZED]: '已结算',
};

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  settlementNo: string;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ unique: true })
  orderId: number;

  @Column()
  itemId: number;

  @Column()
  sellerId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  transactionPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  refurbishmentCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  storageFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  afterSalesCompensation: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  sellerPayout: number; // 卖家实收

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformRevenue: number; // 平台净收入

  @Column({ type: 'varchar', default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('settlement_lines')
export class SettlementLine {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Settlement)
  @JoinColumn({ name: 'settlementId' })
  settlement: Settlement;

  @Column()
  settlementId: number;

  @Column({ type: 'varchar' })
  type: SettlementLineType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  // 资金流向说明：credit=收入方视角金额来源，debit=扣减
  @Column({ type: 'varchar' })
  direction: 'credit' | 'debit';

  @Column({ type: 'varchar', default: 'platform' })
  bearer: string; // platform / seller / buyer / delivery

  @Column({ type: 'text' })
  description: string; // 费用来源说明

  @Column({ nullable: true })
  sourceRef: string; // 来源单据号

  @CreateDateColumn()
  createdAt: Date;
}
