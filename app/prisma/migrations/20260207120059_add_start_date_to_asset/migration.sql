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
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributionAmount" REAL NOT NULL DEFAULT 0,
    "allocationPercent" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "channelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_subPortfolioId_fkey" FOREIGN KEY ("subPortfolioId") REFERENCES "SubPortfolio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("allocationPercent", "channelId", "contributionAmount", "costPrice", "createdAt", "currency", "currentPrice", "id", "market", "name", "portfolioId", "quantity", "source", "subPortfolioId", "symbol", "updatedAt") SELECT "allocationPercent", "channelId", "contributionAmount", "costPrice", "createdAt", "currency", "currentPrice", "id", "market", "name", "portfolioId", "quantity", "source", "subPortfolioId", "symbol", "updatedAt" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE INDEX "Asset_portfolioId_idx" ON "Asset"("portfolioId");
CREATE INDEX "Asset_subPortfolioId_idx" ON "Asset"("subPortfolioId");
CREATE UNIQUE INDEX "Asset_portfolioId_symbol_key" ON "Asset"("portfolioId", "symbol");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
