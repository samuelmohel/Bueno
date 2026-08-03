/*
  Warnings:

  - You are about to drop the column `cargoType` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cargoWeight` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `currentLatitude` on the `Locomotive` table. All the data in the column will be lost.
  - You are about to drop the column `currentLongitude` on the `Locomotive` table. All the data in the column will be lost.
  - You are about to drop the column `fuelLevel` on the `Locomotive` table. All the data in the column will be lost.
  - You are about to drop the column `maxWagons` on the `Locomotive` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerWagon` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `Wagon` table. All the data in the column will be lost.
  - The `status` column on the `Wagon` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `cargoTypeId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cargoWeightTonnes` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locosRequired` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountNgn` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `engineHours` to the `Locomotive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fuelLevelPercent` to the `Locomotive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `manufacturer` to the `Locomotive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxWagonCapacity` to the `Locomotive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `Locomotive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationTerminal` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estimatedDurationHr` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originTerminal` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Added the required column `routeName` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `capacityTonnes` to the `Wagon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `manufactureYear` to the `Wagon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTrips` to the `Wagon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wagonType` to the `Wagon` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'CUSTOMER', 'DRIVER');

-- CreateEnum
CREATE TYPE "WagonType" AS ENUM ('OPEN_GONDOLA', 'FLAT', 'COVERED_VAN', 'CONTAINER_FLAT', 'HOPPER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'IN_USE');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COORDINATING';

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "cargoType",
DROP COLUMN "cargoWeight",
DROP COLUMN "status",
DROP COLUMN "totalAmount",
ADD COLUMN     "bookingStatus" "BookingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "cargoTypeId" TEXT NOT NULL,
ADD COLUMN     "cargoWeightTonnes" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "locosRequired" INTEGER NOT NULL,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "paystackReference" TEXT,
ADD COLUMN     "paystackVerified" BOOLEAN DEFAULT false,
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "totalAmountNgn" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Locomotive" DROP COLUMN "currentLatitude",
DROP COLUMN "currentLongitude",
DROP COLUMN "fuelLevel",
DROP COLUMN "maxWagons",
ADD COLUMN     "assignedDriverId" TEXT,
ADD COLUMN     "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
ADD COLUMN     "currentLat" DOUBLE PRECISION,
ADD COLUMN     "currentLng" DOUBLE PRECISION,
ADD COLUMN     "engineHours" INTEGER NOT NULL,
ADD COLUMN     "fuelLevelPercent" INTEGER NOT NULL,
ADD COLUMN     "manufacturer" TEXT NOT NULL,
ADD COLUMN     "maxWagonCapacity" INTEGER NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "Route" DROP COLUMN "destination",
DROP COLUMN "origin",
DROP COLUMN "pricePerWagon",
ADD COLUMN     "destinationTerminal" TEXT NOT NULL,
ADD COLUMN     "estimatedDurationHr" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "originTerminal" TEXT NOT NULL,
ADD COLUMN     "routeName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL;

-- AlterTable
ALTER TABLE "Wagon" DROP COLUMN "capacity",
ADD COLUMN     "capacityTonnes" INTEGER NOT NULL,
ADD COLUMN     "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
ADD COLUMN     "manufactureYear" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "totalTrips" INTEGER NOT NULL,
ADD COLUMN     "wagonType" "WagonType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE';

-- DropEnum
DROP TYPE "WagonStatus";

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePricing" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "pricePerWagonNgn" INTEGER NOT NULL,
    "fuelSurchargePct" INTEGER NOT NULL,

    CONSTRAINT "RoutePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "densityTPerM3" DOUBLE PRECISION,
    "defaultWagonCapacityT" INTEGER,
    "wagonType" "WagonType",
    "requiresSpecialWagon" BOOLEAN DEFAULT false,
    "handlingNotes" TEXT,

    CONSTRAINT "CargoType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CargoType_name_key" ON "CargoType"("name");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePricing" ADD CONSTRAINT "RoutePricing_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cargoTypeId_fkey" FOREIGN KEY ("cargoTypeId") REFERENCES "CargoType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locomotive" ADD CONSTRAINT "Locomotive_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
