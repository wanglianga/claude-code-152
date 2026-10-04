import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 卖家风险画像：沉淀历史反悔、描述不符、售后争议。
 * 卖家再次寄卖时由系统引用，决定是否需要更严格的上门验真（STRICT）。
 */
@Entity('seller_profiles')
export class SellerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  sellerId: string;

  /** 历史反悔次数（已上架/已约估价后撤销） */
  @Column({ type: 'int', default: 0 })
  backtrackCount: number;

  /** 估价发现描述不符次数 */
  @Column({ type: 'int', default: 0 })
  mismatchCount: number;

  /** 售后争议工单数 */
  @Column({ type: 'int', default: 0 })
  disputeCount: number;

  /** 完成寄卖成交数 */
  @Column({ type: 'int', default: 0 })
  completedCount: number;

  /** 风险分：backtrack*3 + mismatch*2 + dispute*1 - completed*0.5，最低 0 */
  @Column({ type: 'numeric', precision: 6, scale: 2, default: '0' })
  riskScore: string;

  /** NORMAL / STRICT：风险分 >= 5 或近一次描述不符即严格验真 */
  @Column({ type: 'varchar', length: 16, default: 'NORMAL' })
  verificationLevel: 'NORMAL' | 'STRICT';

  @Column({ type: 'text', default: '' })
  riskNote: string;

  @CreateDateColumn()
  createdAt: Date;
}
