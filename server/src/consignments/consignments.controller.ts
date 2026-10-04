import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ConsignmentsService, CreateConsignmentDto } from './consignments.service';
import { AppraisalsService, CreateAppraisalDto } from './appraisals.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { UserRole } from '../entities/user.entity';
import { ConsignmentStatus } from '../entities/consignment.entity';
import { LocationType } from '../entities/item.entity';

@Controller('consignments')
export class ConsignmentsController {
  constructor(
    private consignmentsService: ConsignmentsService,
    private appraisalsService: AppraisalsService,
  ) {}

  @Post()
  @Roles(UserRole.SELLER)
  create(@CurrentUser() user: any, @Body() dto: CreateConsignmentDto) {
    return this.consignmentsService.create(
      { id: user.sub } as any,
      dto,
    );
  }

  @Get('mine')
  @Roles(UserRole.SELLER)
  mine(@CurrentUser() user: any) {
    return this.consignmentsService.findMine(user.sub);
  }

  @Get('risk/mine')
  @Roles(UserRole.SELLER)
  myRisk(@CurrentUser() user: any) {
    return this.consignmentsService.sellerRisk(user.sub);
  }

  @Get()
  @Roles(
    UserRole.APPRAISER,
    UserRole.CUSTOMER_SERVICE,
    UserRole.OPERATIONS,
    UserRole.WAREHOUSE,
  )
  list(@Query('status') status?: ConsignmentStatus) {
    return this.consignmentsService.findAll(status);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.consignmentsService.findOne(Number(id));
  }

  @Post(':id/schedule')
  @Roles(UserRole.APPRAISER)
  schedule(@Param('id') id: string, @Body() body: { appointmentAt: string }) {
    return this.consignmentsService.schedule(
      Number(id),
      new Date(body.appointmentAt),
    );
  }

  @Post(':id/accept')
  @Roles(UserRole.SELLER)
  accept(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { locationType: LocationType },
  ) {
    return this.consignmentsService.accept(
      Number(id),
      { id: user.sub } as any,
      body.locationType || LocationType.WAREHOUSE,
    );
  }

  @Post(':id/reject')
  @Roles(UserRole.SELLER)
  reject(@CurrentUser() user: any, @Param('id') id: string) {
    return this.consignmentsService.reject(Number(id), { id: user.sub } as any);
  }

  @Post(':id/regret')
  @Roles(UserRole.SELLER)
  regret(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.consignmentsService.regret(
      Number(id),
      { id: user.sub } as any,
      body?.reason,
    );
  }
}

@Controller('appraisals')
export class AppraisalsController {
  constructor(private appraisalsService: AppraisalsService) {}

  @Post()
  @Roles(UserRole.APPRAISER)
  create(@CurrentUser() user: any, @Body() dto: CreateAppraisalDto) {
    return this.appraisalsService.create({ id: user.sub } as any, dto);
  }

  @Get('consignment/:id')
  byConsignment(@Param('id') id: string) {
    return this.appraisalsService.findByConsignment(Number(id));
  }
}
