import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Appraisal } from '../entities/appraisal.entity';
import { Consignment } from '../entities/consignment.entity';
import { Item } from '../entities/item.entity';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SellerRiskService } from '../risk/risk.module';

class CreateAppraisalDto {
  structuralScore: number;
  stainScore: number;
  odorScore: number;
  mothScore: number;
  warpScore: number;
  moveDifficulty: number;
  consignmentPrice: number;
  minDealPrice: number;
  commissionRate?: number;
  estimatedRefurbishCost?: number;
  cleaningAdvice?: string;
  refurbishSuggestions?: string;
  matchResult: 'MATCH' | 'MINOR_DIFF' | 'MISMATCH';
  matchNote?: string;
  /** 估价后决定：ACCEPT 接受寄卖生成在仓商品 / REJECT 不符合寄卖 */
  decision?: 'ACCEPT' | 'REJECT';
  location?: 'WAREHOUSE' | 'SELLER_HOME';
  deliveryRadiusKm?: number;
}

function rangeScore(v: number, name: string) {
  const n = Number(v);
  if (!(n >= 1 && n <= 5)) {
    throw new BadRequestException(`${name} 必须为 1-5 的整数`);
  }
  return n;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appraisals')
export class AppraisalController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly risk: SellerRiskService,
  ) {}

  @Roles('APPRAISER', 'OPS')
  @Post('consignment/:consignmentId')
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('consignmentId') consignmentId: string,
    @Body() dto: CreateAppraisalDto,
  ) {
    return this.ds.transaction(async (m) => {
      const consignment = await m.findOne(Consignment, {
        where: { id: consignmentId },
      });
      if (!consignment) throw new NotFoundException('寄卖申请不存在');
      if (consignment.status === 'CANCELLED') {
        throw new BadRequestException('卖家已反悔，无法估价');
      }

      const exists = await m.findOne(Appraisal, { where: { consignmentId } });
      if (exists) {
        throw new BadRequestException('该申请已有估价记录');
      }

      const price = Number(dto.consignmentPrice);
      const minPrice = Number(dto.minDealPrice);
      if (!(price > 0) || !(minPrice > 0)) {
        throw new BadRequestException('寄卖价与最低成交价必须大于 0');
      }
      if (minPrice > price) {
        throw new BadRequestException('最低成交价不能高于寄卖价');
      }
      if (
        !dto.matchResult ||
        !['MATCH', 'MINOR_DIFF', 'MISMATCH'].includes(dto.matchResult)
      ) {
        throw new BadRequestException('请选择估价与实物相符程度');
      }

      const appraisal = m.create(Appraisal, {
        consignmentId,
        appraiserId: user.sub,
        structuralScore: rangeScore(dto.structuralScore, '结构评分'),
        stainScore: rangeScore(dto.stainScore, '污渍评分'),
        odorScore: rangeScore(dto.odorScore, '异味评分'),
        mothScore: rangeScore(dto.mothScore, '虫蛀评分'),
        warpScore: rangeScore(dto.warpScore, '板材变形评分'),
        moveDifficulty: rangeScore(dto.moveDifficulty, '搬运难度'),
        consignmentPrice: price.toFixed(2),
        minDealPrice: minPrice.toFixed(2),
        commissionRate: (
          dto.commissionRate != null ? Number(dto.commissionRate) : 0.15
        ).toFixed(4),
        estimatedRefurbishCost: String(
          Number(dto.estimatedRefurbishCost || 0),
        ),
        cleaningAdvice: dto.cleaningAdvice || '',
        refurbishSuggestions: dto.refurbishSuggestions || '',
        matchResult: dto.matchResult,
        matchNote: dto.matchNote || '',
      });
      await m.save(appraisal);

      let item: Item | null = null;
      if (dto.decision === 'REJECT') {
        consignment.status = 'REJECTED';
      } else {
        consignment.status = 'APPRAISED';
        // 接受寄卖：生成商品（清洁翻新中），记录在仓或留在卖家家中
        item = m.create(Item, {
          consignmentId,
          category: consignment.category,
          title: `${consignment.brand} · ${categoryLabel(consignment.category)}`,
          description: '',
          status: 'PREPARING',
          location: dto.location === 'SELLER_HOME' ? 'SELLER_HOME' : 'WAREHOUSE',
          warehouseSlot: '',
          deliveryRadiusKm: Number(dto.deliveryRadiusKm ?? 30),
          listedPrice: price.toFixed(2),
          minDealPrice: minPrice.toFixed(2),
        });
        await m.save(item);
      }
      await m.save(consignment);

      // 描述不符立即刷新卖家画像
      const profile = await this.risk.recalculate(consignment.sellerId);

      return { appraisal, consignment, item, sellerProfile: profile };
    });
  }

  @Get('consignment/:consignmentId')
  async getByConsignment(@Param('consignmentId') consignmentId: string) {
    const appraisal = await this.ds
      .getRepository(Appraisal)
      .findOne({ where: { consignmentId } });
    if (!appraisal) throw new NotFoundException('尚无估价记录');
    return appraisal;
  }

  /** 估价师工作台：待估价列表 */
  @Roles('APPRAISER', 'OPS')
  @Get('queue/pending')
  async pendingQueue() {
    const rows = await this.ds
      .getRepository(Consignment)
      .createQueryBuilder('c')
      .leftJoin(
        Appraisal,
        'a',
        'a."consignmentId" = c.id',
      )
      .where('a.id IS NULL')
      .andWhere('c.status IN (:...sts)', {
        sts: ['SUBMITTED', 'APPRAISAL_SCHEDULED'],
      })
      .orderBy('c."verificationLevel"', 'DESC')
      .addOrderBy('c."createdAt"', 'ASC')
      .getRawAndEntities();
    return rows.entities;
  }
}

function categoryLabel(c: string) {
  return (
    {
      SOFA: '沙发',
      DINING_TABLE: '餐桌',
      KIDS_BED: '儿童床',
      BOOKCASE: '书柜',
      OFFICE_CHAIR: '办公椅',
      APPLIANCE_CABINET: '家电柜',
    } as Record<string, string>
  )[c] || c;
}

@Module({
  imports: [TypeOrmModule.forFeature([Appraisal, Consignment, Item])],
  controllers: [AppraisalController],
})
export class AppraisalModule {}
