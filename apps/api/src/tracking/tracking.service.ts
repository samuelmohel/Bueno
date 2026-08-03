import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from './tracking.gateway';

@Injectable()
export class TrackingService {
  constructor(
    private prisma: PrismaService,
    // forwardRef breaks the circular dependency:
    // TrackingService → TrackingGateway → TrackingService
    @Inject(forwardRef(() => TrackingGateway))
    private gateway: TrackingGateway,
  ) {}

  async getBookingTrackingInfo(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        wagonAllocations: { include: { locomotive: true }, take: 1 },
        route: true,
        events: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const locoId = booking.wagonAllocations[0]?.locoId ?? null;
    let locomotive = null;

    if (locoId) {
      locomotive = await this.prisma.locomotive.findUnique({
        where: { id: locoId },
        select: {
          id: true, serialNumber: true, model: true,
          currentLat: true, currentLng: true,
          fuelLevelPercent: true, status: true,
          assignedDriver: {
            include: { user: { select: { fullName: true, phone: true } } },
          },
        },
      });
    }

    return {
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        route: booking.route,
        wagonsRequired: booking.wagonsRequired,
        locosRequired: booking.locosRequired,
        dropOffDate: booking.dropOffDate,
        destinationContact: booking.destinationContact,
        destinationPhone: booking.destinationPhone,
      },
      locomotive,
      events: booking.events,
    };
  }

  async getLiveFleet() {
    return this.prisma.locomotive.findMany({
      where: { status: 'IN_USE' },
      select: {
        id: true, serialNumber: true, model: true,
        currentLat: true, currentLng: true,
        fuelLevelPercent: true, status: true,
        assignedDriver: {
          include: { user: { select: { fullName: true, phone: true } } },
        },
      },
    });
  }

  async getLocoLocation(id: string) {
    const loco = await this.prisma.locomotive.findUnique({
      where: { id },
      select: {
        id: true, serialNumber: true, model: true,
        currentLat: true, currentLng: true,
        status: true, fuelLevelPercent: true,
      },
    });
    if (!loco) throw new NotFoundException('Locomotive not found');
    return loco;
  }

  async getLocoHistory(id: string, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.prisma.locoLocationHistory.findMany({
      where: { locoId: id, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });
  }

  // Called by physical GPS tracker hardware or dual signal gateway
  async ingestGpsPoint(
    serialNumber: string,
    lat: number,
    lng: number,
    speed?: number,
    heading?: number,
    signalQuality = 'GPS',
  ) {
    const loco = await this.prisma.locomotive.findUnique({ where: { serialNumber } });
    if (!loco) throw new NotFoundException(`No locomotive with serial: ${serialNumber}`);

    await this.prisma.locoLocationHistory.create({
      data: { locoId: loco.id, lat, lng, speed, heading },
    });

    await this.prisma.locomotive.update({
      where: { id: loco.id },
      data: { currentLat: lat, currentLng: lng },
    });

    // Broadcast to all connected WebSocket clients with signal quality indicator
    this.gateway.broadcastLocoPosition({
      locoId: loco.id,
      serialNumber: loco.serialNumber,
      lat, lng, speed, heading,
      signalQuality,
      fuelLevelPercent: loco.fuelLevelPercent,
      status: loco.status,
    });

    return { received: true, locoId: loco.id, signalQuality };
  }

  // Simulation endpoint for Admin/Ops demo testing of train movement & signal loss
  async simulateMovement(locoId: string, lat: number, lng: number, signalQuality = 'GPS') {
    const loco = await this.prisma.locomotive.update({
      where: { id: locoId },
      data: { currentLat: lat, currentLng: lng },
    });

    await this.prisma.locoLocationHistory.create({
      data: { locoId, lat, lng, speed: 65, heading: 45 },
    });

    this.gateway.broadcastLocoPosition({
      locoId,
      serialNumber: loco.serialNumber,
      lat, lng, speed: 65, heading: 45,
      signalQuality,
      fuelLevelPercent: loco.fuelLevelPercent,
      status: loco.status,
    });

    return { success: true, locoId, lat, lng, signalQuality };
  }

  async updateLocoLocation(data: {
    locoId: string; lat: number; lng: number; speed?: number; heading?: number; signalQuality?: string;
  }) {
    const { locoId, lat, lng, speed, heading, signalQuality = 'GPS' } = data;

    const [loco] = await this.prisma.$transaction([
      this.prisma.locomotive.update({ where: { id: locoId }, data: { currentLat: lat, currentLng: lng } }),
      this.prisma.locoLocationHistory.create({ data: { locoId, lat, lng, speed, heading } }),
    ]);

    this.gateway.broadcastLocoPosition({ locoId, lat, lng, speed, heading, signalQuality, serialNumber: loco.serialNumber });
    return loco;
  }

  async getActiveBookingsForDriver(driverId: string) {
    const { BookingStatus } = await import('../common/enums');
    return this.prisma.booking.findMany({
      where: {
        bookingStatus: {
          in: [BookingStatus.WAGON_ALLOCATED, BookingStatus.LOADING_IN_PROGRESS, BookingStatus.DEPARTED, BookingStatus.IN_TRANSIT],
        },
        wagonAllocations: { some: { locomotive: { assignedDriverId: driverId } } },
      },
      include: {
        route: true, cargoType: true,
        wagonAllocations: { include: { wagon: true, locomotive: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}