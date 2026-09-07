-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "quantity" REAL NOT NULL,
    "avgPriceCents" INTEGER NOT NULL,
    "currentPriceCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holding_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Holding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "capturedOn" DATETIME NOT NULL,
    "assetsCents" INTEGER NOT NULL,
    "liabilitiesCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "investedCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NetWorthSnapshot_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Holding_spaceId_type_idx" ON "Holding"("spaceId", "type");

-- CreateIndex
CREATE INDEX "Holding_accountId_idx" ON "Holding"("accountId");

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_spaceId_capturedOn_idx" ON "NetWorthSnapshot"("spaceId", "capturedOn");

-- CreateIndex
CREATE UNIQUE INDEX "NetWorthSnapshot_spaceId_capturedOn_key" ON "NetWorthSnapshot"("spaceId", "capturedOn");
