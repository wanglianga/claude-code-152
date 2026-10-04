import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum IssueType {
  SELLER_REGRET = 'seller_regret', // 卖家临时反悔
  APPRAISAL_MISMATCH = 'appraisal_mismatch', // 估价与实物不符
  REFURBISHMENT_OVERRUN = 'refurbishment_overrun', // 翻新成本超预期
  COLOR_DIFFERENCE = 'color_difference', // 买家认为色差明显
  ELEVATOR_UNFIT = 'elevator_unfit', // 进不了电梯
  DELIVERY_DAMAGE = 'delivery_damage', // 配送途中磕碰
  RETURN_REQUEST = 'return_request', // 售后退货
  OTHER = 'other',
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  [IssueType.SELLER_REGRET]: '卖家临时反悔',
  [IssueType.APPRAISAL_MISMATCH]: '估价与实物不符',
  [IssueType.REFURBISHMENT_OVERRUN]: '翻新成本超预期',
  [IssueType.COLOR_DIFFERENCE]: '色差争议',
  [IssueType.ELEVATOR_UNFIT]: '无法进电梯',
  [IssueType.DELIVERY_DAMAGE]: '配送磕碰',
  [IssueType.RETURN_REQUEST]: '售后退货',
  [IssueType.OTHER]: '其他',
};

export enum IssueStatus {
  OPEN = 'open',
  PROCESSING = 'processing',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  [IssueStatus.OPEN]: '待处理',
  [IssueStatus.PROCESSING]: '处理中',
  [IssueStatus.RESOLVED]: '已解决',
  [IssueStatus.CLOSED]: '已关闭',
};

export enum CompensationBearer {
  PLATFORM = 'platform',
  SELLER = 'seller',
  NONE = 'none',
}

export const BEARER_LABELS: Record<CompensationBearer, string> = {
  [CompensationBearer.PLATFORM]: '平台承担',
  [CompensationBearer.SELLER]: '卖家承担',
  [CompensationBearer.NONE]: '无赔付',
};

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  issueNo: string;

  @Column({ type: 'varchar' })
  type: IssueType;

  @Column({ type: 'varchar', default: IssueStatus.OPEN })
  status: IssueStatus;

  // 关联对象：围绕同一件家具协同
  @Column()
  consignmentId: number;

  @Column({ nullable: true })
  itemId: number;

  @Column({ nullable: true })
  orderId: number;

  @Column({ nullable: true })
  deliveryTaskId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'raisedById' })
  raisedBy: User;

  @Column()
  raisedById: number;

  @Column({ type: 'varchar' })
  raisedByRole: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ type: 'varchar', nullable: true })
  resolutionAction: string; // 具体处置动作

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  compensationAmount: number; // 售后赔付金额

  @Column({ type: 'varchar', default: CompensationBearer.NONE })
  compensationBearer: CompensationBearer;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'handlerId' })
  handler: User;

  @Column({ nullable: true })
  handlerId: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('issue_events')
export class IssueEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue)
  @JoinColumn({ name: 'issueId' })
  issue: Issue;

  @Column()
  issueId: number;

  @Column()
  actorName: string;

  @Column({ type: 'varchar' })
  actorRole: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
