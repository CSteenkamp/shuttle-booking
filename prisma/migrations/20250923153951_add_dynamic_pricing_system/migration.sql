-- AlterTable
ALTER TABLE "locations" ADD COLUMN "baseCost" INTEGER;
ALTER TABLE "locations" ADD COLUMN "defaultDuration" INTEGER;

-- CreateTable
CREATE TABLE "pricing_tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "costPerPerson" INTEGER NOT NULL,
    CONSTRAINT "pricing_tiers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "riderId" TEXT,
    "pickupLocationId" TEXT,
    "pickupSavedAddressId" TEXT,
    "dropoffLocationId" TEXT NOT NULL,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "creditsCost" INTEGER NOT NULL,
    "originalCost" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bookings_dropoffLocationId_fkey" FOREIGN KEY ("dropoffLocationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bookings_pickupSavedAddressId_fkey" FOREIGN KEY ("pickupSavedAddressId") REFERENCES "saved_addresses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bookings_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bookings_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bookings" ("createdAt", "creditsCost", "dropoffLocationId", "id", "notes", "passengerCount", "pickupLocationId", "riderId", "status", "tripId", "updatedAt", "userId") SELECT "createdAt", "creditsCost", "dropoffLocationId", "id", "notes", "passengerCount", "pickupLocationId", "riderId", "status", "tripId", "updatedAt", "userId" FROM "bookings";
DROP TABLE "bookings";
ALTER TABLE "new_bookings" RENAME TO "bookings";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" DATETIME,
    "defaultPickupLocationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_defaultPickupLocationId_fkey" FOREIGN KEY ("defaultPickupLocationId") REFERENCES "saved_addresses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("createdAt", "defaultPickupLocationId", "email", "id", "name", "password", "phone", "role", "updatedAt") SELECT "createdAt", "defaultPickupLocationId", "email", "id", "name", "password", "phone", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "pricing_tiers_locationId_passengerCount_key" ON "pricing_tiers"("locationId", "passengerCount");
