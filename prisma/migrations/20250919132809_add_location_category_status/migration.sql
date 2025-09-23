-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "isFrequent" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_locations" ("address", "createdAt", "id", "isFrequent", "latitude", "longitude", "name") SELECT "address", "createdAt", "id", "isFrequent", "latitude", "longitude", "name" FROM "locations";
DROP TABLE "locations";
ALTER TABLE "new_locations" RENAME TO "locations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
