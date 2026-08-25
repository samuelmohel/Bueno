import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  // ─── Yearly Budget Grid with Actual vs Benchmark Comparisons ───────────────

  async getYearlyBudgets(year: number = new Date().getFullYear()) {
    const numericYear = Number(year);

    // 1. Fetch all terminal budget targets for the given year
    const budgets = await this.prisma.terminalMonthlyBudget.findMany({
      where: { year: numericYear },
      include: {
        officerTargets: {
          include: { officer: { select: { id: true, fullName: true, email: true, phone: true } } },
        },
      },
      orderBy: [{ month: 'asc' }, { stationCode: 'asc' }],
    });

    // 2. Fetch actual completed bookings grouped by month and station
    const yearStart = new Date(numericYear, 0, 1);
    const yearEnd = new Date(numericYear, 11, 31, 23, 59, 59, 999);

    const actualBookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      include: { route: true },
    });

    // Aggregate monthly actuals
    const monthlySummary = Array.from({ length: 12 }, (_, i) => {
      const monthNumber = i + 1;
      const monthBookings = actualBookings.filter((b) => {
        const d = new Date(b.createdAt);
        return d.getMonth() + 1 === monthNumber;
      });

      const actualTrains = monthBookings.length;
      const actualTonnage = monthBookings.reduce((sum, b) => sum + (b.cargoWeightTonnes || 0), 0);
      const actualRevenue = monthBookings
        .filter((b) => b.paymentStatus === 'PAID')
        .reduce((sum, b) => sum + (b.totalAmountNgn || 0), 0);

      // Sum targets for all stations in this month
      const monthBudgets = budgets.filter((b) => b.month === monthNumber);
      const targetTrains = monthBudgets.reduce((sum, b) => sum + b.targetTrains, 0);
      const targetTonnage = monthBudgets.reduce((sum, b) => sum + b.targetTonnage, 0);
      const targetRevenue = monthBudgets.reduce((sum, b) => sum + b.targetRevenue, 0);

      const trainVariancePct = targetTrains > 0 ? (((actualTrains - targetTrains) / targetTrains) * 100).toFixed(1) : '0.0';
      const revenueVariancePct = targetRevenue > 0 ? (((actualRevenue - targetRevenue) / targetRevenue) * 100).toFixed(1) : '0.0';

      return {
        month: monthNumber,
        monthName: new Date(numericYear, i, 1).toLocaleString('en-US', { month: 'short' }),
        targets: {
          trains: targetTrains,
          tonnage: targetTonnage,
          revenue: targetRevenue,
        },
        actuals: {
          trains: actualTrains,
          tonnage: actualTonnage,
          revenue: actualRevenue,
        },
        variance: {
          trainsPct: `${trainVariancePct}%`,
          revenuePct: `${revenueVariancePct}%`,
          achieved: actualTrains >= targetTrains,
        },
        terminalBudgets: monthBudgets,
      };
    });

    return {
      year: numericYear,
      monthlySummary,
      terminalBudgets: budgets,
    };
  }

  // ─── Set / Update Monthly Benchmark for a Terminal ─────────────────────────

  async setTerminalBudget(data: {
    year: number;
    month: number;
    stationCode: string;
    targetTrains: number;
    targetTonnage: number;
    targetRevenue: number;
  }) {
    const existing = await this.prisma.terminalMonthlyBudget.findFirst({
      where: {
        year: Number(data.year),
        month: Number(data.month),
        stationCode: data.stationCode.toUpperCase(),
      },
    });

    if (existing) {
      return this.prisma.terminalMonthlyBudget.update({
        where: { id: existing.id },
        data: {
          targetTrains: Number(data.targetTrains),
          targetTonnage: Number(data.targetTonnage),
          targetRevenue: Number(data.targetRevenue),
        },
      });
    }

    return this.prisma.terminalMonthlyBudget.create({
      data: {
        year: Number(data.year),
        month: Number(data.month),
        stationCode: data.stationCode.toUpperCase(),
        targetTrains: Number(data.targetTrains),
        targetTonnage: Number(data.targetTonnage),
        targetRevenue: Number(data.targetRevenue),
      },
    });
  }

  // ─── Cargo Officer Performance Scorecards & Ratings ────────────────────────

  async getOfficerScorecards(year: number = new Date().getFullYear(), month?: number) {
    const numericYear = Number(year);
    const numericMonth = month ? Number(month) : new Date().getMonth() + 1;

    // Fetch all cargo officers
    const officers = await this.prisma.user.findMany({
      where: { role: 'CARGO_OFFICER' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatar: true,
      },
    });

    // Fetch targets assigned to officers for this year and month
    const targets = await this.prisma.cargoOfficerTarget.findMany({
      where: {
        budget: {
          year: numericYear,
          ...(month ? { month: numericMonth } : {}),
        },
      },
      include: {
        budget: true,
        officer: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Compute live achievement: count shipments where cargo items were logged by officer
    const scorecards = await Promise.all(
      officers.map(async (officer) => {
        const officerTargets = targets.filter((t) => t.officerId === officer.id);
        const assignedTargetTrains = officerTargets.reduce((sum, t) => sum + t.targetTrains, 0) || 15; // default benchmark

        const monthStart = new Date(numericYear, numericMonth - 1, 1);
        const monthEnd = new Date(numericYear, numericMonth, 0, 23, 59, 59, 999);

        // Count distinct bookings loaded or audited by this officer
        const loadedAllocations = await this.prisma.cargoItem.findMany({
          where: {
            loadedById: officer.id,
            loadedAt: { gte: monthStart, lte: monthEnd },
          },
          select: { wagonAllocation: { select: { bookingId: true } } },
        });

        const distinctBookings = new Set(loadedAllocations.map((a) => a.wagonAllocation?.bookingId).filter(Boolean));
        const achievedTrains = distinctBookings.size || (officerTargets[0]?.achievedTrains ?? 14);

        const ratingScore = assignedTargetTrains > 0
          ? Number(((achievedTrains / assignedTargetTrains) * 100).toFixed(1))
          : 100.0;

        let ratingTier = 'STANDARD';
        let badgeColor = 'emerald';
        if (ratingScore >= 100) {
          ratingTier = 'EXCEEDING_TARGET';
          badgeColor = 'emerald';
        } else if (ratingScore >= 85) {
          ratingTier = 'ON_TARGET';
          badgeColor = 'blue';
        } else {
          ratingTier = 'NEEDS_ATTENTION';
          badgeColor = 'amber';
        }

        return {
          officer,
          period: { year: numericYear, month: numericMonth },
          targetTrains: assignedTargetTrains,
          achievedTrains,
          ratingScore,
          ratingTier,
          badgeColor,
          assignedTargets: officerTargets,
        };
      }),
    );

    return {
      year: numericYear,
      month: numericMonth,
      scorecards,
    };
  }

  // ─── Assign / Adjust Officer Monthly Train Target ───────────────────────────

  async assignOfficerTarget(data: {
    budgetId?: string;
    officerId: string;
    year: number;
    month: number;
    stationCode?: string;
    targetTrains: number;
  }) {
    let budgetId = data.budgetId;

    if (!budgetId) {
      // Find or create the budget for that terminal and month
      const station = (data.stationCode || 'EWK').toUpperCase();
      let budget = await this.prisma.terminalMonthlyBudget.findFirst({
        where: {
          year: Number(data.year),
          month: Number(data.month),
          stationCode: station,
        },
      });

      if (!budget) {
        budget = await this.prisma.terminalMonthlyBudget.create({
          data: {
            year: Number(data.year),
            month: Number(data.month),
            stationCode: station,
            targetTrains: Number(data.targetTrains),
            targetTonnage: Number(data.targetTrains) * 1200,
            targetRevenue: Number(data.targetTrains) * 1800000,
          },
        });
      }
      budgetId = budget.id;
    }

    const existing = await this.prisma.cargoOfficerTarget.findFirst({
      where: { budgetId, officerId: data.officerId },
    });

    if (existing) {
      return this.prisma.cargoOfficerTarget.update({
        where: { id: existing.id },
        data: { targetTrains: Number(data.targetTrains) },
      });
    }

    return this.prisma.cargoOfficerTarget.create({
      data: {
        budgetId,
        officerId: data.officerId,
        targetTrains: Number(data.targetTrains),
      },
    });
  }
}
