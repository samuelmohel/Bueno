import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats() { return this.dashboard.getStats(); }

  @Get('recent-bookings')
  recentBookings() { return this.dashboard.getRecentBookings(); }

  @Get('revenue-chart')
  revenueChart() { return this.dashboard.getRevenueChart(); }

  @Get('live-fleet')
  liveFleet() { return this.dashboard.getLiveLocomotives(); }

  @Get('reports')
  reports(@Query('period') period?: 'weekly' | 'monthly' | 'quarterly' | 'annually') {
    return this.dashboard.getPerformanceReport(period);
  }
}