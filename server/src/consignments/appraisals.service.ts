import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Appraisal,
  ConditionLevel,
  MovingDifficulty,
} from '../entities/appraisal.entity';
import {
  Consignment,
  ConsignmentStatus,
} from '../entities/consignment.entity';
import { User } from '../entities/user.entity';

export interface CreateAppraisalDto {
  consignmentId: number;
  structureCondition: ConditionLevel;
  stainLevel: ConditionLevel;
  odorLevel: ConditionLevel;
  insectDamage: boolean;
  boardDeformation: boolean;
  movingDifficulty: MovingDifficulty;
  consignmentPrice: number;
  minPrice: number;
  commissionRate: number;
  refurbishmentSuggestion?: string;
  estimatedRefurbishmentCost?: number;
  notes?: string;
  strictCheckPerformed?: boolean;
}

@Injectable()
export class AppraisalsService {
  constructor(
    @InjectRepository(Appraisal) private appraisals: Repository<Appraisal>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
  ) {}

  /** 估价师上门检查后提交估价单 */
  async create(appraiser: User, dto: CreateAppraisalDto) {
    const consignment = await this.consignments.findOne({
      where: { id: dto.consignmentId },
    });
    if (!consignment) throw new NotFoundException('寄卖申请不存在');
    if (
      ![ConsignmentStatus.PENDING_APPRAISAL, ConsignmentStatus.SCHEDULED].includes(
        consignment.status,
      )
    ) {
      throw new BadRequestException('该申请当前状态不可估价');
    }
    if (consignment.requiresStrictVerification && !dto.strictCheckPerformed) {
      throw new BadRequestException(
        '该卖家触发严格验真，必须完成逐项核验后才能提交',
      );
    }
    if (Number(dto.minPrice) > Number(dto.consignmentPrice)) {
      throw new BadRequestException('最低成交价不能高于寄卖价');
    }

    const existing = await this.appraisals.findOne({
      where: { consignmentId: dto.consignmentId },
    });
    if (existing) await this.appraisals.remove(existing);

    const appraisal = await this.appraisals.save(
      this.appraisals.create({
        consignmentId: dto.consignmentId,
        appraiserId: appraiser.id,
        structureCondition: dto.structureCondition,
        stainLevel: dto.stainLevel,
        odorLevel: dto.odorLevel,
        insectDamage: !!dto.insectDamage,
        boardDeformation: !!dto.boardDeformation,
        movingDifficulty: dto.movingDifficulty,
        consignmentPrice: dto.consignmentPrice,
        minPrice: dto.minPrice,
        commissionRate: dto.commissionRate ?? 0.15,
        refurbishmentSuggestion: dto.refurbishmentSuggestion,
        estimatedRefurbishmentCost: dto.estimatedRefurbishmentCost ?? 0,
        notes: dto.notes,
        strictCheckPerformed: !!dto.strictCheckPerformed,
      }),
    );
    consignment.status = ConsignmentStatus.APPRAISED;
    await this.consignments.save(consignment);
    return appraisal;
  }

  async findByConsignment(consignmentId: number) {
    return this.appraisals.findOne({ where: { consignmentId } });
  }
}
