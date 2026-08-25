import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Budgets & Officer KPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budget')
export class BudgetController {
  constructor(private readonly budget: BudgetService) {}

  @Get('yearly')
  @ApiOperation({ summary: 'Get 12-month terminal budget vs actual operational performance matrix' })
  getYearlyBudgets(@Query('year') year?: number) {
    return this.budget.getYearlyBudgets(year);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post('terminal')
  @ApiOperation({ summary: 'Set or update monthly budget targets for a terminal station' })
  setTerminalBudget(@Body() body: any) {
    return this.budget.setTerminalBudget(body);
  }

  @Get('scorecards')
  @ApiOperation({ summary: 'Get Cargo Officer performance scorecards and monthly ratings' })
  getOfficerScorecards(@Query('year') year?: number, @Query('month') month?: number) {
    return this.budget.getOfficerScorecards(year, month);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post('officer-targets')
  @ApiOperation({ summary: 'Assign or adjust monthly train loading target for a Cargo Officer' })
  assignOfficerTarget(@Body() body: any) {
    return this.budget.assignOfficerTarget(body);
  }
}
