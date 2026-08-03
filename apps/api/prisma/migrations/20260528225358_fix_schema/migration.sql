/*
  Warnings:

  - The values [CONFIRMED,ARRIVED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `FuelLog` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Inspection` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Notification` table. All the data in the column will be lost.
  - The `read` column on the `Notification` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `locomotiveId` on the `WagonAllocation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paystackReference]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Made the column `paystackVerified` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `costNgn` to the `FuelLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `litresAdded` to the `FuelLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assetType` to the `Inspection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passed` to the `Inspection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'BOOKING_CONFIRMED', 'COORDINATING', 'WAGON_ALLOCATED', 'CARGO_AT_TERMINAL', 'LOADING_IN_PROGRESS', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'UNLOADING', 'READY_FOR_COLLECTION', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Booking" ALTER COLUMN "bookingStatus" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "bookingStatus" TYPE "BookingStatus_new" USING ("bookingStatus"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "bookingStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "destinationContact" TEXT,
ADD COLUMN     "destinationPhone" TEXT,
ADD COLUMN     "dropOffDate" TIMESTAMP(3),
ALTER COLUMN "paystackVerified" SET NOT NULL,
ALTER COLUMN "totalAmountNgn" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "BookingEvent" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "triggeredBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Driver" ALTER COLUMN "licenseNumber" DROP NOT NULL,
ALTER COLUMN "licenseExpiry" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FuelLog" DROP COLUMN "amount",
ADD COLUMN     "costNgn" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "litresAdded" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "loggedBy" TEXT,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "fuelLevelBefore" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "fuelLevelAfter" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Inspection" DROP COLUMN "notes",
ADD COLUMN     "assetType" TEXT NOT NULL,
ADD COLUMN     "checklistJson" JSONB,
ADD COLUMN     "inspectedBy" TEXT,
ADD COLUMN     "issuesFound" TEXT,
ADD COLUMN     "passed" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "Locomotive" ADD COLUMN     "lastInspectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "content",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "data" JSONB,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "read",
ADD COLUMN     "read" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Wagon" ALTER COLUMN "totalTrips" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "WagonAllocation" DROP COLUMN "locomotiveId",
ADD COLUMN     "allocatedBy" TEXT,
ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "locoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paystackReference_key" ON "Booking"("paystackReference");

-- AddForeignKey
ALTER TABLE "WagonAllocation" ADD CONSTRAINT "WagonAllocation_locoId_fkey" FOREIGN KEY ("locoId") REFERENCES "Locomotive"("id") ON DELETE SET NULL ON UPDATE CASCADE;
