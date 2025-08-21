-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_uploaded_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accountId" TEXT,
    "bankName" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'CHECKING',
    "statementType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "processedAt" DATETIME,
    "errorMessage" TEXT,
    "transactionCount" INTEGER,
    "processingDetails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uploaded_files_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_uploaded_files" ("accountType", "createdAt", "errorMessage", "filePath", "fileSize", "filename", "id", "originalName", "processedAt", "processingDetails", "statementType", "status", "transactionCount") SELECT "accountType", "createdAt", "errorMessage", "filePath", "fileSize", "filename", "id", "originalName", "processedAt", "processingDetails", "statementType", "status", "transactionCount" FROM "uploaded_files";
DROP TABLE "uploaded_files";
ALTER TABLE "new_uploaded_files" RENAME TO "uploaded_files";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
