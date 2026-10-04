import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 估价师上门验真记录：结构、污渍、异味、虫蛀、板材变形、搬运难度逐项打分（1-5，5 最差/最难）
 */
@Entity('appraisals')
export class Appraisal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  consignmentId: string;

  @Column({ type: 'uuid' })
  appraiserId: string;

  @Column({ type: 'int' })
  structuralScore: number;

  @Column({ type: 'int' })
  stainScore: number;

  @Column({ type: 'int' })
  odorScore: number;

  @Column({ type: 'int' })
  mothScore: number;

  @Column({ type: 'int' })
  warpScore: number;

  /** 搬运难度 1-5（综合楼层/电梯/体积/拆装） */
  @Column({ type: 'int' })
  moveDifficulty: number;

  /** 寄卖价（建议挂牌价） */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  consignmentPrice: string;

  /** 最低成交价（底价） */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  minDealPrice: string;

  /** 平台佣金比例，如 0.15 */
  @Column({ type: 'numeric', precision: 5, scale: 4, default: '0.1500' })
  commissionRate: string;

  /** 预估翻新成本 */
  @Column({ type: 'numeric', precision: 10, scale: 2, default: '0' })
  estimatedRefurbishCost: string;

  @Column({ default: '' })
  cleaningAdvice: string;

  @Column({ default: '' })
  refurbishSuggestions: string;

  /** 估价与卖家描述是否相符：MATCH / MINOR_DIFF / MISMATCH */
  @Index()
  @Column({ type: 'varchar', length: 16, default: 'MATCH' })
  matchResult: 'MATCH' | 'MINOR_DIFF' | 'MISMATCH';

  @Column({ default: '' })
  matchNote: string;

  @CreateDateColumn()
  createdAt: Date;
}
