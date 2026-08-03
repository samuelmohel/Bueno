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
}
