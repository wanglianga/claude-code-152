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
import { FurnitureItem } from './item.entity';
import { User } from './user.entity';

export enum OrderStatus {
  PAID = 'paid', // 已支付待调度
  SCHEDULED = 'scheduled', // 已预约配送
  DELIVERING = 'delivering', // 配送中
  DELIVERED = 'delivered', // 已送达待买家确认
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled', // 已取消
  REFUNDED = 'refunded', // 已退货退款
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PAID]: '已支付·待调度',
  [OrderStatus.SCHEDULED]: '已预约配送',
  [OrderStatus.DELIVERING]: '配送中',
  [OrderStatus.DELIVERED]: '已送达·待确认',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
  [OrderStatus.REFUNDED]: '已退货退款',
};

export enum VehicleType {
  SMALL_VAN = 'small_van',
  MEDIUM_TRUCK = 'medium_truck',
  LARGE_TRUCK = 'large_truck',
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  [VehicleType.SMALL_VAN]: '小型面包车',
  [VehicleType.MEDIUM_TRUCK]: '中型货车',
  [VehicleType.LARGE_TRUCK]: '大型货车',
};

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderNo: string;

  @OneToOne(() => FurnitureItem)
  @JoinColumn({ name: 'itemId' })
  item: FurnitureItem;

  @Column({ unique: true })
  itemId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number; // 成交价

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryFee: number; // 配送费（买家支付）

  // 交付条件
  @Column()
  address: string;

  @Column({ type: 'int' })
  floor: number;

  @Column()
  hasElevator: boolean;

  @Column()
  needDisassembly: boolean; // 需要拆装

  @Column()
  needOldFurnitureRemoval: boolean; // 旧家具搬出

  @Column({ type: 'varchar' })
  vehicleType: VehicleType;

  @Column({ type: 'timestamptz', nullable: true })
  appointmentAt: Date; // 预约配送时间

  @Column({ type: 'varchar', default: OrderStatus.PAID })
  status: OrderStatus;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum DeliveryStatus {
  SCHEDULED = 'scheduled',
  EN_ROUTE = 'en_route',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.SCHEDULED]: '待执行',
  [DeliveryStatus.EN_ROUTE]: '配送中',
  [DeliveryStatus.DELIVERED]: '已送达',
  [DeliveryStatus.FAILED]: '配送失败',
};

@Entity('delivery_tasks')
export class DeliveryTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'courierId' })
  courier: User;

  @Column({ nullable: true })
  courierId: number;

  @Column({ type: 'varchar' })
  vehicleType: VehicleType;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'varchar', default: DeliveryStatus.SCHEDULED })
  status: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
