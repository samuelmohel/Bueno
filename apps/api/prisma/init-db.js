/* eslint-disable */
// One-time DB bootstrap: creates every table Prisma's schema.prisma defines.
// Run with: node prisma/init-db.js
//
// Why this exists: `prisma migrate` / `prisma db push` still shell out to a
// native "schema-engine" binary that Prisma downloads from binaries.prisma.sh.
// In sandboxed / restricted-network environments that download can fail, so
// this script creates the exact same tables directly via better-sqlite3.
// Prisma Client itself doesn't need the native binary at all here — it runs
// on the WASM query engine through @prisma/adapter-better-sqlite3.

const path = require('path');
const fs = require('fs');
require('dotenv').config();
const Database = require('better-sqlite3');

const url = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = path.isAbsolute(url.replace(/^file:/, ''))
  ? url.replace(/^file:/, '')
  : path.join(process.cwd(), url.replace(/^file:/, ''));

for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const f = dbPath + suffix;
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log(`Removed ${f}`);
  }
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "refreshToken" TEXT,
  "avatar" TEXT,
  "phone" TEXT,
  "role" TEXT NOT NULL,
  "verified" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Driver" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "licenseNumber" TEXT,
  "licenseExpiry" DATETIME,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE TABLE "Route" (
  "id" TEXT PRIMARY KEY,
  "routeName" TEXT NOT NULL,
  "originTerminal" TEXT NOT NULL,
  "destinationTerminal" TEXT NOT NULL,
  "distanceKm" REAL NOT NULL,
  "estimatedDurationHr" REAL NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "RoutePricing" (
  "id" TEXT PRIMARY KEY,
  "routeId" TEXT NOT NULL,
  "pricePerWagonNgn" INTEGER NOT NULL,
  "fuelSurchargePct" INTEGER NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("routeId") REFERENCES "Route"("id")
);

CREATE TABLE "CargoType" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "densityTPerM3" REAL,
  "defaultWagonCapacityT" INTEGER,
  "wagonType" TEXT,
  "requiresSpecialWagon" INTEGER DEFAULT 0,
  "handlingNotes" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "Booking" (
  "id" TEXT PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bookingCode" TEXT NOT NULL UNIQUE,
  "customerId" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "cargoTypeId" TEXT NOT NULL,
  "cargoWeightTonnes" REAL NOT NULL,
  "wagonsRequired" INTEGER NOT NULL,
  "locosRequired" INTEGER NOT NULL,
  "totalAmountNgn" REAL NOT NULL,
  "bookingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "paystackReference" TEXT UNIQUE,
  "paystackVerified" INTEGER NOT NULL DEFAULT 0,
  "trainNumber" TEXT,
  "specialInstructions" TEXT,
  "dropOffDate" DATETIME,
  "destinationContact" TEXT,
  "destinationPhone" TEXT,
  FOREIGN KEY ("customerId") REFERENCES "User"("id"),
  FOREIGN KEY ("routeId") REFERENCES "Route"("id"),
  FOREIGN KEY ("cargoTypeId") REFERENCES "CargoType"("id")
);

CREATE TABLE "BookingEvent" (
  "id" TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "triggeredBy" TEXT,
  "lat" REAL,
  "lng" REAL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "messageType" TEXT NOT NULL DEFAULT 'TEXT',
  "attachmentUrl" TEXT,
  "readAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id"),
  FOREIGN KEY ("senderId") REFERENCES "User"("id")
);

