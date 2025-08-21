/*
  Warnings:

  - You are about to drop the column `accountId` on the `statements` table. All the data in the column will be lost.
  - You are about to drop the column `beginningBalance` on the `statements` table. All the data in the column will be lost.
  - You are about to drop the column `endingBalance` on the `statements` table. All the data in the column will be lost.
  - You are about to drop the column `totalCredits` on the `statements` table. All the data in the column will be lost.
  - You are about to drop the column `totalDebits` on the `statements` table. All the data in the column will be lost.
  - You are about to drop the column `transactionCount` on the `statements` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "statement_account_sections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "lastFour" TEXT,
    "beginningBalance" REAL,
    "endingBalance" REAL,
    "totalDebits" REAL,
    "totalCredits" REAL,
    "transactionCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "statement_account_sections_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "statement_account_sections_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_statements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "statementDate" DATETIME NOT NULL,
    "periodStartDate" DATETIME NOT NULL,
    "periodEndDate" DATETIME NOT NULL,
    "statementType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "statements_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "uploaded_files" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "statements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_statements" ("createdAt", "id", "isReconciled", "notes", "periodEndDate", "periodStartDate", "statementDate", "statementType", "updatedAt", "uploadedFileId", "userId") SELECT "createdAt", "id", "isReconciled", "notes", "periodEndDate", "periodStartDate", "statementDate", "statementType", "updatedAt", "uploadedFileId", "userId" FROM "statements";
DROP TABLE "statements";
ALTER TABLE "new_statements" RENAME TO "statements";
CREATE INDEX "statements_userId_statementDate_idx" ON "statements"("userId", "statementDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "statement_account_sections_statementId_idx" ON "statement_account_sections"("statementId");

-- CreateIndex
CREATE INDEX "statement_account_sections_accountId_idx" ON "statement_account_sections"("accountId");
