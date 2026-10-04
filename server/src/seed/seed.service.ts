import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { User, UserRole } from '../entities/user.entity';
import {
  Consignment,
  ConsignmentStatus,
  FurnitureCategory,
} from '../entities/consignment.entity';
import {
  Appraisal,
  ConditionLevel,
  MovingDifficulty,
} from '../entities/appraisal.entity';
import {
  FurnitureItem,
  ItemStatus,
  LocationType,
  PrepTask,
  PrepTaskStatus,
  PrepTaskType,
} from '../entities/item.entity';
import {
  Order,
  OrderStatus,
  DeliveryTask,
  DeliveryStatus,
  VehicleType,
} from '../entities/order.entity';
import {
  Issue,
  IssueEvent,
  IssueType,
  IssueStatus,
  CompensationBearer,
} from '../entities/issue.entity';
import {
  Settlement,
  SettlementLine,
  SettlementLineType,
  SettlementStatus,
} from '../entities/settlement.entity';
import { UPLOAD_DIR } from '../uploads/uploads.controller';
import { bizNo, calcStorageFee } from '../common/constants';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysLater = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private logger = new Logger('Seed');

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(Appraisal) private appraisals: Repository<Appraisal>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(PrepTask) private prepTasks: Repository<PrepTask>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(DeliveryTask) private deliveryTasks: Repository<DeliveryTask>,
    @InjectRepository(Issue) private issues: Repository<Issue>,
    @InjectRepository(IssueEvent) private issueEvents: Repository<IssueEvent>,
    @InjectRepository(Settlement) private settlements: Repository<Settlement>,
    @InjectRepository(SettlementLine) private settlementLines: Repository<SettlementLine>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.users.count();
    if (count > 0) return;
    this.logger.log('数据库为空，开始初始化种子数据...');
    await this.seed();
    this.logger.log('种子数据初始化完成');
  }

  private svg(label: string, color: string, file: string) {
    const path = join(UPLOAD_DIR, file);
    if (existsSync(path)) return `/uploads/${file}`;
    const content = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-size="36" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">${label}</text></svg>`;
    writeFileSync(path, content);
    return `/uploads/${file}`;
  }

  private async seed() {
    const pwd = await bcrypt.hash('123456', 10);
    const mkUser = (username: string, name: string, role: UserRole) =>
      this.users.create({ username, name, role, passwordHash: pwd, phone: '13800000000' });

    const [seller1, seller2, buyer1, buyer2, appraiser, warehouse, refurbisher, courier, cs, ops, admin] =
      await this.users.save([
        mkUser('seller1', '张阿姨', UserRole.SELLER),
        mkUser('seller2', '李大叔', UserRole.SELLER),
        mkUser('buyer1', '王小姐', UserRole.BUYER),
        mkUser('buyer2', '赵先生', UserRole.BUYER),
        mkUser('appraiser1', '陈估价', UserRole.APPRAISER),
        mkUser('warehouse1', '刘仓管', UserRole.WAREHOUSE),
        mkUser('refurbisher1', '孙师傅', UserRole.REFURBISHER),
        mkUser('delivery1', '周配送', UserRole.DELIVERY),
        mkUser('cs1', '吴客服', UserRole.CUSTOMER_SERVICE),
        mkUser('ops1', '郑运营', UserRole.OPERATIONS),
        mkUser('admin', '平台管理员', UserRole.ADMIN),
      ]);

    // 演示照片
    const photo = (label: string, color: string, key: string) =>
      this.svg(label, color, `seed-${key}.svg`);
    const sofaPhotos = [photo('三人位布艺沙发·整体', '#8d6e63', 'sofa-1'), photo('沙发·扶手细节', '#a1887f', 'sofa-2')];
    const shelfPhotos = [photo('实木书柜·整体', '#6d4c41', 'shelf-1')];
    const defect1 = [photo('瑕疵·扶手磨损', '#bf8f68', 'defect-1')];
    const defect2 = [photo('瑕疵·桌面划痕', '#9e9e9e', 'defect-2')];

    const mkConsignment = (p: Partial<Consignment>) =>
      this.consignments.save(this.consignments.create({ applicationNo: bizNo('CS'), ...p }));

    // ============ 进行中的演示数据 ============
    // C1 沙发：已入仓、备货完成、在售（买家可下单）
    const c1 = await mkConsignment({
      sellerId: seller1.id, category: FurnitureCategory.SOFA, brand: '顾家家居',
      lengthCm: 210, widthCm: 90, heightCm: 85, material: '布艺+实木框架', yearsUsed: 3,
      defectPhotos: defect1, defectDescription: '右侧扶手轻微磨损，坐垫略有塌陷',
      disassemblable: true, floor: 6, hasElevator: true, expectedPrice: 1800,
      acceptsRefurbishment: true, address: '朝阳区望京街道花家地小区 3 号楼', contactPhone: '13811112222',
      status: ConsignmentStatus.ACCEPTED, createdAt: daysAgo(12),
    });
    const a1 = await this.appraisals.save(this.appraisals.create({
      consignmentId: c1.id, appraiserId: appraiser.id,
      structureCondition: ConditionLevel.GOOD, stainLevel: ConditionLevel.FAIR, odorLevel: ConditionLevel.GOOD,
      insectDamage: false, boardDeformation: false, movingDifficulty: MovingDifficulty.MEDIUM,
      consignmentPrice: 1600, minPrice: 1350, commissionRate: 0.15,
      refurbishmentSuggestion: '建议深度清洁+扶手补色', estimatedRefurbishmentCost: 200,
      notes: '整体成色不错，布艺可清洗', createdAt: daysAgo(10),
    }));
    const i1 = await this.items.save(this.items.create({
      itemNo: bizNo('IT'), consignmentId: c1.id, locationType: LocationType.WAREHOUSE,
      warehouseLocation: 'A-02-03', storageStartAt: daysAgo(9),
      cleaningDone: true, repaintingDone: true, photographyDone: true,
      listingTitle: '顾家三人位布艺沙发 九成新 已深度清洁',
      listingDescription: '品牌布艺沙发，结构稳固无异味，已专业清洁并做扶手补色，可拆洗坐垫套。',
      listPrice: 1600, photos: sofaPhotos, deliveryZones: ['朝阳区', '海淀区', '东城区'],
      status: ItemStatus.LISTED, actualRefurbishmentCost: 180, listedAt: daysAgo(5), createdAt: daysAgo(9),
    }));
    await this.prepTasks.save([
      this.prepTasks.create({ itemId: i1.id, type: PrepTaskType.CLEANING, status: PrepTaskStatus.DONE, assigneeId: warehouse.id, cost: 80, notes: '深度清洁完成' }),
      this.prepTasks.create({ itemId: i1.id, type: PrepTaskType.REPAINTING, status: PrepTaskStatus.DONE, assigneeId: refurbisher.id, cost: 100, notes: '扶手补色' }),
      this.prepTasks.create({ itemId: i1.id, type: PrepTaskType.PHOTOGRAPHY, status: PrepTaskStatus.DONE, assigneeId: warehouse.id, cost: 0 }),
    ]);

    // C2 书柜：卖家家中存放、在售
    const c2 = await mkConsignment({
      sellerId: seller1.id, category: FurnitureCategory.BOOKSHELF, brand: '源氏木语',
      lengthCm: 120, widthCm: 35, heightCm: 200, material: '橡木实木', yearsUsed: 2,
      defectPhotos: [], defectDescription: '背板有一处小划痕',
      disassemblable: true, floor: 3, hasElevator: false, expectedPrice: 900,
      acceptsRefurbishment: false, address: '海淀区中关村大街 27 号院 5 单元', contactPhone: '13811112222',
      status: ConsignmentStatus.ACCEPTED, createdAt: daysAgo(8),
    });
    await this.appraisals.save(this.appraisals.create({
      consignmentId: c2.id, appraiserId: appraiser.id,
      structureCondition: ConditionLevel.GOOD, stainLevel: ConditionLevel.GOOD, odorLevel: ConditionLevel.GOOD,
      insectDamage: false, boardDeformation: false, movingDifficulty: MovingDifficulty.EASY,
      consignmentPrice: 850, minPrice: 700, commissionRate: 0.12,
      refurbishmentSuggestion: '无需翻新，简单除尘即可', estimatedRefurbishmentCost: 0,
      createdAt: daysAgo(7),
    }));
    const i2 = await this.items.save(this.items.create({
      itemNo: bizNo('IT'), consignmentId: c2.id, locationType: LocationType.SELLER_HOME,
      cleaningDone: true, repaintingDone: false, photographyDone: true,
      listingTitle: '源氏木语橡木书柜 自提优先',
      listingDescription: '实木书柜，2米高5层，承重好。存放于卖家家中，支持同城自提或平台配送（无电梯3楼）。',
      listPrice: 850, photos: shelfPhotos, deliveryZones: ['海淀区', '朝阳区'],
      status: ItemStatus.LISTED, actualRefurbishmentCost: 0, listedAt: daysAgo(4), createdAt: daysAgo(7),
    }));
    await this.prepTasks.save([
      this.prepTasks.create({ itemId: i2.id, type: PrepTaskType.CLEANING, status: PrepTaskStatus.DONE, assigneeId: warehouse.id, cost: 0, notes: '卖家自行除尘' }),
      this.prepTasks.create({ itemId: i2.id, type: PrepTaskType.PHOTOGRAPHY, status: PrepTaskStatus.DONE, assigneeId: warehouse.id, cost: 0 }),
    ]);

    // C3 李大叔的餐桌：待估价（触发严格验真）
    await mkConsignment({
      sellerId: seller2.id, category: FurnitureCategory.DINING_TABLE, brand: '全友',
      lengthCm: 140, widthCm: 80, heightCm: 75, material: '密度板贴皮', yearsUsed: 5,
      defectPhotos: defect2, defectDescription: '桌面有划痕，边角贴皮轻微翘起',
      disassemblable: false, floor: 12, hasElevator: true, expectedPrice: 600,
      acceptsRefurbishment: true, address: '丰台区方庄芳城园一区 8 号楼', contactPhone: '13933334444',
      status: ConsignmentStatus.PENDING_APPRAISAL,
      requiresStrictVerification: true,
      strictVerificationReason: '卖家历史记录触发严格验真（历史反悔 1 次、描述不符 1 次）',
      createdAt: daysAgo(1),
    });

    // C4 办公椅：已预约上门
    await mkConsignment({
      sellerId: seller1.id, category: FurnitureCategory.OFFICE_CHAIR, brand: '西昊',
      lengthCm: 65, widthCm: 65, heightCm: 120, material: '网布+尼龙脚', yearsUsed: 1,
      defectPhotos: [], defectDescription: '气压杆略有异响',
      disassemblable: true, floor: 8, hasElevator: true, expectedPrice: 350,
      acceptsRefurbishment: false, address: '朝阳区望京街道花家地小区 3 号楼', contactPhone: '13811112222',
      status: ConsignmentStatus.SCHEDULED, appointmentAt: daysLater(1), createdAt: daysAgo(2),
    });

    // C5 儿童床：已估价待卖家确认
    const c5 = await mkConsignment({
      sellerId: seller1.id, category: FurnitureCategory.KIDS_BED, brand: '松堡王国',
      lengthCm: 190, widthCm: 100, heightCm: 110, material: '松木实木', yearsUsed: 4,
      defectPhotos: [], defectDescription: '床尾有彩笔涂鸦痕迹',
      disassemblable: true, floor: 6, hasElevator: true, expectedPrice: 1200,
      acceptsRefurbishment: true, address: '朝阳区望京街道花家地小区 3 号楼', contactPhone: '13811112222',
      status: ConsignmentStatus.APPRAISED, createdAt: daysAgo(4),
    });
    await this.appraisals.save(this.appraisals.create({
      consignmentId: c5.id, appraiserId: appraiser.id,
      structureCondition: ConditionLevel.GOOD, stainLevel: ConditionLevel.FAIR, odorLevel: ConditionLevel.GOOD,
      insectDamage: false, boardDeformation: false, movingDifficulty: MovingDifficulty.MEDIUM,
      consignmentPrice: 1000, minPrice: 850, commissionRate: 0.15,
      refurbishmentSuggestion: '建议打磨涂鸦处并补木蜡油', estimatedRefurbishmentCost: 150,
      createdAt: daysAgo(2),
    }));

    // C6 家电柜：备货中（仓库/翻新师可继续处理）
    const c6 = await mkConsignment({
      sellerId: seller1.id, category: FurnitureCategory.APPLIANCE_CABINET, brand: '索菲亚',
      lengthCm: 180, widthCm: 45, heightCm: 90, material: '颗粒板', yearsUsed: 3,
      defectPhotos: [], defectDescription: '柜门合页松动',
      disassemblable: true, floor: 6, hasElevator: true, expectedPrice: 700,
      acceptsRefurbishment: true, address: '朝阳区望京街道花家地小区 3 号楼', contactPhone: '13811112222',
      status: ConsignmentStatus.ACCEPTED, createdAt: daysAgo(6),
    });
    await this.appraisals.save(this.appraisals.create({
      consignmentId: c6.id, appraiserId: appraiser.id,
      structureCondition: ConditionLevel.FAIR, stainLevel: ConditionLevel.FAIR, odorLevel: ConditionLevel.GOOD,
      insectDamage: false, boardDeformation: false, movingDifficulty: MovingDifficulty.MEDIUM,
      consignmentPrice: 650, minPrice: 520, commissionRate: 0.15,
      refurbishmentSuggestion: '更换合页+柜面补漆', estimatedRefurbishmentCost: 120,
      createdAt: daysAgo(5),
    }));
    const i6 = await this.items.save(this.items.create({
      itemNo: bizNo('IT'), consignmentId: c6.id, locationType: LocationType.WAREHOUSE,
      warehouseLocation: 'B-01-07', storageStartAt: daysAgo(3),
      cleaningDone: true, repaintingDone: false, photographyDone: false,
      status: ItemStatus.PREPARING, actualRefurbishmentCost: 60, createdAt: daysAgo(3),
    }));
    await this.prepTasks.save([
      this.prepTasks.create({ itemId: i6.id, type: PrepTaskType.CLEANING, status: PrepTaskStatus.DONE, assigneeId: warehouse.id, cost: 60 }),
      this.prepTasks.create({ itemId: i6.id, type: PrepTaskType.REPAINTING, status: PrepTaskStatus.PENDING }),
      this.prepTasks.create({ itemId: i6.id, type: PrepTaskType.PHOTOGRAPHY, status: PrepTaskStatus.PENDING }),
    ]);

    // C7 沙发2：已售出送达，买家发起色差争议（客服演示）
    const c7 = await mkConsignment({
      sellerId: seller1.id, category: FurnitureCategory.SOFA, brand: '左右',
      lengthCm: 180, widthCm: 85, heightCm: 80, material: '科技布', yearsUsed: 2,
      defectPhotos: [], defectDescription: '无明显瑕疵',
      disassemblable: false, floor: 6, hasElevator: true, expectedPrice: 1500,
      acceptsRefurbishment: true, address: '朝阳区望京街道花家地小区 3 号楼', contactPhone: '13811112222',
      status: ConsignmentStatus.ACCEPTED, createdAt: daysAgo(20),
    });
    await this.appraisals.save(this.appraisals.create({
      consignmentId: c7.id, appraiserId: appraiser.id,
      structureCondition: ConditionLevel.GOOD, stainLevel: ConditionLevel.GOOD, odorLevel: ConditionLevel.GOOD,
      insectDamage: false, boardDeformation: false, movingDifficulty: MovingDifficulty.MEDIUM,
      consignmentPrice: 1400, minPrice: 1200, commissionRate: 0.15,
      refurbishmentSuggestion: '简单清洁', estimatedRefurbishmentCost: 80, createdAt: daysAgo(18),
    }));
    const i7 = await this.items.save(this.items.create({
      itemNo: bizNo('IT'), consignmentId: c7.id, locationType: LocationType.WAREHOUSE,
      warehouseLocation: 'A-03-01', storageStartAt: daysAgo(16),
      cleaningDone: true, repaintingDone: true, photographyDone: true,
      listingTitle: '左右科技布双人沙发 灰色',
      listingDescription: '科技布耐磨好打理，实物为浅灰色。',
      listPrice: 1400, photos: [photo('科技布沙发·灰色', '#78909c', 'sofa-3')],
      deliveryZones: ['朝阳区', '海淀区'], status: ItemStatus.SOLD,
      actualRefurbishmentCost: 70, listedAt: daysAgo(14), createdAt: daysAgo(16),
    }));
    const o7 = await this.orders.save(this.orders.create({
      orderNo: bizNo('OD'), itemId: i7.id, buyerId: buyer1.id, price: 1400, deliveryFee: 150,
      address: '朝阳区三里屯SOHO 2 座 1502', floor: 15, hasElevator: true,
      needDisassembly: false, needOldFurnitureRemoval: false, vehicleType: VehicleType.MEDIUM_TRUCK,
      appointmentAt: daysAgo(1), status: OrderStatus.DELIVERED,
      deliveredAt: daysAgo(1), createdAt: daysAgo(3),
    }));
    await this.deliveryTasks.save(this.deliveryTasks.create({
      orderId: o7.id, courierId: courier.id, vehicleType: VehicleType.MEDIUM_TRUCK,
      scheduledAt: daysAgo(1), status: DeliveryStatus.DELIVERED, createdAt: daysAgo(2),
    }));
    const issue1 = await this.issues.save(this.issues.create({
      issueNo: bizNo('IS'), type: IssueType.COLOR_DIFFERENCE, status: IssueStatus.OPEN,
      consignmentId: c7.id, itemId: i7.id, orderId: o7.id,
      raisedById: buyer1.id, raisedByRole: UserRole.BUYER,
      description: '页面照片偏暖灰色，实物明显偏蓝灰，色差明显，要求处理。',
      createdAt: daysAgo(0),
    }));
    await this.issueEvents.save(this.issueEvents.create({
      issueId: issue1.id, actorName: '王小姐', actorRole: UserRole.BUYER,
      content: '发起工单【页面照片偏暖灰色，实物明显偏蓝灰，色差明显，要求处理。】',
    }));

    // C8 儿童床2：已支付待配送（配送员演示）
    const c8 = await mkConsignment({
      sellerId: seller1.id, category: FurnitureCategory.KIDS_BED, brand: '芙莱莎',
      lengthCm: 200, widthCm: 120, heightCm: 100, material: '榉木', yearsUsed: 3,
      defectPhotos: [], defectDescription: '护栏轻微松动已修复',
      disassemblable: true, floor: 6, hasElevator: true, expectedPrice: 1600,
      acceptsRefurbishment: true, address: '朝阳区望京街道花家地小区 3 号楼', contactPhone: '13811112222',
      status: ConsignmentStatus.ACCEPTED, createdAt: daysAgo(15),
    });
    await this.appraisals.save(this.appraisals.create({
      consignmentId: c8.id, appraiserId: appraiser.id,
      structureCondition: ConditionLevel.GOOD, stainLevel: ConditionLevel.GOOD, odorLevel: ConditionLevel.GOOD,
      insectDamage: false, boardDeformation: false, movingDifficulty: MovingDifficulty.MEDIUM,
      consignmentPrice: 1500, minPrice: 1300, commissionRate: 0.15,
      refurbishmentSuggestion: '紧固五金+清洁', estimatedRefurbishmentCost: 60, createdAt: daysAgo(13),
    }));
    const i8 = await this.items.save(this.items.create({
      itemNo: bizNo('IT'), consignmentId: c8.id, locationType: LocationType.WAREHOUSE,
      warehouseLocation: 'C-01-02', storageStartAt: daysAgo(12),
      cleaningDone: true, repaintingDone: true, photographyDone: true,
      listingTitle: '芙莱莎榉木儿童床 1.2m 带护栏',
      listingDescription: '实木儿童床，护栏已加固，含床垫。',
      listPrice: 1500, photos: [photo('榉木儿童床', '#a1887f', 'bed-1')],
      deliveryZones: ['朝阳区', '东城区', '西城区'], status: ItemStatus.RESERVED,
      actualRefurbishmentCost: 50, listedAt: daysAgo(10), createdAt: daysAgo(12),
    }));
    const o8 = await this.orders.save(this.orders.create({
      orderNo: bizNo('OD'), itemId: i8.id, buyerId: buyer2.id, price: 1500, deliveryFee: 210,
      address: '东城区东直门南大街 9 号院 6 楼', floor: 6, hasElevator: false,
      needDisassembly: true, needOldFurnitureRemoval: true, vehicleType: VehicleType.MEDIUM_TRUCK,
      appointmentAt: daysLater(1), status: OrderStatus.SCHEDULED, createdAt: daysAgo(1),
    }));
    await this.deliveryTasks.save(this.deliveryTasks.create({
      orderId: o8.id, courierId: courier.id, vehicleType: VehicleType.MEDIUM_TRUCK,
      scheduledAt: daysLater(1), status: DeliveryStatus.SCHEDULED,
      notes: '无电梯6楼，需拆装并搬出旧床', createdAt: daysAgo(1),
    }));

    // ============ 历史完结数据（分析/结算/卖家风险） ============
    await this.seedHistory({ seller1, seller2, buyer1, buyer2, appraiser, courier, cs });
  }

  private async seedHistory(u: Record<string, User>) {
    const { seller1, seller2, buyer1, buyer2, appraiser, courier, cs } = u as any;
    const warehouse = await this.users.findOne({
      where: { username: 'warehouse1' },
    });

    const mk = async (
      seller: User,
      cat: FurnitureCategory,
      brand: string,
      opts: {
        price: number; rate?: number; refurb?: number; storageDays?: number;
        cycleDays: number; deliveryFee?: number; location?: LocationType;
        status?: OrderStatus; createdDaysAgo: number;
      },
    ) => {
      const c = await this.consignments.save(this.consignments.create({
        applicationNo: bizNo('CS'), sellerId: seller.id, category: cat, brand,
        lengthCm: 150, widthCm: 60, heightCm: 80, material: '实木', yearsUsed: 3,
        defectPhotos: [], defectDescription: '正常使用痕迹', disassemblable: true,
        floor: 5, hasElevator: true, expectedPrice: opts.price, acceptsRefurbishment: true,
        address: '朝阳区某小区', contactPhone: '13800000000',
        status: opts.status === OrderStatus.REFUNDED ? ConsignmentStatus.ACCEPTED : ConsignmentStatus.COMPLETED,
        createdAt: daysAgo(opts.createdDaysAgo + opts.cycleDays + 5),
      }));
      await this.appraisals.save(this.appraisals.create({
        consignmentId: c.id, appraiserId: appraiser.id,
        structureCondition: ConditionLevel.GOOD, stainLevel: ConditionLevel.FAIR, odorLevel: ConditionLevel.GOOD,
        insectDamage: false, boardDeformation: false, movingDifficulty: MovingDifficulty.MEDIUM,
        consignmentPrice: opts.price, minPrice: Math.round(opts.price * 0.85),
        commissionRate: opts.rate ?? 0.15, estimatedRefurbishmentCost: opts.refurb ?? 0,
        createdAt: daysAgo(opts.createdDaysAgo + opts.cycleDays + 3),
      }));
      const itemStatus =
        opts.status === OrderStatus.REFUNDED ? ItemStatus.LISTED : ItemStatus.COMPLETED;
      const item = await this.items.save(this.items.create({
        itemNo: bizNo('IT'), consignmentId: c.id,
        locationType: opts.location ?? LocationType.WAREHOUSE,
        warehouseLocation: opts.location === LocationType.SELLER_HOME ? null : 'H-01-01',
        storageStartAt: opts.location === LocationType.SELLER_HOME ? null : daysAgo(opts.createdDaysAgo + opts.cycleDays),
        cleaningDone: true, repaintingDone: (opts.refurb ?? 0) > 0, photographyDone: true,
        listingTitle: `${brand} 二手家具`, listingDescription: '历史成交样品',
        listPrice: opts.price, photos: [], deliveryZones: ['朝阳区'],
        status: itemStatus, actualRefurbishmentCost: opts.refurb ?? 0,
        listedAt: daysAgo(opts.createdDaysAgo + opts.cycleDays), createdAt: daysAgo(opts.createdDaysAgo + opts.cycleDays),
      }));
      const order = await this.orders.save(this.orders.create({
        orderNo: bizNo('OD'), itemId: item.id, buyerId: buyer1.id, price: opts.price,
        deliveryFee: opts.deliveryFee ?? 150, address: '朝阳区某地址', floor: 3, hasElevator: true,
        needDisassembly: false, needOldFurnitureRemoval: false, vehicleType: VehicleType.MEDIUM_TRUCK,
        appointmentAt: daysAgo(opts.createdDaysAgo), status: opts.status ?? OrderStatus.COMPLETED,
        deliveredAt: daysAgo(opts.createdDaysAgo), completedAt: opts.status === OrderStatus.REFUNDED ? null : daysAgo(opts.createdDaysAgo),
        createdAt: daysAgo(opts.createdDaysAgo + 1),
      }));
      await this.deliveryTasks.save(this.deliveryTasks.create({
        orderId: order.id, courierId: courier.id, vehicleType: VehicleType.MEDIUM_TRUCK,
        scheduledAt: daysAgo(opts.createdDaysAgo), status: DeliveryStatus.DELIVERED, createdAt: daysAgo(opts.createdDaysAgo),
      }));
      return { c, item, order };
    };

    const settle = async (
      c: Consignment, item: FurnitureItem, order: Order,
      opts: { rate: number; refurb: number; storageDays: number; comps?: { amount: number; bearer: CompensationBearer; issueNo: string; note: string }[] },
    ) => {
      const price = Number(order.price);
      const commission = Math.round(price * opts.rate * 100) / 100;
      const { fee: storageFee } =
        opts.storageDays > 0
          ? calcStorageFee(daysAgo(opts.storageDays), order.createdAt)
          : { fee: 0 };
      const sellerComp = (opts.comps ?? []).filter((x) => x.bearer === CompensationBearer.SELLER).reduce((s, x) => s + x.amount, 0);
      const platformComp = (opts.comps ?? []).filter((x) => x.bearer === CompensationBearer.PLATFORM).reduce((s, x) => s + x.amount, 0);
      const settlement = await this.settlements.save(this.settlements.create({
        settlementNo: bizNo('ST'), orderId: order.id, itemId: item.id, sellerId: c.sellerId,
        transactionPrice: price, commissionAmount: commission, refurbishmentCost: opts.refurb,
        storageFee, deliveryFee: Number(order.deliveryFee),
        afterSalesCompensation: sellerComp + platformComp,
        sellerPayout: Math.round((price - commission - opts.refurb - storageFee - sellerComp) * 100) / 100,
        platformRevenue: Math.round((commission - platformComp) * 100) / 100,
        status: SettlementStatus.FINALIZED, createdAt: daysAgo(1),
      }));
      const lines: Partial<SettlementLine>[] = [
        { type: SettlementLineType.TRANSACTION_PRICE, amount: price, direction: 'credit', bearer: 'buyer', description: `买家支付成交价（订单 ${order.orderNo}）`, sourceRef: order.orderNo },
        { type: SettlementLineType.COMMISSION, amount: commission, direction: 'debit', bearer: 'seller', description: `平台佣金 = 成交价 × ${(opts.rate * 100).toFixed(0)}%`, sourceRef: `AP-${c.id}` },
      ];
      if (opts.refurb > 0) lines.push({ type: SettlementLineType.REFURBISHMENT, amount: opts.refurb, direction: 'debit', bearer: 'seller', description: '翻新费 = 备货实际成本', sourceRef: item.itemNo });
      if (storageFee > 0) lines.push({ type: SettlementLineType.STORAGE, amount: storageFee, direction: 'debit', bearer: 'seller', description: `仓储费 = ${opts.storageDays} 天 × 3 元/天`, sourceRef: item.itemNo });
      lines.push({ type: SettlementLineType.DELIVERY, amount: Number(order.deliveryFee), direction: 'credit', bearer: 'delivery', description: '配送费（买家支付，平台代收转付）', sourceRef: order.orderNo });
      for (const comp of opts.comps ?? []) {
        lines.push({ type: SettlementLineType.AFTERSALES_COMPENSATION, amount: comp.amount, direction: 'debit', bearer: comp.bearer, description: `售后赔付（${comp.note}）`, sourceRef: comp.issueNo });
      }
      await this.settlementLines.save(lines.map((l) => this.settlementLines.create({ ...l, settlementId: settlement.id })));
    };

    const mkIssue = async (p: Partial<Issue>, events: { name: string; role: string; content: string }[]) => {
      const issue = await this.issues.save(this.issues.create({ issueNo: bizNo('IS'), ...p }));
      await this.issueEvents.save(events.map((e) => this.issueEvents.create({
        issueId: issue.id, actorName: e.name, actorRole: e.role, content: e.content,
      })));
      return issue;
    };

    // H1 沙发成交（25天周期，无纠纷）
    const h1 = await mk(seller1, FurnitureCategory.SOFA, '芝华仕', { price: 2200, refurb: 260, storageDays: 30, cycleDays: 25, deliveryFee: 150, createdDaysAgo: 60 });
    await settle(h1.c, h1.item, h1.order, { rate: 0.15, refurb: 260, storageDays: 30 });

    // H2 餐桌退货（退货率样本）
    const h2 = await mk(seller1, FurnitureCategory.DINING_TABLE, '曲美', { price: 800, refurb: 100, storageDays: 20, cycleDays: 18, deliveryFee: 150, status: OrderStatus.REFUNDED, createdDaysAgo: 45 });
    await mkIssue({
      type: IssueType.RETURN_REQUEST, status: IssueStatus.RESOLVED,
      consignmentId: h2.c.id, itemId: h2.item.id, orderId: h2.order.id,
      raisedById: buyer1.id, raisedByRole: UserRole.BUYER,
      description: '桌面晃动明显，与描述不符，要求退货。',
      resolution: '核实属实，同意退货退款，商品重新上架。',
      resolutionAction: 'approve_return', compensationAmount: 0, compensationBearer: CompensationBearer.NONE,
      handlerId: cs.id, createdAt: daysAgo(44),
    }, [
      { name: '王小姐', role: 'buyer', content: '发起退货：桌面晃动明显' },
      { name: '吴客服', role: 'customer_service', content: '核实属实，同意退货退款' },
    ]);

    // H3 办公椅成交+配送磕碰赔付（平台承担）
    const h3 = await mk(seller2, FurnitureCategory.OFFICE_CHAIR, '保友', { price: 600, refurb: 0, storageDays: 12, cycleDays: 12, deliveryFee: 80, createdDaysAgo: 40 });
    const h3Issue = await mkIssue({
      type: IssueType.DELIVERY_DAMAGE, status: IssueStatus.RESOLVED,
      consignmentId: h3.c.id, itemId: h3.item.id, orderId: h3.order.id,
      raisedById: buyer2.id, raisedByRole: UserRole.BUYER,
      description: '椅脚运输途中磕碰掉漆。',
      resolution: '平台赔付买家 120 元，订单继续履约完成。',
      resolutionAction: 'compensate', compensationAmount: 120, compensationBearer: CompensationBearer.PLATFORM,
      handlerId: cs.id, createdAt: daysAgo(39),
    }, [
      { name: '赵先生', role: 'buyer', content: '椅脚运输途中磕碰掉漆' },
      { name: '吴客服', role: 'customer_service', content: '与配送核实属实，平台赔付 120 元' },
    ]);
    await settle(h3.c, h3.item, h3.order, { rate: 0.15, refurb: 0, storageDays: 12, comps: [{ amount: 120, bearer: CompensationBearer.PLATFORM, issueNo: h3Issue.issueNo, note: '配送磕碰赔付' }] });

    // H4 儿童床：首次配送失败（进不了电梯）后重新配送成功
    const h4 = await mk(seller1, FurnitureCategory.KIDS_BED, '喜梦宝', { price: 1100, refurb: 120, storageDays: 22, cycleDays: 20, deliveryFee: 210, createdDaysAgo: 35 });
    await this.deliveryTasks.save(this.deliveryTasks.create({
      orderId: h4.order.id, courierId: courier.id, vehicleType: VehicleType.SMALL_VAN,
      scheduledAt: daysAgo(36), status: DeliveryStatus.FAILED,
      failureReason: '床架整体无法进电梯，需拆装后重新配送', createdAt: daysAgo(36),
    }));
    const h4Issue = await mkIssue({
      type: IssueType.ELEVATOR_UNFIT, status: IssueStatus.RESOLVED,
      consignmentId: h4.c.id, itemId: h4.item.id, orderId: h4.order.id,
      raisedById: courier.id, raisedByRole: UserRole.DELIVERY,
      description: '配送失败：床架整体无法进电梯，需拆装后重新配送',
      resolution: '改用拆装方案重新配送，已完成交付。',
      resolutionAction: 'reschedule', compensationAmount: 0, compensationBearer: CompensationBearer.NONE,
      handlerId: cs.id, createdAt: daysAgo(36),
    }, [
      { name: '周配送', role: 'delivery', content: '配送失败：床架无法进电梯' },
      { name: '吴客服', role: 'customer_service', content: '协调拆装团队二次配送' },
    ]);
    await settle(h4.c, h4.item, h4.order, { rate: 0.15, refurb: 120, storageDays: 22 });

    // H5 书柜成交（自提，周期短）
    const h5 = await mk(seller2, FurnitureCategory.BOOKSHELF, '林氏木业', { price: 500, refurb: 0, storageDays: 0, cycleDays: 9, deliveryFee: 0, location: LocationType.SELLER_HOME, createdDaysAgo: 30 });
    await settle(h5.c, h5.item, h5.order, { rate: 0.12, refurb: 0, storageDays: 0 });

    // H6 李大叔历史反悔（风险画像样本）
    const cRegret = await this.consignments.save(this.consignments.create({
      applicationNo: bizNo('CS'), sellerId: seller2.id, category: FurnitureCategory.APPLIANCE_CABINET,
      brand: '欧派', lengthCm: 160, widthCm: 40, heightCm: 85, material: '颗粒板', yearsUsed: 4,
      defectPhotos: [], defectDescription: '正常使用痕迹', disassemblable: true,
      floor: 12, hasElevator: true, expectedPrice: 900, acceptsRefurbishment: true,
      address: '丰台区方庄', contactPhone: '13933334444',
      status: ConsignmentStatus.CANCELLED, createdAt: daysAgo(50),
    }));
    const iRegret = await this.items.save(this.items.create({
      itemNo: bizNo('IT'), consignmentId: cRegret.id, locationType: LocationType.SELLER_HOME,
      cleaningDone: true, repaintingDone: false, photographyDone: true,
      listingTitle: '欧派家电柜', listPrice: 880, photos: [], deliveryZones: ['丰台区'],
      status: ItemStatus.RETURNED_TO_SELLER, actualRefurbishmentCost: 0,
      listedAt: daysAgo(48), createdAt: daysAgo(49),
    }));
    await mkIssue({
      type: IssueType.SELLER_REGRET, status: IssueStatus.RESOLVED,
      consignmentId: cRegret.id, itemId: iRegret.id,
      raisedById: seller2.id, raisedByRole: UserRole.SELLER,
      description: '家人不同意出售，申请取消寄卖。',
      resolution: '卖家承担违约责任，商品下架退回。',
      resolutionAction: 'confirm', compensationAmount: 0, compensationBearer: CompensationBearer.NONE,
      handlerId: cs.id, createdAt: daysAgo(47),
    }, [
      { name: '李大叔', role: 'seller', content: '家人不同意出售，申请取消寄卖' },
      { name: '吴客服', role: 'customer_service', content: '确认反悔，商品退回卖家，记录信用' },
    ]);

    // H7 李大叔描述不符（风险画像样本）
    const cMismatch = await this.consignments.save(this.consignments.create({
      applicationNo: bizNo('CS'), sellerId: seller2.id, category: FurnitureCategory.SOFA,
      brand: '无品牌', lengthCm: 200, widthCm: 90, heightCm: 85, material: '皮质', yearsUsed: 6,
      defectPhotos: [], defectDescription: '轻微使用痕迹', disassemblable: false,
      floor: 12, hasElevator: true, expectedPrice: 2000, acceptsRefurbishment: false,
      address: '丰台区方庄', contactPhone: '13933334444',
      status: ConsignmentStatus.CANCELLED, createdAt: daysAgo(70),
    }));
    const iMismatch = await this.items.save(this.items.create({
      itemNo: bizNo('IT'), consignmentId: cMismatch.id, locationType: LocationType.WAREHOUSE,
      warehouseLocation: 'D-02-01', storageStartAt: daysAgo(66),
      cleaningDone: false, repaintingDone: false, photographyDone: false,
      status: ItemStatus.RETURNED_TO_SELLER, actualRefurbishmentCost: 0, createdAt: daysAgo(66),
    }));
    await mkIssue({
      type: IssueType.APPRAISAL_MISMATCH, status: IssueStatus.RESOLVED,
      consignmentId: cMismatch.id, itemId: iMismatch.id,
      raisedById: warehouse.id,
      raisedByRole: UserRole.WAREHOUSE,
      description: '入库复检发现大面积皮面开裂与异味，与卖家描述“轻微使用痕迹”严重不符。',
      resolution: '商品退回卖家，记录描述不符一次。',
      resolutionAction: 'off_shelf', compensationAmount: 0, compensationBearer: CompensationBearer.NONE,
      handlerId: cs.id, createdAt: daysAgo(65),
    }, [
      { name: '刘仓管', role: 'warehouse', content: '入库复检发现与描述严重不符' },
      { name: '吴客服', role: 'customer_service', content: '核实属实，退回卖家并记录' },
    ]);

    // H8 家电柜成交（翻新超支已结案样本）
    const h8 = await mk(seller1, FurnitureCategory.APPLIANCE_CABINET, '尚品宅配', { price: 750, refurb: 220, storageDays: 26, cycleDays: 22, deliveryFee: 150, createdDaysAgo: 55 });
    await mkIssue({
      type: IssueType.REFURBISHMENT_OVERRUN, status: IssueStatus.RESOLVED,
      consignmentId: h8.c.id, itemId: h8.item.id,
      raisedById: (await this.users.findOne({ where: { username: 'refurbisher1' } })).id,
      raisedByRole: UserRole.REFURBISHER,
      description: '翻新实际成本 220 元，超出预估 150 元的 120%。',
      resolution: '超支 70 元由平台与卖家各承担一半，平台补贴 35 元。',
      resolutionAction: 'share', compensationAmount: 35, compensationBearer: CompensationBearer.PLATFORM,
      handlerId: cs.id, createdAt: daysAgo(50),
    }, [
      { name: '孙师傅', role: 'refurbisher', content: '板材变形比预估严重，成本超支' },
      { name: '吴客服', role: 'customer_service', content: '超支部分平台与卖家各半' },
    ]);
    await settle(h8.c, h8.item, h8.order, { rate: 0.15, refurb: 220, storageDays: 26 });
  }
}
