import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  SELLER = 'seller',
  BUYER = 'buyer',
  APPRAISER = 'appraiser',
  WAREHOUSE = 'warehouse',
  REFURBISHER = 'refurbisher',
  DELIVERY = 'delivery',
  CUSTOMER_SERVICE = 'customer_service',
  OPERATIONS = 'operations',
  ADMIN = 'admin',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SELLER]: '卖家',
  [UserRole.BUYER]: '买家',
  [UserRole.APPRAISER]: '估价师',
  [UserRole.WAREHOUSE]: '仓库管理员',
  [UserRole.REFURBISHER]: '翻新师',
  [UserRole.DELIVERY]: '配送员',
  [UserRole.CUSTOMER_SERVICE]: '客服',
  [UserRole.OPERATIONS]: '运营',
  [UserRole.ADMIN]: '管理员',
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  role: UserRole;

  @Column({ nullable: true })
  phone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
