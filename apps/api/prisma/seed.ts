import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import {
  UserRole,
  WagonType,
  AssetStatus,
  AssetCondition,
  BookingStatus,
  PaymentStatus,
  CargoUnit,
} from '../src/common/enums';

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hash(pw, 12);
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

async function main() {
  console.log('🌱 Seeding Bueno Logistics database...\n');

  // ── Users ──────────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bueno.ng' },
    update: {},
    create: { fullName: 'Folake Adeyemi', email: 'admin@bueno.ng', passwordHash: await hash('demo1234'), role: UserRole.ADMIN, verified: true, phone: '+2348011100001' },
  });

  const headOfOps = await prisma.user.upsert({
    where: { email: 'ops@bueno.ng' },
    update: {},
    create: { fullName: 'Chukwuemeka Obi', email: 'ops@bueno.ng', passwordHash: await hash('demo1234'), role: UserRole.HEAD_OF_OPERATIONS, verified: true, phone: '+2348011100002' },
  });

  const cargoOfficerOrigin = await prisma.user.upsert({
    where: { email: 'cargo.ewekoro@bueno.ng' },
    update: {},
    create: { fullName: 'Ibrahim Suleiman', email: 'cargo.ewekoro@bueno.ng', passwordHash: await hash('demo1234'), role: UserRole.CARGO_OFFICER, verified: true, phone: '+2348011100003' },
  });

  const cargoOfficerDest = await prisma.user.upsert({
    where: { email: 'cargo.moniya@bueno.ng' },
    update: {},
    create: { fullName: 'Grace Adeboye', email: 'cargo.moniya@bueno.ng', passwordHash: await hash('demo1234'), role: UserRole.CARGO_OFFICER, verified: true, phone: '+2348011100004' },
  });

  const customerLafarge = await prisma.user.upsert({
    where: { email: 'customer@bueno.ng' },
    update: {},
    create: { fullName: 'Chidinma Okonkwo', email: 'customer@bueno.ng', phone: '+2348012345678', passwordHash: await hash('demo1234'), role: UserRole.CUSTOMER, verified: true },
  });

  const customerDangote = await prisma.user.upsert({
    where: { email: 'dangote@bueno.ng' },
    update: {},
    create: { fullName: 'Tunde Bakare', email: 'dangote@bueno.ng', phone: '+2348012345679', passwordHash: await hash('demo1234'), role: UserRole.CUSTOMER, verified: true },
  });

  const driverUser1 = await prisma.user.upsert({
    where: { email: 'driver@bueno.ng' },
    update: {},
    create: { fullName: 'Musa Ibrahim', email: 'driver@bueno.ng', phone: '+2348099887766', passwordHash: await hash('demo1234'), role: UserRole.DRIVER, verified: true },
  });
  const driverUser2 = await prisma.user.upsert({
    where: { email: 'driver2@bueno.ng' },
    update: {},
    create: { fullName: 'Emeka Nwosu', email: 'driver2@bueno.ng', phone: '+2348099887767', passwordHash: await hash('demo1234'), role: UserRole.DRIVER, verified: true },
  });

  const driver1 = await prisma.driver.upsert({
    where: { userId: driverUser1.id },
    update: {},
    create: { userId: driverUser1.id, licenseNumber: 'NRC-DRV-2021-001', licenseExpiry: new Date('2027-12-31') },
  });
  const driver2 = await prisma.driver.upsert({
    where: { userId: driverUser2.id },
    update: {},
    create: { userId: driverUser2.id, licenseNumber: 'NRC-DRV-2021-002', licenseExpiry: new Date('2027-06-30') },
  });

  console.log('✅ Users seeded (Admin, Head of Operations, 2 Cargo Officers, 2 Customers, 2 Drivers)');

  // ── Routes (real Bueno corridors) ─────────────────────────────────────────

  const routeEwekoroMoniya = await prisma.route.upsert({
    where: { id: 'route-ewekoro-moniya' },
    update: {},
    create: { id: 'route-ewekoro-moniya', routeName: 'Ewekoro — Moniya Cement Corridor', originTerminal: 'Ewekoro Terminal (Itori)', destinationTerminal: 'Moniya Terminal, Ibadan', distanceKm: 96, estimatedDurationHr: 2 },
  });

  const routePapalantoMoniya = await prisma.route.upsert({
    where: { id: 'route-papalanto-moniya' },
    update: {},
    create: { id: 'route-papalanto-moniya', routeName: 'Papalanto — Moniya Freight', originTerminal: 'Papalanto Terminal', destinationTerminal: 'Moniya Terminal, Ibadan', distanceKm: 74, estimatedDurationHr: 1.5 },
  });

  const routeLagosAbuja = await prisma.route.upsert({
    where: { id: 'route-lagos-abuja' },
    update: {},
    create: { id: 'route-lagos-abuja', routeName: 'Lagos — Abuja Corridor', originTerminal: 'Ijoko Terminal, Lagos', destinationTerminal: 'Idu Terminal, Abuja', distanceKm: 775, estimatedDurationHr: 11 },
  });

  await prisma.routePricing.createMany({
    data: [
      { routeId: routeEwekoroMoniya.id, pricePerWagonNgn: 380000, fuelSurchargePct: 5 },
      { routeId: routePapalantoMoniya.id, pricePerWagonNgn: 310000, fuelSurchargePct: 5 },
      { routeId: routeLagosAbuja.id, pricePerWagonNgn: 1200000, fuelSurchargePct: 8 },
    ],
  });

  console.log('✅ Routes & pricing seeded');

  // ── Cargo types ────────────────────────────────────────────────────────────

  await prisma.cargoType.createMany({
    data: [
      { name: 'Bagged cement', densityTPerM3: 1.4, defaultWagonCapacityT: 60, wagonType: WagonType.OPEN_GONDOLA, handlingNotes: 'Keep dry; tarpaulin required in wet season.' },
      { name: 'Bulk gypsum', densityTPerM3: 0.8, defaultWagonCapacityT: 35, wagonType: WagonType.HOPPER, handlingNotes: 'Load via hopper chute only.' },
      { name: 'Steel billets', densityTPerM3: 7.8, defaultWagonCapacityT: 50, wagonType: WagonType.FLAT, requiresSpecialWagon: true, handlingNotes: 'Crane-loaded; secure with chain lashing.' },
      { name: 'Agricultural produce', densityTPerM3: 0.6, defaultWagonCapacityT: 30, wagonType: WagonType.COVERED_VAN, handlingNotes: 'Ventilated wagon required.' },
      { name: 'Containerised freight', densityTPerM3: 0.5, defaultWagonCapacityT: 28, wagonType: WagonType.CONTAINER_FLAT },
    ],
  });
  const cargoCement = await prisma.cargoType.findUniqueOrThrow({ where: { name: 'Bagged cement' } });
  const cargoGypsum = await prisma.cargoType.findUniqueOrThrow({ where: { name: 'Bulk gypsum' } });
  const cargoSteel = await prisma.cargoType.findUniqueOrThrow({ where: { name: 'Steel billets' } });

  console.log('✅ Cargo types seeded');

  // ── Fleet: Wagons ──────────────────────────────────────────────────────────

  const wagonSeeds = [
    ...Array.from({ length: 10 }, (_, i) => ({
      serialNumber: `PXG-081${30 + i}`, wagonType: WagonType.OPEN_GONDOLA, capacityTonnes: 60,
      status: i < 8 ? AssetStatus.AVAILABLE : AssetStatus.MAINTENANCE,
      condition: i < 8 ? AssetCondition.GOOD : AssetCondition.FAIR,
      manufactureYear: 2016 + (i % 6), notes: i >= 8 ? 'Brake shoe inspection due — held from allocation until cleared.' : undefined,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      serialNumber: `HPR-041${20 + i}`, wagonType: WagonType.HOPPER, capacityTonnes: 35,
      status: AssetStatus.AVAILABLE, condition: AssetCondition.GOOD, manufactureYear: 2018 + (i % 4),
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      serialNumber: `FLT-092${10 + i}`, wagonType: WagonType.FLAT, capacityTonnes: 50,
      status: i === 0 ? AssetStatus.MAINTENANCE : AssetStatus.AVAILABLE,
      condition: i === 0 ? AssetCondition.FAIR : AssetCondition.EXCELLENT, manufactureYear: 2019,
      notes: i === 0 ? 'Frame weld crack found on last inspection — scheduled for repair.' : undefined,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      serialNumber: `CVN-073${30 + i}`, wagonType: WagonType.COVERED_VAN, capacityTonnes: 30,
      status: AssetStatus.AVAILABLE, condition: AssetCondition.GOOD, manufactureYear: 2020,
    })),
  ];

  for (const w of wagonSeeds) {
    await prisma.wagon.upsert({ where: { serialNumber: w.serialNumber }, update: {}, create: w as any });
  }
  console.log(`✅ ${wagonSeeds.length} wagons seeded (${wagonSeeds.filter(w => w.status === 'MAINTENANCE').length} under maintenance)`);

  // ── Fleet: Locomotives ─────────────────────────────────────────────────────

  const locoSeeds = [
    { serialNumber: 'L-2205', model: '22 Class — Narrow Gauge', manufacturer: 'CRRC', maxWagonCapacity: 20, fuelLevelPercent: 82, engineHours: 4210, status: AssetStatus.AVAILABLE, condition: AssetCondition.GOOD, assignedDriverId: driver1.id, currentLat: 6.9010, currentLng: 3.3480 },
    { serialNumber: 'L-2401', model: '24 Class — Construction', manufacturer: 'CRRC', maxWagonCapacity: 20, fuelLevelPercent: 95, engineHours: 1180, status: AssetStatus.AVAILABLE, condition: AssetCondition.EXCELLENT, assignedDriverId: driver2.id, currentLat: 7.1608, currentLng: 3.3492 },
    { serialNumber: 'L-2402', model: '24 Class — Construction', manufacturer: 'CRRC', maxWagonCapacity: 20, fuelLevelPercent: 60, engineHours: 1340, status: AssetStatus.AVAILABLE, condition: AssetCondition.GOOD },
    { serialNumber: 'L-2403', model: '24 Class — Construction', manufacturer: 'CRRC', maxWagonCapacity: 20, fuelLevelPercent: 40, engineHours: 2890, status: AssetStatus.MAINTENANCE, condition: AssetCondition.FAIR, notes: 'Scheduled 500-hour service.' } as any,
    { serialNumber: 'L-2501', model: '25 Class — Construction', manufacturer: 'CRRC', maxWagonCapacity: 22, fuelLevelPercent: 100, engineHours: 210, status: AssetStatus.AVAILABLE, condition: AssetCondition.EXCELLENT },
  ];
  for (const l of locoSeeds) {
    await prisma.locomotive.upsert({ where: { serialNumber: l.serialNumber }, update: {}, create: l as any });
  }
  const loco1 = await prisma.locomotive.findUniqueOrThrow({ where: { serialNumber: 'L-2205' } });
  const loco2 = await prisma.locomotive.findUniqueOrThrow({ where: { serialNumber: 'L-2401' } });
  const loco3 = await prisma.locomotive.findUniqueOrThrow({ where: { serialNumber: 'L-2402' } });
  console.log(`✅ ${locoSeeds.length} locomotives seeded (1 under maintenance)`);

  const availableWagons = await prisma.wagon.findMany({ where: { status: AssetStatus.AVAILABLE }, orderBy: { serialNumber: 'asc' } });

  // ── Trips (bookings) across every lifecycle stage ─────────────────────────

  async function makeBooking(opts: {
    id: string; customerId: string; routeId: string; cargoTypeId: string; weight: number;
    wagonsRequired: number; locosRequired: number; pricePerWagon: number; trainNumber?: string;
    status: string; paymentStatus?: string; createdAt: Date; destinationContact?: string; destinationPhone?: string;
  }) {
    return prisma.booking.upsert({
      where: { id: opts.id },
      update: {},
      create: {
        id: opts.id,
        bookingCode: opts.id,
        customerId: opts.customerId,
        routeId: opts.routeId,
        cargoTypeId: opts.cargoTypeId,
        cargoWeightTonnes: opts.weight,
        wagonsRequired: opts.wagonsRequired,
        locosRequired: opts.locosRequired,
        totalAmountNgn: opts.wagonsRequired * opts.pricePerWagon * 1.05,
        bookingStatus: opts.status,
        paymentStatus: opts.paymentStatus ?? PaymentStatus.PAID,
        trainNumber: opts.trainNumber,
        createdAt: opts.createdAt,
        destinationContact: opts.destinationContact ?? 'Warehouse Supervisor',
        destinationPhone: opts.destinationPhone ?? '+2348033445566',
      },
    });
  }

  async function event(bookingId: string, status: string, title: string, description: string, at: Date, triggeredBy?: string) {
    await prisma.bookingEvent.create({ data: { bookingId, status, title, description, createdAt: at, triggeredBy } });
  }

  // Trip 1 — brand new, awaiting payment
  const trip1 = await makeBooking({
    id: 'trip-001', customerId: customerLafarge.id, routeId: routeEwekoroMoniya.id, cargoTypeId: cargoCement.id,
    weight: 120, wagonsRequired: 2, locosRequired: 1, pricePerWagon: 380000,
    status: BookingStatus.PENDING, paymentStatus: PaymentStatus.PENDING, createdAt: hoursAgo(2),
  });
  await event(trip1.id, 'PENDING', 'Trip requested', 'Awaiting payment confirmation.', hoursAgo(2));

  // Trip 2 — paid, coordinating, not yet allocated
  const trip2 = await makeBooking({
    id: 'trip-002', customerId: customerDangote.id, routeId: routePapalantoMoniya.id, cargoTypeId: cargoGypsum.id,
    weight: 70, wagonsRequired: 2, locosRequired: 1, pricePerWagon: 310000,
    status: BookingStatus.COORDINATING, createdAt: hoursAgo(20),
  });
  await event(trip2.id, 'BOOKING_CONFIRMED', 'Payment confirmed', 'Payment verified.', hoursAgo(20));
  await event(trip2.id, 'COORDINATING', 'Coordination started', 'Cargo officer notified to allocate wagons.', hoursAgo(19));

  // Trip 3 — wagons allocated, cargo officer about to start loading
  const trip3 = await makeBooking({
    id: 'trip-003', customerId: customerLafarge.id, routeId: routeEwekoroMoniya.id, cargoTypeId: cargoCement.id,
    weight: 180, wagonsRequired: 3, locosRequired: 1, pricePerWagon: 380000, trainNumber: 'TR-LAF-103',
    status: BookingStatus.WAGON_ALLOCATED, createdAt: daysAgo(1),
  });
  await event(trip3.id, 'BOOKING_CONFIRMED', 'Payment confirmed', 'Payment verified.', daysAgo(1));
  await event(trip3.id, 'COORDINATING', 'Coordination started', 'Cargo officer notified to allocate wagons.', hoursAgo(20));
  const trip3Wagons = availableWagons.filter(w => w.wagonType === 'OPEN_GONDOLA').slice(0, 3);
  const trip3Allocs = [];
  for (const w of trip3Wagons) {
    trip3Allocs.push(await prisma.wagonAllocation.create({ data: { bookingId: trip3.id, wagonId: w.id, locoId: loco1.id, allocatedBy: cargoOfficerOrigin.id } }));
  }
  await event(trip3.id, 'WAGON_ALLOCATED', 'Wagons allocated', `${trip3Wagons.length} wagon(s) and locomotive L-2205 allocated.`, hoursAgo(6), cargoOfficerOrigin.id);

  // Trip 4 — loading in progress: 2 of 3 wagons have cargo logged (demoable "add item" flow)
  const trip4 = await makeBooking({
    id: 'trip-004', customerId: customerLafarge.id, routeId: routeEwekoroMoniya.id, cargoTypeId: cargoCement.id,
    weight: 180, wagonsRequired: 3, locosRequired: 1, pricePerWagon: 380000, trainNumber: 'TR-LAF-104',
    status: BookingStatus.LOADING_IN_PROGRESS, createdAt: daysAgo(1),
  });
  const trip4Wagons = availableWagons.filter(w => w.wagonType === 'OPEN_GONDOLA').slice(3, 6);
  const trip4Allocs = [];
  for (const w of trip4Wagons) {
    trip4Allocs.push(await prisma.wagonAllocation.create({ data: { bookingId: trip4.id, wagonId: w.id, locoId: loco2.id, allocatedBy: cargoOfficerOrigin.id } }));
  }
  await event(trip4.id, 'WAGON_ALLOCATED', 'Wagons allocated', `${trip4Wagons.length} wagon(s) and locomotive L-2401 allocated.`, daysAgo(1), cargoOfficerOrigin.id);
  await event(trip4.id, 'CARGO_AT_TERMINAL', 'Cargo arrived at terminal', 'Cement bags arrived at Ewekoro terminal for loading.', hoursAgo(10), cargoOfficerOrigin.id);
  await event(trip4.id, 'LOADING_IN_PROGRESS', 'Loading started', 'Cargo officer began logging bags per wagon.', hoursAgo(9), cargoOfficerOrigin.id);
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip4Allocs[0].id, description: 'Bagged cement (50kg)', customerRef: 'LAF-PO-88213', unit: CargoUnit.BAGS, loadedQty: 1200, loadedById: cargoOfficerOrigin.id, loadedAt: hoursAgo(9) } });
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip4Allocs[1].id, description: 'Bagged cement (50kg)', customerRef: 'LAF-PO-88213', unit: CargoUnit.BAGS, loadedQty: 1180, loadedById: cargoOfficerOrigin.id, loadedAt: hoursAgo(8) } });
  // Wagon 3 of trip 4 intentionally left with no cargo logged yet — demo can add it live.

  // Trip 5 — fully loaded, departed, in transit (for the tracking map + timeline)
  const trip5 = await makeBooking({
    id: 'trip-005', customerId: customerLafarge.id, routeId: routeEwekoroMoniya.id, cargoTypeId: cargoCement.id,
    weight: 240, wagonsRequired: 4, locosRequired: 1, pricePerWagon: 380000, trainNumber: 'TR-LAF-105',
    status: BookingStatus.IN_TRANSIT, createdAt: daysAgo(2),
  });
  const trip5Wagons = availableWagons.filter(w => w.wagonType === 'HOPPER').slice(0, 4);
  const trip5Allocs = [];
  for (const w of trip5Wagons) {
    trip5Allocs.push(await prisma.wagonAllocation.create({ data: { bookingId: trip5.id, wagonId: w.id, locoId: loco3.id, allocatedBy: cargoOfficerOrigin.id, departedAt: hoursAgo(3) } }));
  }
  for (const a of trip5Allocs) {
    await prisma.cargoItem.create({ data: { wagonAllocationId: a.id, description: 'Bulk gypsum', customerRef: 'DGT-PO-55031', unit: CargoUnit.TONNES, loadedQty: 35, loadedById: cargoOfficerOrigin.id, loadedAt: hoursAgo(5) } });
  }
  await event(trip5.id, 'WAGON_ALLOCATED', 'Wagons allocated', '4 wagon(s) and locomotive L-2402 allocated.', daysAgo(2), cargoOfficerOrigin.id);
  await event(trip5.id, 'LOADING_IN_PROGRESS', 'Loading started', 'Loading began at Ewekoro terminal.', hoursAgo(6), cargoOfficerOrigin.id);
  await event(trip5.id, 'DEPARTED', 'Train departed', 'Train TR-LAF-105 departed Ewekoro terminal.', hoursAgo(3), cargoOfficerOrigin.id);
  await event(trip5.id, 'IN_TRANSIT', 'In transit', 'En route to Moniya terminal.', hoursAgo(2));
  await prisma.locoLocationHistory.createMany({
    data: [
      { locoId: loco3.id, lat: 6.901, lng: 3.348, speed: 42, heading: 38, timestamp: hoursAgo(3) },
      { locoId: loco3.id, lat: 7.02, lng: 3.39, speed: 55, heading: 40, timestamp: hoursAgo(2) },
      { locoId: loco3.id, lat: 7.16, lng: 3.42, speed: 48, heading: 35, timestamp: hoursAgo(1) },
    ],
  });
  await prisma.locomotive.update({ where: { id: loco3.id }, data: { currentLat: 7.16, currentLng: 3.42 } });

  // Trip 6 — arrived at destination, ready for the unload demo (loaded qty set, unloaded qty pending)
  const trip6 = await makeBooking({
    id: 'trip-006', customerId: customerDangote.id, routeId: routePapalantoMoniya.id, cargoTypeId: cargoGypsum.id,
    weight: 105, wagonsRequired: 3, locosRequired: 1, pricePerWagon: 310000, trainNumber: 'TR-DGT-106',
    status: BookingStatus.ARRIVED_DESTINATION, createdAt: daysAgo(2),
  });
  const trip6Wagons = availableWagons.filter(w => w.wagonType === 'HOPPER').slice(4, 6).concat(availableWagons.filter(w => w.wagonType === 'FLAT').slice(0, 1));
  const trip6Allocs = [];
  for (const w of trip6Wagons) {
    trip6Allocs.push(await prisma.wagonAllocation.create({ data: { bookingId: trip6.id, wagonId: w.id, locoId: loco1.id, allocatedBy: cargoOfficerOrigin.id, departedAt: hoursAgo(14), arrivedAt: hoursAgo(1) } }));
  }
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip6Allocs[0].id, description: 'Bulk gypsum', customerRef: 'DGT-PO-55090', unit: CargoUnit.TONNES, loadedQty: 35, loadedById: cargoOfficerOrigin.id, loadedAt: daysAgo(1) } });
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip6Allocs[1].id, description: 'Bulk gypsum', customerRef: 'DGT-PO-55090', unit: CargoUnit.TONNES, loadedQty: 35, loadedById: cargoOfficerOrigin.id, loadedAt: daysAgo(1) } });
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip6Allocs[2].id, description: 'Bulk gypsum', customerRef: 'DGT-PO-55090', unit: CargoUnit.TONNES, loadedQty: 35, loadedById: cargoOfficerOrigin.id, loadedAt: daysAgo(1) } });
  await event(trip6.id, 'DEPARTED', 'Train departed', 'Train TR-DGT-106 departed Papalanto terminal.', hoursAgo(14), cargoOfficerOrigin.id);
  await event(trip6.id, 'IN_TRANSIT', 'In transit', 'En route to Moniya terminal.', hoursAgo(13));
  await event(trip6.id, 'ARRIVED_DESTINATION', 'Arrived at destination', 'Train arrived at Moniya terminal. Awaiting unloading confirmation.', hoursAgo(1), cargoOfficerDest.id);

  // Trip 7 — completed, with one wagon showing a real discrepancy (the flagship "one record used twice" proof point)
  const trip7 = await makeBooking({
    id: 'trip-007', customerId: customerLafarge.id, routeId: routeEwekoroMoniya.id, cargoTypeId: cargoCement.id,
    weight: 180, wagonsRequired: 3, locosRequired: 1, pricePerWagon: 380000, trainNumber: 'TR-LAF-101',
    status: BookingStatus.COMPLETED, createdAt: daysAgo(4),
  });
  const trip7Wagons = availableWagons.filter(w => w.wagonType === 'OPEN_GONDOLA').slice(6, 8).concat(availableWagons.filter(w => w.wagonType === 'COVERED_VAN').slice(0, 1));
  const trip7Allocs = [];
  for (const w of trip7Wagons) {
    trip7Allocs.push(await prisma.wagonAllocation.create({ data: { bookingId: trip7.id, wagonId: w.id, locoId: loco2.id, allocatedBy: cargoOfficerOrigin.id, departedAt: daysAgo(3), arrivedAt: daysAgo(3) } }));
  }
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip7Allocs[0].id, description: 'Bagged cement (50kg)', customerRef: 'LAF-PO-87990', unit: CargoUnit.BAGS, loadedQty: 1200, loadedById: cargoOfficerOrigin.id, loadedAt: daysAgo(4), unloadedQty: 1200, unloadedById: cargoOfficerDest.id, unloadedAt: daysAgo(3) } });
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip7Allocs[1].id, description: 'Bagged cement (50kg)', customerRef: 'LAF-PO-87990', unit: CargoUnit.BAGS, loadedQty: 1200, loadedById: cargoOfficerOrigin.id, loadedAt: daysAgo(4), unloadedQty: 1185, unloadedById: cargoOfficerDest.id, unloadedAt: daysAgo(3), damaged: true, notes: '15 bags received torn/water-damaged — logged and flagged for insurance.' } });
  await prisma.cargoItem.create({ data: { wagonAllocationId: trip7Allocs[2].id, description: 'Bagged cement (50kg)', customerRef: 'LAF-PO-87990', unit: CargoUnit.BAGS, loadedQty: 800, loadedById: cargoOfficerOrigin.id, loadedAt: daysAgo(4), unloadedQty: 800, unloadedById: cargoOfficerDest.id, unloadedAt: daysAgo(3) } });
  await event(trip7.id, 'DEPARTED', 'Train departed', 'Train TR-LAF-101 departed Ewekoro terminal.', daysAgo(4));
  await event(trip7.id, 'ARRIVED_DESTINATION', 'Arrived at destination', 'Train arrived at Moniya terminal.', daysAgo(3));
  await event(trip7.id, 'UNLOADING', 'Unloading cargo', 'Cargo officer confirming unloaded quantities against loaded inventory.', daysAgo(3), cargoOfficerDest.id);
  // Feeder Truck Logs for Trip 4 & Trip 7
  await prisma.feederTruckLog.create({
    data: {
      wagonAllocationId: trip4Allocs[0].id,
      truckRegNo: 'KTU-482-XA',
      driverName: 'Sunday Adeleke',
      driverPhone: '+2348039911223',
      transporterName: 'Alhaji Danladi Haulage Ltd',
      loadingSource: 'Lafarge Silo Bay 3',
      quantityLoaded: 1200,
      unit: CargoUnit.BAGS,
      startTime: hoursAgo(9.5),
      endTime: hoursAgo(9),
    },
  });
  await prisma.feederTruckLog.create({
    data: {
      wagonAllocationId: trip4Allocs[1].id,
      truckRegNo: 'LSR-914-YD',
      driverName: 'Mustapha Garba',
      driverPhone: '+2348035544332',
      transporterName: 'Dangote Transport Fleet',
      loadingSource: 'Lafarge Silo Bay 1',
      quantityLoaded: 1180,
      unit: CargoUnit.BAGS,
      startTime: hoursAgo(8.5),
      endTime: hoursAgo(8),
    },
  });

  // Wagon Unload Audit with Burst Bags & Wagon Complaint for Trip 7
  await prisma.wagonUnloadAudit.create({
    data: {
      wagonAllocationId: trip7Allocs[0].id,
      startTime: daysAgo(3.1),
      endTime: daysAgo(3),
      intactCount: 1200,
      damagedCount: 0,
      burstBagCount: 0,
      hasComplaint: false,
      unloadedById: cargoOfficerDest.id,
    },
  });

  await prisma.wagonUnloadAudit.create({
    data: {
      wagonAllocationId: trip7Allocs[1].id,
      startTime: daysAgo(3.1),
      endTime: daysAgo(3),
      intactCount: 1185,
      damagedCount: 0,
      burstBagCount: 15,
      hasComplaint: true,
      complaintType: 'ROOF_LEAK',
      complaintDetails: 'Minor roof corrosion allowed rain ingress during transit, resulting in 15 burst/caked cement bags.',
      unloadedById: cargoOfficerDest.id,
    },
  });

  await prisma.wagonUnloadAudit.create({
    data: {
      wagonAllocationId: trip7Allocs[2].id,
      startTime: daysAgo(3.1),
      endTime: daysAgo(3),
      intactCount: 800,
      damagedCount: 0,
      burstBagCount: 0,
      hasComplaint: false,
      unloadedById: cargoOfficerDest.id,
    },
  });

  // ── Monthly Operational & Financial Budgets (Mr. Niyi Spec) ────────────────
  const budgetEwkAug = await prisma.terminalMonthlyBudget.create({
    data: {
      year: 2026,
      month: 8,
      stationCode: 'EWK',
      targetTrains: 25,
      targetTonnage: 30000,
      targetRevenue: 45000000,
    },
  });

  const budgetMnyAug = await prisma.terminalMonthlyBudget.create({
    data: {
      year: 2026,
      month: 8,
      stationCode: 'MNY',
      targetTrains: 25,
      targetTonnage: 30000,
      targetRevenue: 45000000,
    },
  });

  await prisma.cargoOfficerTarget.create({
    data: {
      budgetId: budgetEwkAug.id,
      officerId: cargoOfficerOrigin.id,
      targetTrains: 15,
      achievedTrains: 14,
      ratingScore: 93.3,
    },
  });

  await prisma.cargoOfficerTarget.create({
    data: {
      budgetId: budgetMnyAug.id,
      officerId: cargoOfficerDest.id,
      targetTrains: 15,
      achievedTrains: 15,
      ratingScore: 100.0,
    },
  });

  console.log('✅ 7 trips seeded across every lifecycle stage, with Feeder Trucks, Burst Bag Audits, and Monthly Budgets');

  console.log('\n🎉 Seed complete.\n');
  console.log('Demo logins (all passwords: demo1234):');
  console.log('  Admin              admin@bueno.ng');
  console.log('  Head of Operations ops@bueno.ng');
  console.log('  Cargo Officer      cargo.ewekoro@bueno.ng   (origin — Ewekoro)');
  console.log('  Cargo Officer      cargo.moniya@bueno.ng    (destination — Moniya)');
  console.log('  Customer           customer@bueno.ng        (Lafarge)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
