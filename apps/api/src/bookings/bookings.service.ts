import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import axios from 'axios';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // ─── Quote & Calculation ──────────────────────────────────────────────────

  async calculateWagons(cargoWeightTonnes: number, cargoTypeId: string) {
    const cargoType = await this.prisma.cargoType.findUnique({
      where: { id: cargoTypeId },
    });
    if (!cargoType) throw new NotFoundException('Cargo type not found');

    const wagonsRequired = Math.ceil(
      cargoWeightTonnes / (cargoType.defaultWagonCapacityT ?? 1),
    );
    const locosRequired = Math.ceil(wagonsRequired / 20);

    return { wagonsRequired, locosRequired, cargoType, wagonCapacity: cargoType.defaultWagonCapacityT };
  }

  async getQuote(routeId: string, cargoTypeId: string, cargoWeightTonnes: number) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: {
        pricing: { where: { active: true }, orderBy: { effectiveFrom: 'desc' }, take: 1 },
      },
    });
    if (!route) throw new NotFoundException('Route not found');

    const pricing = route.pricing[0];
    if (!pricing) throw new NotFoundException('No active pricing for this route');

    const { wagonsRequired, locosRequired, cargoType, wagonCapacity } =
      await this.calculateWagons(cargoWeightTonnes, cargoTypeId);

    const subtotal = wagonsRequired * pricing.pricePerWagonNgn;
    const surcharge = subtotal * (pricing.fuelSurchargePct / 100);
    const totalAmountNgn = Math.round(subtotal + surcharge);

    return {
      route: {
        id: route.id,
        name: route.routeName,
        origin: route.originTerminal,
        destination: route.destinationTerminal,
        distanceKm: route.distanceKm,
        estimatedDurationHr: route.estimatedDurationHr,
      },
      cargoType: { id: cargoType.id, name: cargoType.name, wagonCapacity },
      wagonsRequired,
      locosRequired,
      pricing: {
        pricePerWagon: pricing.pricePerWagonNgn,
        fuelSurchargePct: pricing.fuelSurchargePct,
        subtotal,
        surcharge,
        totalAmountNgn,
      },
    };
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(customerId: string, dto: CreateBookingDto) {
    const quote = await this.getQuote(dto.routeId, dto.cargoTypeId, dto.cargoWeightTonnes);

    return this.prisma.booking.create({
      data: {
        customerId,
        routeId: dto.routeId,
        cargoTypeId: dto.cargoTypeId,
        cargoWeightTonnes: dto.cargoWeightTonnes,
        wagonsRequired: quote.wagonsRequired,
        locosRequired: quote.locosRequired,
        totalAmountNgn: quote.pricing.totalAmountNgn,
        specialInstructions: dto.specialInstructions,
        dropOffDate: dto.dropOffDate ? new Date(dto.dropOffDate) : undefined,
        destinationContact: dto.destinationContact,
        destinationPhone: dto.destinationPhone,
        bookingStatus: BookingStatus.BOOKING_CONFIRMED,
        paymentStatus: 'PENDING',
      },
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        route: true,
        cargoType: true,
      },
    });
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(query: any) {
    const { page = 1, limit = 20, status, customerId } = query;
    const where: any = {};
    if (status) where.bookingStatus = status;
    if (customerId) where.customerId = customerId;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          customer: { select: { id: true, fullName: true, email: true, phone: true } },
          route: true,
          cargoType: true,
          wagonAllocations: {
            include: {
              wagon: true,
              locomotive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  // ─── Single ───────────────────────────────────────────────────────────────

  async findByBookingCode(code: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ bookingCode: code }, { id: code }] },
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        route: true,
        cargoType: true,
        wagonAllocations: {
          include: {
            wagon: true,
            locomotive: {
              include: {
                assignedDriver: {
                  include: { user: { select: { fullName: true, phone: true } } },
                },
              },
            },
            cargoItems: {
              include: {
                loadedBy: { select: { fullName: true } },
                unloadedBy: { select: { fullName: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!booking) throw new NotFoundException(`Booking with code ${code} not found`);
    return booking;
  }

  async findById(id: string) {

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        route: true,
        cargoType: true,
        wagonAllocations: {
          include: {
            wagon: true,
            locomotive: {
              include: {
                assignedDriver: {
                  include: { user: { select: { fullName: true, phone: true } } },
                },
              },
            },
            cargoItems: {
              include: {
                loadedBy: { select: { fullName: true } },
                unloadedBy: { select: { fullName: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        events: { orderBy: { createdAt: 'desc' } },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, fullName: true, role: true } } },
          take: 50,
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // ─── Payment ──────────────────────────────────────────────────────────────

  async initializePayment(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== userId) throw new ForbiddenException('Access denied');
    if (booking.paymentStatus === 'PAID') throw new BadRequestException('Booking already paid');

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey || paystackKey.includes('your_paystack')) {
      const ref = `bueno_mock_${bookingId}_${Date.now()}`;
      await this.prisma.booking.update({ where: { id: bookingId }, data: { paystackReference: ref } });
      return { authorizationUrl: 'https://paystack.com/pay/mock', reference: ref, isDemoMode: true };
    }

    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: booking.customer.email,
        amount: Math.round(booking.totalAmountNgn * 100),
        reference: `bueno_${bookingId}_${Date.now()}`,
        metadata: { bookingId, customerId: userId },
      },
      { headers: { Authorization: `Bearer ${paystackKey}` } },
    );

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paystackReference: res.data.data.reference },
    });
    return res.data.data;
  }

  async verifyPayment(reference: string, triggeredBy?: string) {
    const booking = await this.prisma.booking.findFirst({ where: { paystackReference: reference } });
    if (!booking) throw new NotFoundException('Booking not found for reference');

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    let verified = false;

    if (!paystackKey || paystackKey.includes('your_paystack')) {
      verified = true;
    } else {
      const res = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${paystackKey}` } },
      );
      verified = res.data.data.status === 'success';
    }

    if (verified) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'PAID', bookingStatus: BookingStatus.COORDINATING, paystackVerified: true },
      });
      await this.prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          status: 'BOOKING_CONFIRMED',
          title: 'Payment confirmed',
          description: `Payment verified. Reference: ${reference}`,
          triggeredBy,
        },
      });
    }

    return { verified, bookingId: booking.id };
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    status: string,
    triggeredBy: string,
    description?: string,
    lat?: number,
    lng?: number,
  ) {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { bookingStatus: status as BookingStatus },
    });

    await this.prisma.bookingEvent.create({
      data: { bookingId: id, status, title: this.statusLabel(status), description, lat, lng, triggeredBy },
    });

    return booking;
  }

  // ─── Allocation ───────────────────────────────────────────────────────────

  async allocateWagons(
    bookingId: string,
    data: { wagonIds: string[]; locoId: string },
    allocatedBy: string,
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (data.wagonIds.length < booking.wagonsRequired) {
      throw new BadRequestException(`Need at least ${booking.wagonsRequired} wagons`);
    }

    await this.prisma.wagon.updateMany({ where: { id: { in: data.wagonIds } }, data: { status: 'IN_USE' } });
    await this.prisma.locomotive.update({ where: { id: data.locoId }, data: { status: 'IN_USE' } });

    const allocations = await Promise.all(
      data.wagonIds.map((wagonId) =>
        this.prisma.wagonAllocation.create({
          data: { bookingId, wagonId, locoId: data.locoId, allocatedBy },
        }),
      ),
    );

    await this.updateStatus(bookingId, 'WAGON_ALLOCATED', allocatedBy, `${data.wagonIds.length} wagon(s) and locomotive allocated`);
    return allocations;
  }

  // ─── Cargo Inventory (load / unload) ────────────────────────────────────────
  // Loading and unloading write to the SAME CargoItem row: loadedQty is set when
  // a cargo officer logs an item onto a wagon at origin; unloadedQty is set when
  // the destination cargo officer confirms it off the same wagon. Any gap between
  // the two is a discrepancy, visible the moment it's recorded — no separate
  // reconciliation step needed.

  async addCargoItem(
    wagonAllocationId: string,
    data: { description: string; customerRef?: string; unit?: string; loadedQty: number; notes?: string },
    loadedById: string,
  ) {
    const allocation = await this.prisma.wagonAllocation.findUnique({ where: { id: wagonAllocationId } });
    if (!allocation) throw new NotFoundException('Wagon allocation not found');

    return this.prisma.cargoItem.create({
      data: {
        wagonAllocationId,
        description: data.description,
        customerRef: data.customerRef,
        unit: data.unit ?? 'BAGS',
        loadedQty: Number(data.loadedQty),
        loadedById,
        loadedAt: new Date(),
        notes: data.notes,
      },
    });
  }

  async removeCargoItem(itemId: string) {
    const item = await this.prisma.cargoItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Cargo item not found');
    if (item.unloadedQty != null) throw new BadRequestException('Cannot remove an item that has already been unloaded');
    return this.prisma.cargoItem.delete({ where: { id: itemId } });
  }

  async unloadCargoItem(
    itemId: string,
    data: { unloadedQty: number; damaged?: boolean; notes?: string },
    unloadedById: string,
  ) {
    const item = await this.prisma.cargoItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Cargo item not found');

    return this.prisma.cargoItem.update({
      where: { id: itemId },
      data: {
        unloadedQty: Number(data.unloadedQty),
        unloadedById,
        unloadedAt: new Date(),
        damaged: data.damaged ?? false,
        notes: data.notes ?? item.notes,
      },
    });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats() {
    const [total, confirmed, inTransit, completed, revenue] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { bookingStatus: BookingStatus.BOOKING_CONFIRMED } }),
      this.prisma.booking.count({ where: { bookingStatus: BookingStatus.IN_TRANSIT } }),
      this.prisma.booking.count({ where: { bookingStatus: BookingStatus.COMPLETED } }),
      this.prisma.booking.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { totalAmountNgn: true } }),
    ]);

    return { total, confirmed, inTransit, completed, totalRevenueNgn: revenue._sum.totalAmountNgn ?? 0 };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      COORDINATING: 'Coordination started',
      WAGON_ALLOCATED: 'Wagons allocated',
      CARGO_AT_TERMINAL: 'Cargo at terminal',
      LOADING_IN_PROGRESS: 'Loading in progress',
      DEPARTED: 'Train departed',
      IN_TRANSIT: 'In transit',
      ARRIVED_DESTINATION: 'Arrived at destination',
      UNLOADING: 'Unloading cargo',
      READY_FOR_COLLECTION: 'Ready for collection',
      COMPLETED: 'Shipment completed',
      CANCELLED: 'Booking cancelled',
    };
    return map[status] ?? status;
  }
}
