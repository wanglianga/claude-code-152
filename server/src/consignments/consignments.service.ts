import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Consignment,
  ConsignmentStatus,
} from '../entities/consignment.entity';
import { Appraisal } from '../entities/appraisal.entity';
import {
  FurnitureItem,
  ItemStatus,
  LocationType,
  PrepTask,
  PrepTaskType,
} from '../entities/item.entity';
import { Issue, IssueType, IssueStatus } from '../entities/issue.entity';
import { Order } from '../entities/order.entity';
import { User, UserRole } from '../entities/user.entity';
import { IssuesService } from '../issues/issues.service';
import { bizNo } from '../common/constants';

export interface CreateConsignmentDto {
  category: string;
  brand: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  material: string;
  yearsUsed: number;
  defectPhotos: string[];
  defectDescription?: string;
  disassemblable: boolean;
  floor: number;
  hasElevator: boolean;
  expectedPrice: number;
  acceptsRefurbishment: boolean;
  address: string;
  contactPhone: string;
}

@Injectable()
export class ConsignmentsService {
  constructor(
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(Appraisal) private appraisals: Repository<Appraisal>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(PrepTask) private prepTasks: Repository<PrepTask>,
    @InjectRepository(Issue) private issues: Repository<Issue>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(User) private users: Repository<User>,
    private issuesService: IssuesService,
  ) {}

  /**
   * 卖家风险画像：统计其历史反悔、描述不符、售后争议。
   * 评分 = 反悔×2 + 描述不符×2 + 售后争议×1，≥2 分触发严格上门验真。
   */
  async sellerRisk(sellerId: number) {
    const sellerConsignments = await this.consignments.find({
      where: { sellerId },
      select: ['id'],
    });
    const ids = sellerConsignments.map((c) => c.id);
    if (ids.length === 0) {
      return { regretCount: 0, mismatchCount: 0, disputeCount: 0, score: 0, strict: false };
    }
    const all = await this.issues
      .createQueryBuilder('i')
      .where('i.consignmentId IN (:...ids)', { ids })
      .andWhere('i.status IN (:...st)', {
        st: [IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.PROCESSING, IssueStatus.OPEN],
      })
      .getMany();
    const regretCount = all.filter((i) => i.type === IssueType.SELLER_REGRET).length;
    const mismatchCount = all.filter(
      (i) => i.type === IssueType.APPRAISAL_MISMATCH,
    ).length;
    const disputeCount = all.filter((i) =>
      [
        IssueType.COLOR_DIFFERENCE,
        IssueType.RETURN_REQUEST,
        IssueType.DELIVERY_DAMAGE,
      ].includes(i.type),
    ).length;
    const score = regretCount * 2 + mismatchCount * 2 + disputeCount;
    return { regretCount, mismatchCount, disputeCount, score, strict: score >= 2 };
  }

  async create(seller: User, dto: CreateConsignmentDto) {
    const risk = await this.sellerRisk(seller.id);
    const reasons: string[] = [];
    if (risk.regretCount > 0) reasons.push(`历史反悔 ${risk.regretCount} 次`);
    if (risk.mismatchCount > 0) reasons.push(`描述不符 ${risk.mismatchCount} 次`);
    if (risk.disputeCount > 0) reasons.push(`售后争议 ${risk.disputeCount} 次`);

    const consignment = await this.consignments.save(
      this.consignments.create({
        applicationNo: bizNo('CS'),
        sellerId: seller.id,
        category: dto.category as any,
        brand: dto.brand,
        lengthCm: dto.lengthCm,
        widthCm: dto.widthCm,
        heightCm: dto.heightCm,
        material: dto.material,
        yearsUsed: dto.yearsUsed,
        defectPhotos: dto.defectPhotos || [],
        defectDescription: dto.defectDescription,
        disassemblable: !!dto.disassemblable,
        floor: Number(dto.floor),
        hasElevator: !!dto.hasElevator,
        expectedPrice: dto.expectedPrice,
        acceptsRefurbishment: !!dto.acceptsRefurbishment,
        address: dto.address,
        contactPhone: dto.contactPhone,
        status: ConsignmentStatus.PENDING_APPRAISAL,
        requiresStrictVerification: risk.strict,
        strictVerificationReason: risk.strict
          ? `卖家历史记录触发严格验真（${reasons.join('、')}）`
          : null,
      }),
    );
    return { ...consignment, sellerRisk: risk };
  }

  async findMine(sellerId: number) {
    const list = await this.consignments.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(list.map((c) => this.withDetail(c)));
  }

  async findAll(status?: ConsignmentStatus) {
    const where = status ? { status } : {};
    const list = await this.consignments.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return Promise.all(list.map((c) => this.withDetail(c)));
  }

  async findOne(id: number) {
    const consignment = await this.consignments.findOne({ where: { id } });
    if (!consignment) throw new NotFoundException('寄卖申请不存在');
    return this.withDetail(consignment);
  }

