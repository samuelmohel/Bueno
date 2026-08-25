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
import * as crypto from 'crypto';

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
            feederTruckLogs: { orderBy: { createdAt: 'asc' } },
            unloadAudit: {
              include: { unloadedBy: { select: { fullName: true } } },
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
            feederTruckLogs: { orderBy: { createdAt: 'asc' } },
            unloadAudit: {
              include: { unloadedBy: { select: { fullName: true } } },
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
      verified = res.data?.data?.status === 'success';
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

  async handlePaystackWebhook(signature: string, payload: any) {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (paystackKey && !paystackKey.includes('your_paystack') && signature) {
      const hash = crypto
        .createHmac('sha512', paystackKey)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest('hex');
      if (hash !== signature) {
        throw new ForbiddenException('Invalid webhook signature');
      }
    }

    if (payload?.event === 'charge.success') {
      const data = payload.data;
      const ref = data?.reference;
      const bookingId = data?.metadata?.bookingId;

      const booking = await this.prisma.booking.findFirst({
        where: {
          OR: [
            ...(bookingId ? [{ id: bookingId }] : []),
            ...(ref ? [{ paystackReference: ref }] : []),
          ],
        },
      });

      if (booking && booking.paymentStatus !== 'PAID') {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: 'PAID',
            bookingStatus: BookingStatus.COORDINATING,
            paystackVerified: true,
            paystackReference: ref || booking.paystackReference,
          },
        });
        await this.prisma.bookingEvent.create({
          data: {
            bookingId: booking.id,
            status: 'BOOKING_CONFIRMED',
            title: 'Payment confirmed via webhook',
            description: `Payment verified via Paystack Webhook. Reference: ${ref}`,
          },
        });
      }
    }

    return { status: 'success' };
  }

  // ─── Status & State Machine ───────────────────────────────────────────────

  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['BOOKING_CONFIRMED', 'CANCELLED'],
    BOOKING_CONFIRMED: ['COORDINATING', 'WAGON_ALLOCATED', 'CANCELLED'],
    COORDINATING: ['WAGON_ALLOCATED', 'CANCELLED'],
    WAGON_ALLOCATED: ['CARGO_AT_TERMINAL', 'LOADING_IN_PROGRESS', 'CANCELLED'],
    CARGO_AT_TERMINAL: ['LOADING_IN_PROGRESS', 'CANCELLED'],
    LOADING_IN_PROGRESS: ['DEPARTED', 'IN_TRANSIT', 'CANCELLED'],
    DEPARTED: ['IN_TRANSIT', 'ARRIVED_DESTINATION', 'CANCELLED'],
    IN_TRANSIT: ['ARRIVED_DESTINATION', 'CANCELLED'],
    ARRIVED_DESTINATION: ['UNLOADING', 'READY_FOR_COLLECTION'],
    UNLOADING: ['READY_FOR_COLLECTION', 'COMPLETED'],
    READY_FOR_COLLECTION: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  async updateStatus(
    id: string,
    status: string,
    triggeredBy: string,
    description?: string,
    lat?: number,
    lng?: number,
  ) {
    const current = await this.prisma.booking.findUnique({
      where: { id },
      include: { wagonAllocations: true },
    });
    if (!current) throw new NotFoundException('Booking not found');

    const allowed = BookingsService.ALLOWED_TRANSITIONS[current.bookingStatus] || [];
    if (!allowed.includes(status) && current.bookingStatus !== status) {
      throw new BadRequestException(
        `Invalid status transition from '${current.bookingStatus}' to '${status}'. Allowed next steps: ${allowed.join(', ') || 'None (Terminal state)'}`,
      );
    }

    const booking = await this.prisma.booking.update({
      where: { id },
      data: { bookingStatus: status as BookingStatus },
    });

    await this.prisma.bookingEvent.create({
      data: { bookingId: id, status, title: this.statusLabel(status), description, lat, lng, triggeredBy },
    });

    // Auto-release assets when shipment completes or cancels
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      const wagonIds = current.wagonAllocations.map((a) => a.wagonId);
      const locoIds = current.wagonAllocations.map((a) => a.locoId).filter(Boolean) as string[];

      if (wagonIds.length > 0) {
        await this.prisma.wagon.updateMany({
          where: { id: { in: wagonIds } },
          data: {
            status: 'AVAILABLE',
            ...(status === 'COMPLETED' ? { totalTrips: { increment: 1 } } : {}),
          },
        });
      }

      if (locoIds.length > 0) {
        await this.prisma.locomotive.updateMany({
          where: { id: { in: locoIds } },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return booking;
  }

  // ─── Allocation with Atomic Concurrency Checks ─────────────────────────────

  async allocateWagons(
    bookingId: string,
    data: { wagonIds: string[]; locoId: string },
    allocatedBy: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (data.wagonIds.length < booking.wagonsRequired) {
        throw new BadRequestException(`Need at least ${booking.wagonsRequired} wagons (received ${data.wagonIds.length})`);
      }

      // 1. Verify all requested wagons exist and are AVAILABLE
      const wagons = await tx.wagon.findMany({
        where: { id: { in: data.wagonIds } },
      });

      if (wagons.length !== data.wagonIds.length) {
        throw new NotFoundException('One or more selected wagons could not be found');
      }

      const unavailableWagon = wagons.find((w) => w.status !== 'AVAILABLE');
      if (unavailableWagon) {
        throw new BadRequestException(
          `Wagon ${unavailableWagon.serialNumber} is currently '${unavailableWagon.status}' and cannot be allocated.`,
        );
      }

      // 2. Verify locomotive exists and is AVAILABLE
      const loco = await tx.locomotive.findUnique({ where: { id: data.locoId } });
      if (!loco) throw new NotFoundException('Locomotive not found');
      if (loco.status !== 'AVAILABLE') {
        throw new BadRequestException(
          `Locomotive ${loco.serialNumber} is currently '${loco.status}' and cannot be allocated.`,
        );
      }

      // 3. Mark fleet assets as IN_USE
      await tx.wagon.updateMany({
        where: { id: { in: data.wagonIds } },
        data: { status: 'IN_USE' },
      });
      await tx.locomotive.update({
        where: { id: data.locoId },
        data: { status: 'IN_USE' },
      });

      // 4. Create allocations
      const allocations = await Promise.all(
        data.wagonIds.map((wagonId) =>
          tx.wagonAllocation.create({
            data: { bookingId, wagonId, locoId: data.locoId, allocatedBy },
          }),
        ),
      );

      // 5. Update booking state to WAGON_ALLOCATED
      await tx.booking.update({
        where: { id: bookingId },
        data: { bookingStatus: BookingStatus.WAGON_ALLOCATED },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId,
          status: 'WAGON_ALLOCATED',
          title: 'Wagons allocated',
          description: `${data.wagonIds.length} wagon(s) and locomotive (${loco.serialNumber}) allocated`,
          triggeredBy: allocatedBy,
        },
      });

      return allocations;
    });
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

  // ─── Feeder Truck Operations (Origin Terminal) ─────────────────────────────

  async addFeederTruckLog(
    wagonAllocationId: string,
    data: {
      truckRegNo: string;
      driverName: string;
      driverPhone: string;
      transporterName: string;
      loadingSource?: string;
      quantityLoaded: number;
      unit?: string;
      startTime?: string | Date;
      endTime?: string | Date;
    },
  ) {
    const allocation = await this.prisma.wagonAllocation.findUnique({
      where: { id: wagonAllocationId },
      include: { booking: true },
    });
    if (!allocation) throw new NotFoundException('Wagon allocation not found');

    const log = await this.prisma.feederTruckLog.create({
      data: {
        wagonAllocationId,
        truckRegNo: data.truckRegNo.toUpperCase(),
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        transporterName: data.transporterName,
        loadingSource: data.loadingSource,
        quantityLoaded: Number(data.quantityLoaded),
        unit: data.unit ?? 'BAGS',
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        endTime: data.endTime ? new Date(data.endTime) : new Date(),
      },
    });

    // Also update/sync standard CargoItem row for the allocation
    await this.prisma.cargoItem.create({
      data: {
        wagonAllocationId,
        description: `Feeder Truck: ${data.truckRegNo} (${data.transporterName})`,
        customerRef: data.truckRegNo,
        unit: data.unit ?? 'BAGS',
        loadedQty: Number(data.quantityLoaded),
        loadedAt: log.endTime || log.startTime,
        notes: `Source: ${data.loadingSource || 'General'} | Driver: ${data.driverName} (${data.driverPhone})`,
      },
    });

    return log;
  }

  async getFeederTruckLogs(wagonAllocationId: string) {
    return this.prisma.feederTruckLog.findMany({
      where: { wagonAllocationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Wagon Unload & Complaint Audit (Destination Yard) ────────────────────

  async submitWagonUnloadAudit(
    wagonAllocationId: string,
    data: {
      startTime?: string | Date;
      endTime?: string | Date;
      intactCount: number;
      damagedCount?: number;
      burstBagCount?: number;
      hasComplaint?: boolean;
      complaintType?: string;
      complaintDetails?: string;
      photoUrls?: string[] | string;
    },
    unloadedById: string,
  ) {
    const allocation = await this.prisma.wagonAllocation.findUnique({
      where: { id: wagonAllocationId },
      include: { cargoItems: true },
    });
    if (!allocation) throw new NotFoundException('Wagon allocation not found');

    const photos = Array.isArray(data.photoUrls) ? JSON.stringify(data.photoUrls) : data.photoUrls;

    const audit = await this.prisma.wagonUnloadAudit.upsert({
      where: { wagonAllocationId },
      update: {
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        endTime: data.endTime ? new Date(data.endTime) : new Date(),
        intactCount: Number(data.intactCount || 0),
        damagedCount: Number(data.damagedCount || 0),
        burstBagCount: Number(data.burstBagCount || 0),
        hasComplaint: data.hasComplaint ?? false,
        complaintType: data.complaintType,
        complaintDetails: data.complaintDetails,
        photoUrls: photos,
        unloadedById,
      },
      create: {
        wagonAllocationId,
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        endTime: data.endTime ? new Date(data.endTime) : new Date(),
        intactCount: Number(data.intactCount || 0),
        damagedCount: Number(data.damagedCount || 0),
        burstBagCount: Number(data.burstBagCount || 0),
        hasComplaint: data.hasComplaint ?? false,
        complaintType: data.complaintType,
        complaintDetails: data.complaintDetails,
        photoUrls: photos,
        unloadedById,
      },
    });

    // Automatically update the wagon's CargoItem rows
    const totalReceived = Number(data.intactCount || 0) + Number(data.damagedCount || 0) + Number(data.burstBagCount || 0);
    const hasDamage = Number(data.damagedCount || 0) > 0 || Number(data.burstBagCount || 0) > 0;

    for (const item of allocation.cargoItems) {
      await this.prisma.cargoItem.update({
        where: { id: item.id },
        data: {
          unloadedQty: totalReceived > 0 ? totalReceived : item.loadedQty,
          unloadedById,
          unloadedAt: new Date(),
          damaged: hasDamage,
          notes: data.burstBagCount ? `${data.burstBagCount} burst bag(s) recorded. ${data.complaintDetails || ''}` : data.complaintDetails || item.notes,
        },
      });
    }

    return audit;
  }

  async getWagonUnloadAudit(wagonAllocationId: string) {
    return this.prisma.wagonUnloadAudit.findUnique({
      where: { wagonAllocationId },
      include: { unloadedBy: { select: { fullName: true, email: true } } },
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
