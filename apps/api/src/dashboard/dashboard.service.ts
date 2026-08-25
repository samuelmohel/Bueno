import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '../common/enums';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.BOOKING_CONFIRMED,
  BookingStatus.COORDINATING,
  BookingStatus.WAGON_ALLOCATED,
  BookingStatus.CARGO_AT_TERMINAL,
  BookingStatus.LOADING_IN_PROGRESS,
  BookingStatus.DEPARTED,
  BookingStatus.IN_TRANSIT,
  BookingStatus.ARRIVED_DESTINATION,
  BookingStatus.UNLOADING,
  BookingStatus.READY_FOR_COLLECTION,
];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalBookings, activeBookings, completedBookings, cancelledBookings,
      totalWagons, availableWagons, inUseWagons, maintenanceWagons,
      totalLocos, availableLocos, inUseLocos,
      activeRoutes,
      monthlyRevenue, todayRevenue, totalRevenue,
    ] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { bookingStatus: { in: ACTIVE_STATUSES } } }),
      this.prisma.booking.count({ where: { bookingStatus: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { bookingStatus: BookingStatus.CANCELLED } }),

      this.prisma.wagon.count(),
      this.prisma.wagon.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.wagon.count({ where: { status: 'IN_USE' } }),
      this.prisma.wagon.count({ where: { status: 'MAINTENANCE' } }),

      this.prisma.locomotive.count(),
      this.prisma.locomotive.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.locomotive.count({ where: { status: 'IN_USE' } }),

      this.prisma.route.count({ where: { active: true } }),

      this.prisma.booking.aggregate({
        where: { paymentStatus: 'PAID', createdAt: { gte: monthStart } },
        _sum: { totalAmountNgn: true },
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'PAID', createdAt: { gte: todayStart } },
        _sum: { totalAmountNgn: true },
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { totalAmountNgn: true },
      }),
    ]);

    return {
      bookings: { total: totalBookings, active: activeBookings, completed: completedBookings, cancelled: cancelledBookings },
      wagons: { total: totalWagons, available: availableWagons, inUse: inUseWagons, maintenance: maintenanceWagons },
      locomotives: { total: totalLocos, available: availableLocos, inUse: inUseLocos },
      routes: { active: activeRoutes },
      revenue: {
        total: totalRevenue._sum.totalAmountNgn ?? 0,
        monthly: monthlyRevenue._sum.totalAmountNgn ?? 0,
        today: todayRevenue._sum.totalAmountNgn ?? 0,
      },
    };
  }

  async getRecentBookings() {
    return this.prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { fullName: true, email: true } },
        route: { select: { routeName: true, originTerminal: true, destinationTerminal: true } },
        cargoType: { select: { name: true } },
      },
    });
  }

  async getRevenueChart() {
    // Last 7 days revenue grouped by day
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return new Date(d.setHours(0, 0, 0, 0));
    });

    const results = await Promise.all(
      days.map(async (dayStart) => {
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const agg = await this.prisma.booking.aggregate({
          where: { paymentStatus: 'PAID', createdAt: { gte: dayStart, lte: dayEnd } },
          _sum: { totalAmountNgn: true },
        });

        return {
          date: dayStart.toISOString().split('T')[0],
          label: dayStart.toLocaleDateString('en-NG', { weekday: 'short' }),
          revenue: agg._sum.totalAmountNgn ?? 0,
        };
      }),
    );

    return results;
  }

  async getLiveLocomotives() {
    return this.prisma.locomotive.findMany({
      where: { status: 'IN_USE', currentLat: { not: null }, currentLng: { not: null } },
      select: {
        id: true, serialNumber: true, model: true,
        currentLat: true, currentLng: true,
        fuelLevelPercent: true, status: true,
        assignedDriver: { include: { user: { select: { fullName: true, phone: true } } } },
        allocations: {
          where: { arrivedAt: null },
          take: 1,
          include: { booking: { select: { id: true, bookingCode: true, bookingStatus: true, route: true } } },
        },
      },
    });
  }

  // ─── Multi-Period Executive BI Reporting Engine (Mr. Niyi Spec) ───────────

  async getPerformanceReport(period: 'weekly' | 'monthly' | 'quarterly' | 'annually' = 'monthly') {
    const now = new Date();
    let startDate: Date;
    let intervals: { label: string; start: Date; end: Date }[] = [];

    if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      for (let i = 6; i >= 0; i--) {
        const s = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        s.setHours(0, 0, 0, 0);
        const e = new Date(s);
        e.setHours(23, 59, 59, 999);
        intervals.push({ label: s.toLocaleDateString('en-NG', { weekday: 'short', month: 'numeric', day: 'numeric' }), start: s, end: e });
      }
    } else if (period === 'quarterly') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        intervals.push({ label: d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }), start: d, end: e });
      }
    } else if (period === 'annually') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        intervals.push({ label: d.toLocaleDateString('en-NG', { month: 'short' }), start: d, end: e });
      }
    } else {
      // Default: Monthly (last 4 weeks)
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      for (let i = 3; i >= 0; i--) {
        const s = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const e = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        intervals.push({ label: `Wk ${4 - i}`, start: s, end: e });
      }
    }

    const [
      bookings,
      completedTrips,
      paidRevenueAgg,
      pendingRevenueAgg,
      fuelCostsAgg,
      unloadAudits,
      totalWagons,
      inUseWagons,
    ] = await Promise.all([
      this.prisma.booking.findMany({
        where: { createdAt: { gte: startDate } },
        include: { route: true, cargoType: true },
      }),
      this.prisma.booking.count({
        where: { bookingStatus: BookingStatus.COMPLETED, createdAt: { gte: startDate } },
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'PAID', createdAt: { gte: startDate } },
        _sum: { totalAmountNgn: true },
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'PENDING', createdAt: { gte: startDate } },
        _sum: { totalAmountNgn: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { loggedAt: { gte: startDate } },
        _sum: { costNgn: true, litresAdded: true },
      }),
      this.prisma.wagonUnloadAudit.findMany({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.wagon.count(),
      this.prisma.wagon.count({ where: { status: 'IN_USE' } }),
    ]);

    // Operational summary calculations
    const totalTrainsRun = bookings.length;
    const totalTonnageHauled = bookings.reduce((sum, b) => sum + (b.cargoWeightTonnes || 0), 0);
    const grossFreightRevenue = paidRevenueAgg._sum.totalAmountNgn ?? 0;
    const pendingReceivables = pendingRevenueAgg._sum.totalAmountNgn ?? 0;
    const totalFuelCost = fuelCostsAgg._sum.costNgn ?? 0;
    const totalLitresFuel = fuelCostsAgg._sum.litresAdded ?? 0;
    const netFreightMargin = grossFreightRevenue - totalFuelCost;
    const marginPercentage = grossFreightRevenue > 0 ? ((netFreightMargin / grossFreightRevenue) * 100).toFixed(1) : '0.0';

    // Quality / Loss calculations
    let totalIntact = 0;
    let totalBurstBags = 0;
    let totalDamaged = 0;
    let totalComplaints = 0;

    unloadAudits.forEach((a) => {
      totalIntact += a.intactCount;
      totalBurstBags += a.burstBagCount;
      totalDamaged += a.damagedCount;
      if (a.hasComplaint) totalComplaints++;
    });

    const totalAuditedBags = totalIntact + totalBurstBags + totalDamaged;
    const burstDefectRate = totalAuditedBags > 0 ? ((totalBurstBags / totalAuditedBags) * 100).toFixed(2) : '0.00';
    const wagonUtilizationRate = totalWagons > 0 ? ((inUseWagons / totalWagons) * 100).toFixed(1) : '0.0';

    // Time-series breakdown
    const timeSeries = await Promise.all(
      intervals.map(async (int) => {
        const [intBookings, intPaidRev, intFuel] = await Promise.all([
          this.prisma.booking.findMany({
            where: { createdAt: { gte: int.start, lte: int.end } },
            select: { cargoWeightTonnes: true, bookingStatus: true },
          }),
          this.prisma.booking.aggregate({
            where: { paymentStatus: 'PAID', createdAt: { gte: int.start, lte: int.end } },
            _sum: { totalAmountNgn: true },
          }),
          this.prisma.fuelLog.aggregate({
            where: { loggedAt: { gte: int.start, lte: int.end } },
            _sum: { costNgn: true },
          }),
        ]);

        return {
          label: int.label,
          trains: intBookings.length,
          tonnage: intBookings.reduce((s, b) => s + (b.cargoWeightTonnes || 0), 0),
          revenue: intPaidRev._sum.totalAmountNgn ?? 0,
          fuelCost: intFuel._sum.costNgn ?? 0,
        };
      }),
    );

    // Terminal / Station breakdown
    const stationStats: Record<string, { trains: number; tonnage: number; revenue: number }> = {
      'Ewekoro Terminal': { trains: 0, tonnage: 0, revenue: 0 },
      'Moniya Dry Port': { trains: 0, tonnage: 0, revenue: 0 },
      'Papalanto Siding': { trains: 0, tonnage: 0, revenue: 0 },
    };

    bookings.forEach((b) => {
      const orig = b.route?.originTerminal || 'Other';
      if (!stationStats[orig]) {
        stationStats[orig] = { trains: 0, tonnage: 0, revenue: 0 };
      }
      stationStats[orig].trains += 1;
      stationStats[orig].tonnage += b.cargoWeightTonnes || 0;
      if (b.paymentStatus === 'PAID') {
        stationStats[orig].revenue += b.totalAmountNgn || 0;
      }
    });

    return {
      period,
      timeframe: { start: startDate, end: now },
      operational: {
        totalTrainsRun,
        completedTrips,
        totalTonnageHauled,
        wagonUtilizationRate: `${wagonUtilizationRate}%`,
        totalAuditedBags,
        totalBurstBags,
        burstDefectRate: `${burstDefectRate}%`,
        wagonComplaints: totalComplaints,
      },
      financial: {
        grossFreightRevenue,
        totalFuelCost,
        netFreightMargin,
        marginPercentage: `${marginPercentage}%`,
        pendingReceivables,
        totalLitresFuel,
      },
      timeSeries,
      stationStats,
    };
  }
}
