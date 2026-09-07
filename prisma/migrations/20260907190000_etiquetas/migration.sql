-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#5b6478',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tag_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionTag" (
    "spaceId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("transactionId", "tagId"),
    CONSTRAINT "TransactionTag_spaceId_transactionId_fkey" FOREIGN KEY ("spaceId", "transactionId") REFERENCES "Transaction" ("spaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionTag_spaceId_tagId_fkey" FOREIGN KEY ("spaceId", "tagId") REFERENCES "Tag" ("spaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Tag_spaceId_idx" ON "Tag"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_spaceId_name_key" ON "Tag"("spaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_spaceId_id_key" ON "Tag"("spaceId", "id");

-- CreateIndex
CREATE INDEX "TransactionTag_tagId_idx" ON "TransactionTag"("tagId");

-- CreateIndex
CREATE INDEX "TransactionTag_spaceId_idx" ON "TransactionTag"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_spaceId_id_key" ON "Transaction"("spaceId", "id");

