-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstallmentPlan_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InstallmentPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InstallmentPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHECKING',
    "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "ownerMembershipId" TEXT,
    "creditLimitCents" INTEGER,
    "statementDay" INTEGER,
    "dueDay" INTEGER,
    "statementInclusive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL DEFAULT '#5b6478',
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Account_ownerMembershipId_fkey" FOREIGN KEY ("ownerMembershipId") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("archived", "color", "createdAt", "creditLimitCents", "dueDay", "icon", "id", "name", "openingBalanceCents", "ownerMembershipId", "sortOrder", "spaceId", "statementDay", "type", "updatedAt") SELECT "archived", "color", "createdAt", "creditLimitCents", "dueDay", "icon", "id", "name", "openingBalanceCents", "ownerMembershipId", "sortOrder", "spaceId", "statementDay", "type", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE INDEX "Account_spaceId_archived_idx" ON "Account"("spaceId", "archived");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "accountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "categoryId" TEXT,
    "paidByMembershipId" TEXT,
    "splitMode" TEXT NOT NULL DEFAULT 'OWNER',
    "recurrenceId" TEXT,
    "settlementId" TEXT,
    "installmentPlanId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "statementCloseDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_paidByMembershipId_fkey" FOREIGN KEY ("paidByMembershipId") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "Recurrence" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amountCents", "categoryId", "createdAt", "date", "description", "id", "notes", "paidByMembershipId", "recurrenceId", "settlementId", "spaceId", "splitMode", "toAccountId", "type", "updatedAt") SELECT "accountId", "amountCents", "categoryId", "createdAt", "date", "description", "id", "notes", "paidByMembershipId", "recurrenceId", "settlementId", "spaceId", "splitMode", "toAccountId", "type", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_spaceId_date_idx" ON "Transaction"("spaceId", "date");
CREATE INDEX "Transaction_spaceId_type_date_idx" ON "Transaction"("spaceId", "type", "date");
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_settlementId_idx" ON "Transaction"("settlementId");
CREATE INDEX "Transaction_installmentPlanId_idx" ON "Transaction"("installmentPlanId");
CREATE INDEX "Transaction_accountId_statementCloseDate_idx" ON "Transaction"("accountId", "statementCloseDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "InstallmentPlan_spaceId_purchaseDate_idx" ON "InstallmentPlan"("spaceId", "purchaseDate");
