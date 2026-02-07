-- AlterTable
ALTER TABLE "MarketInstrument" ADD COLUMN "fundType" TEXT;
ALTER TABLE "MarketInstrument" ADD COLUMN "managerName" TEXT;
ALTER TABLE "MarketInstrument" ADD COLUMN "navDate" DATETIME;
ALTER TABLE "MarketInstrument" ADD COLUMN "riskLevel" TEXT;
ALTER TABLE "MarketInstrument" ADD COLUMN "setupDate" DATETIME;
ALTER TABLE "MarketInstrument" ADD COLUMN "yield1m" REAL;
ALTER TABLE "MarketInstrument" ADD COLUMN "yield1w" REAL;
ALTER TABLE "MarketInstrument" ADD COLUMN "yield1y" REAL;
ALTER TABLE "MarketInstrument" ADD COLUMN "yield3m" REAL;
ALTER TABLE "MarketInstrument" ADD COLUMN "yield6m" REAL;
ALTER TABLE "MarketInstrument" ADD COLUMN "yield7d" REAL;
ALTER TABLE "MarketInstrument" ADD COLUMN "yieldSinceInception" REAL;
ALTER TABLE "MarketInstrument" ADD COLUMN "yieldYtd" REAL;

-- CreateIndex
CREATE INDEX "MarketInstrument_type_idx" ON "MarketInstrument"("type");
