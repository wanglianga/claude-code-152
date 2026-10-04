import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { IssuesService } from './issues.service';
import { IssueResolutionService } from './issue-resolution.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { User, UserRole } from '../entities/user.entity';
import {
  IssueType,
  IssueStatus,
  CompensationBearer,
} from '../entities/issue.entity';
import { Order } from '../entities/order.entity';
import { Consignment } from '../entities/consignment.entity';
import { FurnitureItem } from '../entities/item.entity';

class RaiseIssueDto {
  @IsNotEmpty({ message: '请选择问题类型' })
  type: IssueType;

  orderId?: number;
  consignmentId?: number;
  itemId?: number;

  @IsNotEmpty({ message: '请填写问题描述' })
  description: string;
}

class ResolveDto {
  @IsNotEmpty({ message: '请填写处理结论' })
  resolution: string;

  @IsNotEmpty({ message: '请选择处置动作' })
  action: string;

  compensationAmount?: number;
  compensationBearer?: CompensationBearer;
}

@Controller('issues')
export class IssuesController {
  constructor(
    private issuesService: IssuesService,
    private resolutionService: IssueResolutionService,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(Consignment) private consignments: Repository<Consignment>,
    @InjectRepository(FurnitureItem) private items: Repository<FurnitureItem>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  @Get()
  @Roles(UserRole.CUSTOMER_SERVICE, UserRole.OPERATIONS)
  list(@Query('status') status?: IssueStatus, @Query('type') type?: IssueType) {
    return this.issuesService.findAll(status, type);
  }

  @Get('mine')
  mine(@CurrentUser() user: any) {
    return this.issuesService
      .findAll()
      .then((list) => list.filter((i) => i.raisedById === user.sub));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.issuesService.findOne(Number(id));
  }

  /** 买家/卖家围绕自己相关的家具发起异常 */
  @Post()
  async raise(@CurrentUser() user: any, @Body() dto: RaiseIssueDto) {
    let consignmentId = dto.consignmentId;
    let itemId = dto.itemId ?? null;
    let orderId = dto.orderId ?? null;

    if (dto.orderId) {
      const order = await this.orders.findOne({ where: { id: dto.orderId } });
      if (!order) throw new BadRequestException('订单不存在');
      if (user.role === UserRole.BUYER && order.buyerId !== user.sub) {
        throw new ForbiddenException('只能对自己的订单发起售后');
      }
      const item = await this.items.findOne({ where: { id: order.itemId } });
      itemId = item.id;
      consignmentId = item.consignmentId;
    }
    if (!consignmentId) throw new BadRequestException('缺少关联寄卖单');
    const consignment = await this.consignments.findOne({
      where: { id: consignmentId },
    });
    if (!consignment) throw new BadRequestException('寄卖单不存在');
    if (user.role === UserRole.SELLER && consignment.sellerId !== user.sub) {
      throw new ForbiddenException('只能对自己的寄卖单发起');
    }
    if (!itemId) {
      const item = await this.items.findOne({
        where: { consignmentId: consignment.id },
      });
      itemId = item?.id ?? null;
    }

    const fullUser = await this.users.findOne({ where: { id: user.sub } });
    return this.issuesService.raise({
      type: dto.type,
      consignmentId,
      itemId,
      orderId,
      raisedBy: fullUser,
      description: dto.description,
    });
  }

  @Post(':id/claim')
  @Roles(UserRole.CUSTOMER_SERVICE)
  async claim(@CurrentUser() user: any, @Param('id') id: string) {
    const fullUser = await this.users.findOne({ where: { id: user.sub } });
    return this.issuesService.claim(Number(id), fullUser);
  }

  @Post(':id/progress')
  @Roles(UserRole.CUSTOMER_SERVICE, UserRole.OPERATIONS)
  async progress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { note: string },
  ) {
    const fullUser = await this.users.findOne({ where: { id: user.sub } });
    return this.issuesService.progress(Number(id), fullUser, body.note);
  }

  @Post(':id/resolve')
  @Roles(UserRole.CUSTOMER_SERVICE)
  async resolve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ResolveDto,
  ) {
    const fullUser = await this.users.findOne({ where: { id: user.sub } });
    return this.resolutionService.resolve(Number(id), fullUser, dto);
  }
}
