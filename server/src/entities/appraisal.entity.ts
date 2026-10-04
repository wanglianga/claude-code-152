import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Consignment } from './consignment.entity';
import { User } from './user.entity';

export enum ConditionLevel {
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export const CONDITION_LABELS: Record<ConditionLevel, string> = {
  [ConditionLevel.GOOD]: '良好',
  [ConditionLevel.FAIR]: '一般',
  [ConditionLevel.POOR]: '较差',
};

export enum MovingDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export const MOVING_LABELS: Record<MovingDifficulty, string> = {
  [MovingDifficulty.EASY]: '容易',
  [MovingDifficulty.MEDIUM]: '中等',
  [MovingDifficulty.HARD]: '困难',
};

@Entity('appraisals')
export class Appraisal {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Consignment)
  @JoinColumn({ name: 'consignmentId' })
  consignment: Consignment;

  @Column({ unique: true })
  consignmentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'appraiserId' })
  appraiser: User;

  @Column()
  appraiserId: number;

  // 上门检查项
  @Column({ type: 'varchar' })
  structureCondition: ConditionLevel; // 结构

  @Column({ type: 'varchar' })
  stainLevel: ConditionLevel; // 污渍

  @Column({ type: 'varchar' })
  odorLevel: ConditionLevel; // 异味

  @Column()
  insectDamage: boolean; // 虫蛀

  @Column()
  boardDeformation: boolean; // 板材变形

  @Column({ type: 'varchar' })
  movingDifficulty: MovingDifficulty; // 搬运难度

  // 估价结论
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  consignmentPrice: number; // 寄卖价

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  minPrice: number; // 最低成交价

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.15 })
  commissionRate: number; // 平台佣金比例

  @Column({ type: 'text', nullable: true })
  refurbishmentSuggestion: string; // 清洁翻新建议

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  estimatedRefurbishmentCost: number; // 预估翻新成本

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: false })
  strictCheckPerformed: boolean; // 是否执行了严格验真

  @CreateDateColumn()
  createdAt: Date;
}
