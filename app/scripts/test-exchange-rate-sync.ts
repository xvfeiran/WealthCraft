#!/usr/bin/env tsx
import { exchangeRateService } from '../src/services/exchangeRateService';

async function test() {
  console.log('Testing exchange rate sync...\n');

  try {
    // Test 1: Sync latest rates
    console.log('1. Syncing latest rates...');
    const syncResult = await exchangeRateService.syncLatestRates();
    console.log(`   Sync result: ${syncResult.success} success, ${syncResult.failed} failed\n`);

    // Test 2: Get latest rate
    console.log('2. Getting latest USD/CNY rate...');
    const rate = await exchangeRateService.getLatestRate('USD', 'CNY');
    console.log(`   USD/CNY rate: ${rate}\n`);

    // Test 3: Get stats
    console.log('3. Getting statistics...');
    const stats = await exchangeRateService.getStats();
    console.log(`   Total records: ${stats.totalRecords}`);
    console.log(`   Currencies: ${stats.currencies.join(', ')}`);
    console.log(`   Latest date: ${stats.latestDate?.toISOString()}\n`);

    // Test 4: Get supported currencies
    console.log('4. Getting supported currencies...');
    const currencies = exchangeRateService.getSupportedCurrencies();
    console.log(`   Supported currencies: ${currencies.length}`);
    console.log(`   ${currencies.join(', ')}\n`);

    console.log('All tests passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

test();
