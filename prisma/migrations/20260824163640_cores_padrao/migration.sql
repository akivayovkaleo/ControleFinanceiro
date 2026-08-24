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
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#5b6478',
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("archived", "color", "createdAt", "icon", "id", "isDefault", "kind", "name", "sortOrder", "spaceId", "updatedAt") SELECT "archived", "color", "createdAt", "icon", "id", "isDefault", "kind", "name", "sortOrder", "spaceId", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE INDEX "Category_spaceId_kind_archived_idx" ON "Category"("spaceId", "kind", "archived");
CREATE UNIQUE INDEX "Category_spaceId_name_kind_key" ON "Category"("spaceId", "name", "kind");
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCents" INTEGER NOT NULL,
    "targetDate" DATETIME,
    "color" TEXT NOT NULL DEFAULT '#3b6fd4',
    "icon" TEXT NOT NULL DEFAULT 'target',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("archived", "color", "createdAt", "icon", "id", "name", "spaceId", "targetCents", "targetDate", "updatedAt") SELECT "archived", "color", "createdAt", "icon", "id", "name", "spaceId", "targetCents", "targetDate", "updatedAt" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_spaceId_archived_idx" ON "Goal"("spaceId", "archived");
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "displayName" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b6fd4',
    "monthlyIncomeCents" INTEGER,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("color", "displayName", "id", "joinedAt", "monthlyIncomeCents", "role", "spaceId", "userId") SELECT "color", "displayName", "id", "joinedAt", "monthlyIncomeCents", "role", "spaceId", "userId" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE INDEX "Membership_spaceId_idx" ON "Membership"("spaceId");
CREATE UNIQUE INDEX "Membership_userId_spaceId_key" ON "Membership"("userId", "spaceId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL DEFAULT '#3b6fd4',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "lastSpaceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarColor", "createdAt", "email", "id", "lastSpaceId", "name", "passwordHash", "theme", "updatedAt") SELECT "avatarColor", "createdAt", "email", "id", "lastSpaceId", "name", "passwordHash", "theme", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
