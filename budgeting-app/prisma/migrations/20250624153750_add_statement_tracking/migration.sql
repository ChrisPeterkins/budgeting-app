-- AlterTable
ALTER TABLE "uploaded_files" ADD COLUMN "periodEndDate" DATETIME;
ALTER TABLE "uploaded_files" ADD COLUMN "periodStartDate" DATETIME;
ALTER TABLE "uploaded_files" ADD COLUMN "statementDate" DATETIME;

-- CreateTable
CREATE TABLE "statements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "statementDate" DATETIME NOT NULL,
    "periodStartDate" DATETIME NOT NULL,
    "periodEndDate" DATETIME NOT NULL,
    "beginningBalance" REAL,
    "endingBalance" REAL,
    "totalDebits" REAL,
    "totalCredits" REAL,
    "transactionCount" INTEGER,
    "statementType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "statements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "statements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "statements_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "uploaded_files" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "statements_accountId_statementDate_idx" ON "statements"("accountId", "statementDate");

-- CreateIndex
CREATE INDEX "statements_userId_statementDate_idx" ON "statements"("userId", "statementDate");
