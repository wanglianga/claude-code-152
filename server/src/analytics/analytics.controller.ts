import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/decorators';
import { UserRole } from '../entities/user.entity';

@Controller('analytics')
@Roles(UserRole.OPERATIONS)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('categories')
  categories() {
    return this.analyticsService.categoryStats();
  }

  @Get('sellers')
  sellers() {
    return this.analyticsService.sellerRiskList();
  }

  @Get('overview')
  overview() {
    return this.analyticsService.overview();
  }
}
