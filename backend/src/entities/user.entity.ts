import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type UserRole =
  | 'SELLER'
  | 'BUYER'
  | 'APPRAISER'
  | 'WAREHOUSE'
  | 'REFURBISHER'
  | 'DELIVERY'
  | 'CS'
  | 'OPS'
  | 'ADMIN';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ default: '' })
  phone: string;

  @Index()
  @Column({ type: 'varchar', length: 16 })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