  private async withDetail(c: Consignment) {
    const appraisal = await this.appraisals.findOne({
      where: { consignmentId: c.id },
    });
    const item = await this.items.findOne({ where: { consignmentId: c.id } });
    const seller = await this.users.findOne({ where: { id: c.sellerId } });
    const order = item
      ? await this.orders.findOne({ where: { itemId: item.id } })
      : null;
    return {
      ...c,
      appraisal,
      item,
      order,
      sellerName: seller?.name,
    };
  }

  /** 估价师预约上门时间 */
  async schedule(id: number, appointmentAt: Date) {
    const c = await this.consignments.findOne({ where: { id } });
    if (!c) throw new NotFoundException('寄卖申请不存在');
    if (
      ![ConsignmentStatus.PENDING_APPRAISAL, ConsignmentStatus.SCHEDULED].includes(
        c.status,
      )
    ) {
      throw new BadRequestException('当前状态不可预约');
    }
    c.appointmentAt = appointmentAt;
    c.status = ConsignmentStatus.SCHEDULED;
    return this.consignments.save(c);
  }

  /** 卖家接受估价 → 生成家具库存档案与备货任务 */
  async accept(id: number, seller: User, locationType: LocationType) {
    const c = await this.consignments.findOne({ where: { id } });
    if (!c) throw new NotFoundException('寄卖申请不存在');
    if (c.sellerId !== seller.id) throw new ForbiddenException('无权操作');
    if (c.status !== ConsignmentStatus.APPRAISED) {
      throw new BadRequestException('当前状态不可确认');
    }
    const appraisal = await this.appraisals.findOne({
      where: { consignmentId: id },
    });
    if (!appraisal) throw new BadRequestException('缺少估价单');

    c.status = ConsignmentStatus.ACCEPTED;
    await this.consignments.save(c);

    let item = await this.items.findOne({ where: { consignmentId: id } });
    if (!item) {
      item = await this.items.save(
        this.items.create({
          itemNo: bizNo('IT'),
          consignmentId: id,
          locationType,
          status: ItemStatus.PREPARING,
          storageStartAt:
            locationType === LocationType.WAREHOUSE ? new Date() : null,
          warehouseLocation:
            locationType === LocationType.WAREHOUSE
              ? `${String.fromCharCode(65 + Math.floor(Math.random() * 4))}-0${1 + Math.floor(Math.random() * 5)}-0${1 + Math.floor(Math.random() * 9)}`
              : null,
        }),
      );
      // 依据估价建议自动生成备货任务
      const tasks: Partial<PrepTask>[] = [
        { itemId: item.id, type: PrepTaskType.CLEANING },
        { itemId: item.id, type: PrepTaskType.PHOTOGRAPHY },
      ];
      if (c.acceptsRefurbishment && appraisal.estimatedRefurbishmentCost > 0) {
        tasks.push({ itemId: item.id, type: PrepTaskType.REPAINTING });
      }
      await this.prepTasks.save(tasks.map((t) => this.prepTasks.create(t)));
    } else if (item.status === ItemStatus.OFF_SHELF) {
      item.status = ItemStatus.PREPARING;
      await this.items.save(item);
    }
    return this.findOne(id);
  }

  /** 卖家不接受估价 */
  async reject(id: number, seller: User) {
    const c = await this.consignments.findOne({ where: { id } });
    if (!c) throw new NotFoundException('寄卖申请不存在');
    if (c.sellerId !== seller.id) throw new ForbiddenException('无权操作');
    if (c.status !== ConsignmentStatus.APPRAISED) {
      throw new BadRequestException('当前状态不可操作');
    }
    c.status = ConsignmentStatus.REJECTED_BY_SELLER;
    return this.consignments.save(c);
  }

  /** 卖家临时反悔 → 生成异常工单，由客服协同处置 */
  async regret(id: number, seller: User, reason: string) {
    const c = await this.consignments.findOne({ where: { id } });
    if (!c) throw new NotFoundException('寄卖申请不存在');
    if (c.sellerId !== seller.id) throw new ForbiddenException('无权操作');
    if (
      [ConsignmentStatus.CANCELLED, ConsignmentStatus.COMPLETED].includes(c.status)
    ) {
      throw new BadRequestException('当前状态不可反悔');
    }
    const item = await this.items.findOne({ where: { consignmentId: id } });
    const order = item
      ? await this.orders.findOne({ where: { itemId: item.id } })
      : null;
    const fullUser = await this.users.findOne({ where: { id: seller.id } });
    return this.issuesService.raise({
      type: IssueType.SELLER_REGRET,
      consignmentId: id,
      itemId: item?.id,
      orderId: order?.id,
      raisedBy: fullUser,
      description: reason || '卖家临时反悔，申请取消寄卖',
    });
  }
}
