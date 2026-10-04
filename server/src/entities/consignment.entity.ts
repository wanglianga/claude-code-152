import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum FurnitureCategory {
  SOFA = 'sofa',
  DINING_TABLE = 'dining_table',
  KIDS_BED = 'kids_bed',
  BOOKSHELF = 'bookshelf',
  OFFICE_CHAIR = 'office_chair',
  APPLIANCE_CABINET = 'appliance_cabinet',
}

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  [FurnitureCategory.SOFA]: '沙发',
  [FurnitureCategory.DINING_TABLE]: '餐桌',
  [FurnitureCategory.KIDS_BED]: '儿童床',
  [FurnitureCategory.BOOKSHELF]: '书柜',
  [FurnitureCategory.OFFICE_CHAIR]: '办公椅',
  [FurnitureCategory.APPLIANCE_CABINET]: '家电柜',
};

export enum ConsignmentStatus {
  PENDING_APPRAISAL = 'pending_appraisal', // 待估价
  SCHEDULED = 'scheduled', // 已预约上门
  APPRAISED = 'appraised', // 已估价待卖家确认
  ACCEPTED = 'accepted', // 卖家已接受，进入备货
  REJECTED_BY_SELLER = 'rejected_by_seller', // 卖家不接受估价
  CANCELLED = 'cancelled', // 已取消（反悔成立等）
  COMPLETED = 'completed', // 已售出并完结
}

export const CONSIGNMENT_STATUS_LABELS: Record<ConsignmentStatus, string> = {
  [ConsignmentStatus.PENDING_APPRAISAL]: '待估价',
  [ConsignmentStatus.SCHEDULED]: '已预约上门',
  [ConsignmentStatus.APPRAISED]: '待卖家确认估价',
  [ConsignmentStatus.ACCEPTED]: '已接受·备货中',
  [ConsignmentStatus.REJECTED_BY_SELLER]: '卖家未接受估价',
  [ConsignmentStatus.CANCELLED]: '已取消',
  [ConsignmentStatus.COMPLETED]: '已完结',
};

@Entity('consignments')
export class Consignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  applicationNo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  sellerId: number;

  @Column({ type: 'varchar' })
  category: FurnitureCategory;

  @Column()
  brand: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lengthCm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  widthCm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  heightCm: number;

  @Column()
  material: string;

  @Column({ type: 'int' })
  yearsUsed: number;

  @Column({ type: 'text', array: true, default: '{}' })
  defectPhotos: string[];

  @Column({ type: 'text', nullable: true })
  defectDescription: string;

  @Column()
  disassemblable: boolean; // 是否可拆装

  @Column({ type: 'int' })
  floor: number; // 所在楼层

  @Column()
  hasElevator: boolean; // 电梯条件

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  expectedPrice: number; // 期望售价

  @Column()
  acceptsRefurbishment: boolean; // 是否接受翻新

  @Column()
  address: string;

  @Column()
  contactPhone: string;

  @Column({ type: 'varchar', default: ConsignmentStatus.PENDING_APPRAISAL })
  status: ConsignmentStatus;

  // 卖家历史风险触发：是否需要更严格的上门验真
  @Column({ default: false })
  requiresStrictVerification: boolean;

  @Column({ type: 'text', nullable: true })
  strictVerificationReason: string;

  @Column({ type: 'timestamptz', nullable: true })
  appointmentAt: Date; // 上门估价预约时间

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
