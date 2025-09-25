-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "guestName" TEXT;
ALTER TABLE "bookings" ADD COLUMN "guestPhone" TEXT;

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "amount" REAL NOT NULL,
    "credits" INTEGER NOT NULL,
    "payfastId" TEXT,
    "payfastPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "merchantTxnId" TEXT,
    "signature" TEXT,
    "itnData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "payment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_transactions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "credit_packages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "payment_transactions_userId_status_idx" ON "payment_transactions"("userId", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_payfastId_idx" ON "payment_transactions"("payfastId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_createdAt_idx" ON "payment_transactions"("status", "createdAt");
