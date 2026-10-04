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
import { Consignment } from './consignment.entity';
import { User } from './user.entity';

export enum LocationType {
  WAREHOUSE = 'warehouse',
  SELLER_HOME = 'seller_home',
}

export const LOCATION_LABELS: Record<LocationType, string> = {
  [LocationType.WAREHOUSE]: '平台仓库',
  [LocationType.SELLER_HOME]: '卖家家中',
};

export enum ItemStatus {
  PREPARING = 'preparing', // 备货中（清洁/补漆/拍照）
  LISTED = 'listed', // 已上架
  RESERVED = 'reserved', // 已被下单锁定
  SOLD = 'sold', // 已送达待完结
  COMPLETED = 'completed', // 已完结
  OFF_SHELF = 'off_shelf', // 已下架
  RETURNED_TO_SELLER = 'returned_to_seller', // 已退回卖家
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.PREPARING]: '备货中',
  [ItemStatus.LISTED]: '在售',
  [ItemStatus.RESERVED]: '已锁定',
  [ItemStatus.SOLD]: '已售出',
  [ItemStatus.COMPLETED]: '已完结',
  [ItemStatus.OFF_SHELF]: '已下架',
  [ItemStatus.RETURNED_TO_SELLER]: '已退回卖家',
};

@Entity('items')
export class FurnitureItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  itemNo: string;

  @OneToOne(() => Consignment)
  @JoinColumn({ name: 'consignmentId' })
  consignment: Consignment;

  @Column({ unique: true })
  consignmentId: number;

  @Column({ type: 'varchar' })
  locationType: LocationType;

  @Column({ nullable: true })
  warehouseLocation: string; // 库位，如 A-01-03

  @Column({ type: 'timestamptz', nullable: true })
  storageStartAt: Date; // 入仓时间（仓储费起算）

  // 备货进度
  @Column({ default: false })
  cleaningDone: boolean;

  @Column({ default: false })
  repaintingDone: boolean;

  @Column({ default: false })
  photographyDone: boolean;

  // 上架信息
  @Column({ nullable: true })
  listingTitle: string;

  @Column({ type: 'text', nullable: true })
  listingDescription: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  listPrice: number;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  deliveryZones: string[]; // 可配送范围

  @Column({ type: 'varchar', default: ItemStatus.PREPARING })
  status: ItemStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  actualRefurbishmentCost: number; // 实际翻新投入

  @Column({ type: 'timestamptz', nullable: true })
  listedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum PrepTaskType {
  CLEANING = 'cleaning',
  REPAINTING = 'repainting',
  PHOTOGRAPHY = 'photography',
}

export const PREP_TASK_LABELS: Record<PrepTaskType, string> = {
  [PrepTaskType.CLEANING]: '清洁',
  [PrepTaskType.REPAINTING]: '补漆翻新',
  [PrepTaskType.PHOTOGRAPHY]: '拍照',
};

export enum PrepTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

@Entity('prep_tasks')
export class PrepTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FurnitureItem)
  @JoinColumn({ name: 'itemId' })
  item: FurnitureItem;

  @Column()
  itemId: number;

  @Column({ type: 'varchar' })
  type: PrepTaskType;

  @Column({ type: 'varchar', default: PrepTaskStatus.PENDING })
  status: PrepTaskStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @Column({ nullable: true })
  assigneeId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number; // 实际成本

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
