/*
  Warnings:

  - You are about to drop the column `type` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `riskLevel` on the `Portfolio` table. All the data in the column will be lost.
  - You are about to drop the column `targetAllocation` on the `Portfolio` table. All the data in the column will be lost.
  - Added the required column `market` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "SubPortfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contributionAmount" REAL NOT NULL DEFAULT 0,
    "allocationPercent" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubPortfolio_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "subPortfolioId" TEXT,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "quantity" REAL NOT NULL DEFAULT 0,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "currentPrice" REAL NOT NULL DEFAULT 0,
    "contributionAmount" REAL NOT NULL DEFAULT 0,
    "allocationPercent" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_subPortfolioId_fkey" FOREIGN KEY ("subPortfolioId") REFERENCES "SubPortfolio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("costPrice", "createdAt", "currency", "currentPrice", "id", "name", "portfolioId", "quantity", "source", "symbol", "updatedAt") SELECT "costPrice", "createdAt", "currency", "currentPrice", "id", "name", "portfolioId", "quantity", "source", "symbol", "updatedAt" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE INDEX "Asset_portfolioId_idx" ON "Asset"("portfolioId");
CREATE INDEX "Asset_subPortfolioId_idx" ON "Asset"("subPortfolioId");
CREATE UNIQUE INDEX "Asset_portfolioId_symbol_key" ON "Asset"("portfolioId", "symbol");
CREATE TABLE "new_Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'CNY',
    "ruleType" TEXT,
    "contributionPeriod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Portfolio" ("baseCurrency", "createdAt", "id", "name", "updatedAt", "userId") SELECT "baseCurrency", "createdAt", "id", "name", "updatedAt", "userId" FROM "Portfolio";
DROP TABLE "Portfolio";
ALTER TABLE "new_Portfolio" RENAME TO "Portfolio";
CREATE INDEX "Portfolio_userId_idx" ON "Portfolio"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SubPortfolio_portfolioId_idx" ON "SubPortfolio"("portfolioId");