CREATE TABLE "Wagon" (
  "id" TEXT PRIMARY KEY,
  "serialNumber" TEXT NOT NULL UNIQUE,
  "wagonType" TEXT NOT NULL,
  "capacityTonnes" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "condition" TEXT NOT NULL DEFAULT 'GOOD',
  "manufactureYear" INTEGER NOT NULL,
  "totalTrips" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "lastInspectedAt" DATETIME,
  "nextServiceDue" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Locomotive" (
  "id" TEXT PRIMARY KEY,
  "serialNumber" TEXT NOT NULL UNIQUE,
  "model" TEXT NOT NULL,
  "manufacturer" TEXT NOT NULL,
  "maxWagonCapacity" INTEGER NOT NULL,
  "fuelLevelPercent" INTEGER NOT NULL,
  "engineHours" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "condition" TEXT NOT NULL DEFAULT 'GOOD',
  "currentLat" REAL,
  "currentLng" REAL,
  "assignedDriverId" TEXT,
  "lastInspectedAt" DATETIME,
  "lastFuelledAt" DATETIME,
  "nextServiceDue" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  FOREIGN KEY ("assignedDriverId") REFERENCES "Driver"("id")
);

CREATE TABLE "WagonAllocation" (
  "id" TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "wagonId" TEXT NOT NULL,
  "locoId" TEXT,
  "allocatedBy" TEXT,
  "allocatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "departedAt" DATETIME,
  "arrivedAt" DATETIME,
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id"),
  FOREIGN KEY ("wagonId") REFERENCES "Wagon"("id"),
  FOREIGN KEY ("locoId") REFERENCES "Locomotive"("id")
);

CREATE TABLE "CargoItem" (
  "id" TEXT PRIMARY KEY,
  "wagonAllocationId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "customerRef" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'BAGS',
  "loadedQty" REAL NOT NULL,
  "loadedById" TEXT,
  "loadedAt" DATETIME,
  "unloadedQty" REAL,
  "unloadedById" TEXT,
  "unloadedAt" DATETIME,
  "damaged" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("wagonAllocationId") REFERENCES "WagonAllocation"("id"),
  FOREIGN KEY ("loadedById") REFERENCES "User"("id"),
  FOREIGN KEY ("unloadedById") REFERENCES "User"("id")
);

CREATE TABLE "Inspection" (
  "id" TEXT PRIMARY KEY,
  "assetType" TEXT NOT NULL,
  "wagonId" TEXT,
  "locoId" TEXT,
  "inspectedBy" TEXT,
  "checklistJson" TEXT,
  "passed" INTEGER NOT NULL,
  "issuesFound" TEXT,
  "inspectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("wagonId") REFERENCES "Wagon"("id"),
  FOREIGN KEY ("locoId") REFERENCES "Locomotive"("id")
);

CREATE TABLE "FuelLog" (
  "id" TEXT PRIMARY KEY,
  "locoId" TEXT NOT NULL,
  "loggedBy" TEXT,
  "litresAdded" REAL NOT NULL,
  "costNgn" REAL NOT NULL,
  "fuelLevelBefore" REAL NOT NULL,
  "fuelLevelAfter" REAL NOT NULL,
  "notes" TEXT,
  "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("locoId") REFERENCES "Locomotive"("id")
);

CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "bookingId" TEXT,
  "data" TEXT,
  "read" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE TABLE "LocoLocationHistory" (
  "id" TEXT PRIMARY KEY,
  "locoId" TEXT NOT NULL,
  "lat" REAL NOT NULL,
  "lng" REAL NOT NULL,
  "speed" REAL,
  "heading" REAL,
  "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("locoId") REFERENCES "Locomotive"("id")
);

CREATE INDEX "idx_booking_customer" ON "Booking"("customerId");
CREATE INDEX "idx_booking_status" ON "Booking"("bookingStatus");
CREATE INDEX "idx_wagonallocation_booking" ON "WagonAllocation"("bookingId");
CREATE INDEX "idx_cargoitem_allocation" ON "CargoItem"("wagonAllocationId");
CREATE INDEX "idx_bookingevent_booking" ON "BookingEvent"("bookingId");
CREATE INDEX "idx_chatmessage_booking" ON "ChatMessage"("bookingId");
CREATE INDEX "idx_notification_user" ON "Notification"("userId");
CREATE INDEX "idx_locohistory_loco" ON "LocoLocationHistory"("locoId");
`);

db.close();
console.log(`✅ Database schema created at ${dbPath}`);
