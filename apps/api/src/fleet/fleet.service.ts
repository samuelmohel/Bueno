import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FleetService {
  constructor(private prisma: PrismaService) {}

  // ─── Wagons ───────────────────────────────────────────────────────────────

  async findWagons(query: any) {
    const { status, wagonType } = query;
    const where: any = {};
    if (status) where.status = status;
    if (wagonType) where.wagonType = wagonType;

    return this.prisma.wagon.findMany({
      where,
      orderBy: { serialNumber: 'asc' },
      include: {
        allocations: {
          // FIX: arrivedAt now exists in schema after migration
          where: { arrivedAt: null },
          take: 1,
          include: {
            // FIX: capital "Locomotive" matches schema relation name
            locomotive: true,
          },
        },
      },
    });
  }

  async findWagonById(id: string) {
    return this.prisma.wagon.findUniqueOrThrow({
      where: { id },
      include: {
        allocations: {
          // FIX: capital "Locomotive"
          include: { locomotive: true },
          take: 10,
          orderBy: { allocatedAt: 'desc' },
        },
        inspections: { take: 5, orderBy: { inspectedAt: 'desc' } },
      },
    });
  }

  // FIX: controller calls getWagonStats() — added
  async getWagonStats() {
    const [total, available, inUse, maintenance] = await Promise.all([
      this.prisma.wagon.count(),
      this.prisma.wagon.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.wagon.count({ where: { status: 'IN_USE' } }),
      this.prisma.wagon.count({ where: { status: 'MAINTENANCE' } }),
    ]);
    return { total, available, inUse, maintenance };
  }

  async createWagon(data: any) {
    return this.prisma.wagon.create({
      data: {
        ...data,
        capacityTonnes: Number(data.capacityTonnes),
        manufactureYear: Number(data.manufactureYear),
    },
  });

  }

  async updateWagon(id: string, data: any) {
    return this.prisma.wagon.update({
      where: { id },
      data: {
        ...data,
        ...(data.capacityTonnes !== undefined && {
          capacityTonnes: Number(data.capacityTonnes),
       }),
        ...(data.manufactureYear !== undefined && {
        manufactureYear: Number(data.manufactureYear),
      }),
    },
  });
}

  // ─── Locomotives ──────────────────────────────────────────────────────────
  // FIX: controller calls findLocos() / findLocoById() / createLoco() / updateLoco()
  // — renamed from findLocomotives / findLocomotiveById / createLocomotive / updateLocomotive

  async findLocos(query: any) {
    const { status } = query;
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.locomotive.findMany({
      where,
      orderBy: { serialNumber: 'asc' },
      include: {
        // FIX: "assignedDriver" not "driver" — matches schema relation name
        assignedDriver: {
          include: { user: { select: { fullName: true, phone: true } } },
        },
      },
    });
  }

  async findLocoById(id: string) {
    return this.prisma.locomotive.findUniqueOrThrow({
      where: { id },
      include: {
        // FIX: "assignedDriver" not "driver"
        assignedDriver: { include: { user: true } },
        inspections: { take: 5, orderBy: { inspectedAt: 'desc' } },
        fuelLogs: { take: 10, orderBy: { loggedAt: 'desc' } },
      },
    });
  }

  async createLoco(data: any) {
    return this.prisma.locomotive.create({ data });
  }

  async updateLoco(id: string, data: any) {
    return this.prisma.locomotive.update({ where: { id }, data });
  }

  // ─── Inspections ──────────────────────────────────────────────────────────
  // FIX: controller calls createInspection({ ...body, inspectedBy: user.id })
  // with ONE argument — inspectedBy comes from inside the data object

  async createInspection(data: any) {
    const { inspectedBy, assetType, assetId, ...rest } = data;
    const lastInspectedAt = new Date();
    const isWagon = assetType === 'WAGON';

    // Validate the asset exists
    if (isWagon) {
      const wagon = await this.prisma.wagon.findUnique({ where: { id: assetId } });
      if (!wagon) throw new NotFoundException('Wagon not found');
    } else {
      const loco = await this.prisma.locomotive.findUnique({ where: { id: assetId } });
      if (!loco) throw new NotFoundException('Locomotive not found');
    }

    // FIX: Inspection uses wagonId/locoId FKs, not a generic assetId string
    const inspection = await this.prisma.inspection.create({
      data: {
        assetType,
        wagonId: isWagon ? assetId : undefined,
        locoId: isWagon ? undefined : assetId,
        inspectedBy: inspectedBy ?? null,
        checklistJson: rest.checklistJson ? JSON.stringify(rest.checklistJson) : undefined,
        passed: rest.passed,
        issuesFound: rest.issuesFound ?? null,
      },
    });

    // FIX: lastInspectedAt now exists on both models in the schema
    if (isWagon) {
      await this.prisma.wagon.update({ where: { id: assetId }, data: { lastInspectedAt } });
    } else {
      await this.prisma.locomotive.update({ where: { id: assetId }, data: { lastInspectedAt } });
    }

    return inspection;
  }

  async findInspections(query: any) {
    const { assetType, assetId, take = 20 } = query;
    const where: any = {};
    if (assetType) where.assetType = assetType;
    if (assetId && assetType === 'WAGON') where.wagonId = assetId;
    if (assetId && assetType === 'LOCOMOTIVE') where.locoId = assetId;
    return this.prisma.inspection.findMany({
      where,
      orderBy: { inspectedAt: 'desc' },
      take: Number(take),
    });
  }

  // ─── Fuel Logs ────────────────────────────────────────────────────────────
  // FIX: controller calls addFuelLog(id, user.id, body) — renamed from logFuel,
  // arg order changed to (locoId, loggedBy, data)

  async addFuelLog(locoId: string, loggedBy: string, data: any) {
    const loco = await this.prisma.locomotive.findUnique({ where: { id: locoId } });
    if (!loco) throw new NotFoundException('Locomotive not found');

    const [fuelLog] = await this.prisma.$transaction([
      this.prisma.fuelLog.create({
        data: {
          locoId,
          // FIX: loggedBy now exists in schema after migration
          loggedBy,
          litresAdded: data.litresAdded,
          costNgn: data.costNgn,
          fuelLevelBefore: loco.fuelLevelPercent,
          fuelLevelAfter: data.fuelLevelAfter,
          notes: data.notes ?? null,
        },
      }),
      this.prisma.locomotive.update({
        where: { id: locoId },
        data: {
          fuelLevelPercent: Math.min(100, Math.round(data.fuelLevelAfter)),
          lastFuelledAt: new Date(),
        },
      }),
    ]);

    return fuelLog;
  }

  async getFuelLogs(locoId: string, take = 20) {
    return this.prisma.fuelLog.findMany({
      where: { locoId },
      orderBy: { loggedAt: 'desc' },
      take: Number(take),
    });
  }
}
