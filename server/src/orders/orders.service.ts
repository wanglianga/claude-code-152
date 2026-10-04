import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  VehicleType,
} from '../entities/order.entity';
import { FurnitureItem, ItemStatus } from '../entities/item.entity';
import { Consignment } from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import { User } from '../entities/user.entity';
import { SettlementsService } from '../settlements/settlements.service';
import { bizNo, calcDeliveryFee } from '../common/constants';

export interface CreateOrderDto {
  itemId: number;
  address: string;
  floor: number;
  hasElevator: boolean;
  needDisassembly: boolean;
  needOldFurnitureRemoval: boolean;
  vehicleType: VehicleType;
  appointmentAt: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(Appraisal) private appraisals: Repository<Appraisal>,
    private settlementsService: SettlementsService,
  ) {}

  /** 买家商城：在售商品 */
  async marketplace(category?: string, keyword?: string) {
    const qb = this.items
      .createQueryBuilder('i')
      .where('i.status = :status', { status: ItemStatus.LISTED })
      .orderBy('i.listedAt', 'DESC');
    const list = await qb.getMany();
    const enriched = await Promise.all(
      list.map(async (item) => {
        const consignment = await this.consignments.findOne({
          where: { id: item.consignmentId },
        });
        return { ...item, consignment };
      }),
    );
    return enriched.filter((row) => {
      if (category && row.consignment?.category !== category) return false;
      if (keyword) {
        const text = `${row.listingTitle ?? ''}${row.consignment?.brand ?? ''}${row.consignment?.material ?? ''}`;
        if (!text.includes(keyword)) return false;
      }
      return true;
    });
  }

  async marketItem(id: number) {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new NotFoundException('商品不存在');
    const consignment = await this.consignments.findOne({
      where: { id: item.consignmentId },
    });
    const appraisal = await this.appraisals.findOne({
      where: { consignmentId: item.consignmentId },
    });
    return { ...item, consignment, appraisal };
  }

  /** 买家下单：锁定商品，按规则计算配送费 */
  async create(buyer: User, dto: CreateOrderDto) {
    const item = await this.items.findOne({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('商品不存在');
    if (item.status !== ItemStatus.LISTED) {
      throw new BadRequestException('商品已售出或已下架');
    }
    const consignment = await this.consignments.findOne({
      where: { id: item.consignmentId },
    });
    if (consignment.sellerId === buyer.id) {
      throw new BadRequestException('不能购买自己寄卖的家具');
    }
    const deliveryFee = calcDeliveryFee({
      vehicleType: dto.vehicleType,
      floor: Number(dto.floor),
      hasElevator: !!dto.hasElevator,
      needDisassembly: !!dto.needDisassembly,
      needOldFurnitureRemoval: !!dto.needOldFurnitureRemoval,
    });

    const order = await this.orders.save(
      this.orders.create({
        orderNo: bizNo('OD'),
        itemId: item.id,
        buyerId: buyer.id,
        price: item.listPrice,
        deliveryFee,
        address: dto.address,
        floor: Number(dto.floor),
        hasElevator: !!dto.hasElevator,
        needDisassembly: !!dto.needDisassembly,
        needOldFurnitureRemoval: !!dto.needOldFurnitureRemoval,
        vehicleType: dto.vehicleType,
        appointmentAt: dto.appointmentAt ? new Date(dto.appointmentAt) : null,
        status: OrderStatus.PAID,
      }),
    );
    item.status = ItemStatus.RESERVED;
    await this.items.save(item);
    return order;
  }

  async mine(buyerId: number) {
    const list = await this.orders.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(list.map((o) => this.withDetail(o)));
  }

  async findAll(status?: OrderStatus) {
    const where = status ? { status } : {};
    const list = await this.orders.find({ where, order: { createdAt: 'DESC' } });
    return Promise.all(list.map((o) => this.withDetail(o)));
  }

  async findOne(id: number) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    return this.withDetail(order);
  }

  private async withDetail(order: Order) {
    const item = await this.items.findOne({ where: { id: order.itemId } });
    const consignment = item
      ? await this.consignments.findOne({ where: { id: item.consignmentId } })
      : null;
    return { ...order, item, consignment };
  }

  /** 买家确认收货 → 订单完成 → 生成结算单 */
  async confirm(id: number, buyer: User) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.buyerId !== buyer.id) throw new ForbiddenException('无权操作');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('订单未送达，不能确认收货');
    }
    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date();
    await this.orders.save(order);

    const item = await this.items.findOne({ where: { id: order.itemId } });
    item.status = ItemStatus.COMPLETED;
    await this.items.save(item);
    await this.consignments.update(
      { id: item.consignmentId },
      { status: 'completed' as any },
    );
    await this.settlementsService.generateForOrder(order.id);
    return this.findOne(id);
  }
}
