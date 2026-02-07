# 基金公司 API 集成设计方案

## 1. 概述

### 1.1 目标
将三家中国基金公司（南方基金、博时基金、易方达）的 API 数据集成到 WealthCraft 系统中。

### 1.2 现有架构
- **数据模型**: `MarketInstrument` - 统一的市场标的表
- **同步服务**: `InstrumentSyncService` - 处理 NASDAQ、NYSE、AMEX、SSE 数据同步
- **HTTP 客户端**: `proxiedFetch` - 带重试机制的 HTTP 请求

### 1.3 新增 API
| 平台 | Host | 数据格式 | 特点 |
|------|------|---------|------|
| 南方基金 | www.nffund.com | JSON (POST) | 直接返回 JSON，数据量大 |
| 博时基金 | www.bosera.com | HTML + JavaScript | 需要解析 HTML，提取 `fundListJson` |
| 易方达基金 | www.efunds.com.cn | HTML + JavaScript | 需要解析 HTML，提取 `__FUND_SUPER_MARKET_DATA__` |

---

## 2. 数据模型设计

### 2.1 方案 A: 扩展 MarketInstrument（推荐）

**优点**:
- 统一的数据模型，简化查询
- 复用现有基础设施
- 易于维护

**缺点**:
- 某些字段对股票无意义
- 需要 Prisma 迁移

**实现**:

```prisma
// 投资标的主数据 - 从第三方API同步
model MarketInstrument {
  id           String   @id @default(uuid())
  symbol       String   // 股票/基金代码
  name         String   // 名称
  market       String   // 交易所: SSE, NASDAQ, NYSE, AMEX, US_ETF, NF_FUND, BOSERA, EFUNDS
  type         String   // 类型: STOCK, FUND, ETF, BOND
  currency     String   @default("CNY")

  // 价格相关
  lastPrice    Float    @default(0)
  change       Float    @default(0)       // 涨跌额
  changePercent Float   @default(0)       // 涨跌幅
  volume       Float    @default(0)       // 成交量
  marketCap    Float    @default(0)       // 市值

  // 基金特有字段（可选，仅基金使用）
  fundType         String?  // 基金类型: 股票型, 债券型, 混合型, 货币型, 指数型, QDII, FOF, REITs
  riskLevel        String?  // 风险等级: 低风险(R1), 中低风险(R2), 中风险(R3), 中高风险(R4), 高风险(R5)
  managerName      String?  // 基金经理
  setupDate        DateTime? // 成立日期
  navDate          DateTime? // 净值日期
  yield7d          Float?   // 七日年化收益率（货币基金）
  yield1m          Float?   // 近一月收益率
  yield3m          Float?   // 近三月收益率
  yield6m          Float?   // 近六月收益率
  yield1y          Float?   // 近一年收益率
  yieldYtd         Float?   // 今年以来收益率
  yieldSinceInception Float? // 成立以来收益率

  // 股票特有字段（可选，仅股票使用）
  sector       String?  // 行业
  industry     String?  // 细分行业
  country      String?  // 国家

  // 通用字段
  isActive     Boolean  @default(true) // 是否交易中
  lastSyncAt   DateTime @default(now()) // 最后同步时间
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([symbol, market])
  @@index([market])
  @@index([type])
  @@index([name])
  @@index([symbol])
}
```

### 2.2 方案 B: 创建独立的 Fund 表

**优点**:
- 字段更精确
- 不影响现有股票数据

**缺点**:
- 需要关联查询
- 代码复杂度增加

**不推荐**: 保持数据模型简单统一

---

## 3. 服务架构设计

### 3.1 目录结构

```
app/src/services/
├── instrumentSyncService.ts       # 现有：股票同步服务
├── fundSyncService.ts             # 新增：基金同步服务
├── fundDataExtractors/
│   ├── nffundExtractor.ts         # 南方基金数据提取器
│   ├── boseraExtractor.ts         # 博时基金数据提取器
│   └── efundsExtractor.ts         # 易方达基金数据提取器
└── types/
    └── fund.types.ts              # 基金类型定义
```

### 3.2 服务层次

```
┌─────────────────────────────────────────┐
│   InstrumentSyncService (现有)          │
│   - syncUSExchange()                    │
│   - syncUSETF()                         │
│   - syncSSEStock/Fund/Bond()            │
└─────────────────────────────────────────┘
                 │
                 ├── 扩展 ──→ syncChineseFunds()
                                       │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
        ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
        │  南方基金     │      │  博时基金     │      │  易方达基金   │
        │  Extractor   │      │  Extractor   │      │  Extractor   │
        └──────────────┘      └──────────────┘      └──────────────┘
                 │                      │                      │
                 └──────────────────────┼──────────────────────┘
                                        ▼
                              ┌──────────────────┐
                              │ FundSyncService  │
                              │ - 统一数据格式   │
                              │ - 数据验证       │
                              │ - 批量写入 DB    │
                              └──────────────────┘
```

---

## 4. 数据提取器设计

### 4.1 统一接口

```typescript
// app/src/services/types/fund.types.ts

export interface FundData {
  code: string;           // 基金代码
  name: string;           // 基金名称
  market: string;         // 市场标识: NF_FUND, BOSERA, EFUNDS
  type: string;           // FUND

  // 价格数据
  lastPrice: number;      // 最新净值
  change: number;         // 日涨跌幅（%）

  // 基金特有数据
  fundType?: string;      // 基金类型
  riskLevel?: string;     // 风险等级
  managerName?: string;   // 基金经理

  // 收益率数据
  yield7d?: number;       // 七日年化（货币基金）
  yield1m?: number;       // 近一月
  yield3m?: number;       // 近三月
  yield6m?: number;       // 近六月
  yield1y?: number;       // 近一年
  yieldYtd?: number;      // 今年以来
  yieldSinceInception?: number; // 成立以来

  // 日期
  navDate?: Date;         // 净值日期
  setupDate?: Date;       // 成立日期

  // 状态
  isActive: boolean;      // 是否可交易
}

export interface IFundDataExtractor {
  fetch(): Promise<FundData[]>;
  getSource(): string;    // 返回数据源名称
}
```

### 4.2 南方基金提取器

```typescript
// app/src/services/fundDataExtractors/nffundExtractor.ts

import { proxiedFetch } from '../../utils/httpClient';
import { IFundDataExtractor, FundData } from '../types/fund.types';
import { logger } from '../../utils/logger';

export class NFFundExtractor implements IFundDataExtractor {
  async fetch(): Promise<FundData[]> {
    try {
      logger.info('[NFFund] Starting data fetch...');

      const response = await proxiedFetch(
        'https://www.nffund.com/nfwebApi/fund/supermarket',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`NFFund API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.code !== 'ETS-5BP00000') {
        throw new Error(`NFFund API error: ${result.message}`);
      }

      const rawData = result.data.g_index_hblist || [];
      logger.info(`[NFFund] Fetched ${rawData.length} funds`);

      return this.transform(rawData);
    } catch (error) {
      logger.error('[NFFund] Fetch failed', error);
      throw error;
    }
  }

  private transform(rawData: any[]): FundData[] {
    return rawData.map(item => {
      const navDate = item.fdate ? this.parseDate(item.fdate) : undefined;

      return {
        code: item.fundcode,
        name: item.fundname,
        market: 'NF_FUND',
        type: 'FUND',

        lastPrice: parseFloat(item.nav) || 0,
        change: parseFloat(item.upRatio) || 0,

        fundType: this.extractFundType(item.webFirstCategorys),
        managerName: item.fundManagerName || undefined,

        yield7d: parseFloat(item.fmqwsl) || undefined, // 万份收益转七日年化
        yield1m: parseFloat(item.recentOneMonth) || undefined,
        yield1y: parseFloat(item.recentOneYear) || undefined,
        yieldYtd: parseFloat(item.thisYear) || undefined,
        yieldSinceInception: parseFloat(item.since) || undefined,

        navDate,
        isActive: item.status === '1',
      };
    });
  }

  private extractFundType(categoryCode: string): string {
    // 根据分类代码映射到基金类型
    // TODO: 实现映射逻辑
    return '混合型';
  }

  private parseDate(str: string): Date {
    // YYYYMMDD → Date
    if (!str || str.length !== 8) return new Date();
    const year = parseInt(str.substring(0, 4));
    const month = parseInt(str.substring(4, 6)) - 1;
    const day = parseInt(str.substring(6, 8));
    return new Date(year, month, day);
  }

  getSource(): string {
    return '南方基金';
  }
}
```

### 4.3 博时基金提取器

```typescript
// app/src/services/fundDataExtractors/boseraExtractor.ts

import { proxiedFetch } from '../../utils/httpClient';
import { IFundDataExtractor, FundData } from '../types/fund.types';
import { logger } from '../../utils/logger';

export class BoseraExtractor implements IFundDataExtractor {
  async fetch(): Promise<FundData[]> {
    try {
      logger.info('[Bosera] Starting data fetch...');

      const response = await proxiedFetch(
        'https://www.bosera.com/fund/index.html',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Bosera API error: ${response.status}`);
      }

      const html = await response.text();

      // 提取 window.fundListJson
      const match = html.match(/window\.fundListJson\s*=\s*(\[.*?\]);/s);

      if (!match) {
        throw new Error('Bosera: Unable to extract fundListJson from HTML');
      }

      const rawData = JSON.parse(match[1]);
      logger.info(`[Bosera] Extracted ${rawData.length} funds`);

      return this.transform(rawData);
    } catch (error) {
      logger.error('[Bosera] Fetch failed', error);
      throw error;
    }
  }

  private transform(rawData: any[]): FundData[] {
    return rawData.map(item => {
      const navDate = item.netDate ? new Date(item.netDate) : undefined;

      return {
        code: item.fundCode,
        name: item.fundName,
        market: 'BOSERA',
        type: 'FUND',

        lastPrice: parseFloat(item.netValue) || 0,
        change: parseFloat(item.rate) || 0,

        fundType: item.fundTypeShow,
        riskLevel: item.fundRisk,

        // 小数格式收益率需要乘以 100
        yield1w: parseFloat(item.weekYield) * 100 || undefined,
        yield1m: parseFloat(item.monthYield) * 100 || undefined,
        yield3m: parseFloat(item.threeMonthYield) * 100 || undefined,
        yield6m: parseFloat(item.halfYearYield) * 100 || undefined,
        yield1y: parseFloat(item.yearYield) * 100 || undefined,
        yieldYtd: parseFloat(item.thisYearYield) * 100 || undefined,
        yieldSinceInception: parseFloat(item.totalYield) * 100 || undefined,

        navDate,
        isActive: item.fundStatus === '0',
      };
    });
  }

  getSource(): string {
    return '博时基金';
  }
}
```

### 4.4 易方达基金提取器

```typescript
// app/src/services/fundDataExtractors/efundsExtractor.ts

import { proxiedFetch } from '../../utils/httpClient';
import { IFundDataExtractor, FundData } from '../types/fund.types';
import { logger } from '../../utils/logger';

export class EFundsExtractor implements IFundDataExtractor {
  async fetch(): Promise<FundData[]> {
    try {
      logger.info('[EFunds] Starting data fetch...');

      const response = await proxiedFetch(
        'https://www.efunds.com.cn/lm/jjcp/',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`EFunds API error: ${response.status}`);
      }

      const html = await response.text();

      // 提取 __FUND_SUPER_MARKET_DATA__
      const match = html.match(/var __FUND_SUPER_MARKET_DATA__\s*=\s*(\[.*?\]);/s);

      if (!match) {
        throw new Error('EFunds: Unable to extract __FUND_SUPER_MARKET_DATA__ from HTML');
      }

      const rawData = JSON.parse(match[1]);
      logger.info(`[EFunds] Extracted ${rawData.length} funds`);

      return this.transform(rawData);
    } catch (error) {
      logger.error('[EFunds] Fetch failed', error);
      throw error;
    }
  }

  private transform(rawData: any[]): FundData[] {
    return rawData.map(item => {
      const navDate = item.tdate ? this.parseDate(item.tdate) : undefined;
      const setupDate = item.setupdate ? new Date(item.setupdate) : undefined;

      return {
        code: item.fundcode,
        name: item.fundname,
        market: 'EFUNDS',
        type: 'FUND',

        lastPrice: parseFloat(item.netvalue) || 0,
        change: parseFloat(item.rzd) || 0,

        fundType: item.fundType,
        riskLevel: item.properties?.riskLevel,
        managerName: item.managerName,

        yield7d: parseFloat(item.qrnh) || undefined,
        yield1m: parseFloat(item.lastMonthIncome) || undefined,
        yield1y: parseFloat(item.lastYearIncome) || undefined,
        yieldYtd: parseFloat(item.thisYearIncome) || undefined,
        yieldSinceInception: parseFloat(item.sinceIncome) || undefined,

        navDate,
        setupDate,
        isActive: item.state === '0',
      };
    });
  }

  private parseDate(str: string): Date {
    // YYYYMMDD → Date
    if (!str || str.length !== 8) return new Date();
    const year = parseInt(str.substring(0, 4));
    const month = parseInt(str.substring(4, 6)) - 1;
    const day = parseInt(str.substring(6, 8));
    return new Date(year, month, day);
  }

  getSource(): string {
    return '易方达基金';
  }
}
```

---

## 5. 基金同步服务

```typescript
// app/src/services/fundSyncService.ts

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { NFFundExtractor } from './fundDataExtractors/nffundExtractor';
import { BoseraExtractor } from './fundDataExtractors/boseraExtractor';
import { EFundsExtractor } from './fundDataExtractors/efundsExtractor';
import { FundData } from './types/fund.types';

export class FundSyncService {
  private extractors = [
    new NFFundExtractor(),
    new BoseraExtractor(),
    new EFundsExtractor(),
  ];

  // 同步所有基金公司数据
  async syncAll(): Promise<Record<string, { success: number; failed: number }>> {
    const results: Record<string, { success: number; failed: number }> = {};

    for (const extractor of this.extractors) {
      const source = extractor.getSource();
      try {
        logger.info(`[FundSync] Starting sync for ${source}...`);

        const funds = await extractor.fetch();

        let success = 0;
        let failed = 0;

        for (const fund of funds) {
          try {
            await this.upsertFund(fund);
            success++;
          } catch (error) {
            failed++;
            logger.error(`[FundSync] Failed to upsert fund ${fund.code}`, error);
          }
        }

        results[source] = { success, failed };
        logger.info(`[FundSync] ${source} sync completed: ${success} success, ${failed} failed`);
      } catch (error) {
        logger.error(`[FundSync] ${source} sync failed`, error);
        results[source] = { success: 0, failed: 0 };
      }
    }

    return results;
  }

  // 同步单个基金公司
  async syncSource(sourceName: string): Promise<{ success: number; failed: number }> {
    const extractor = this.extractors.find(e => e.getSource() === sourceName);

    if (!extractor) {
      throw new Error(`Unknown fund source: ${sourceName}`);
    }

    const funds = await extractor.fetch();
    let success = 0;
    let failed = 0;

    for (const fund of funds) {
      try {
        await this.upsertFund(fund);
        success++;
      } catch (error) {
        failed++;
        logger.error(`[FundSync] Failed to upsert fund ${fund.code}`, error);
      }
    }

    return { success, failed };
  }

  // 更新或插入基金数据
  private async upsertFund(fund: FundData): Promise<void> {
    await prisma.marketInstrument.upsert({
      where: {
        symbol_market: {
          symbol: fund.code,
          market: fund.market,
        },
      },
      update: {
        name: fund.name,
        lastPrice: fund.lastPrice,
        changePercent: fund.change,
        fundType: fund.fundType,
        riskLevel: fund.riskLevel,
        managerName: fund.managerName,
        yield7d: fund.yield7d,
        yield1m: fund.yield1m,
        yield3m: fund.yield3m,
        yield6m: fund.yield6m,
        yield1y: fund.yield1y,
        yieldYtd: fund.yieldYtd,
        yieldSinceInception: fund.yieldSinceInception,
        navDate: fund.navDate,
        setupDate: fund.setupDate,
        isActive: fund.isActive,
        lastSyncAt: new Date(),
      },
      create: {
        symbol: fund.code,
        name: fund.name,
        market: fund.market,
        type: fund.type,
        currency: 'CNY',
        lastPrice: fund.lastPrice,
        changePercent: fund.change,
        fundType: fund.fundType,
        riskLevel: fund.riskLevel,
        managerName: fund.managerName,
        yield7d: fund.yield7d,
        yield1m: fund.yield1m,
        yield3m: fund.yield3m,
        yield6m: fund.yield6m,
        yield1y: fund.yield1y,
        yieldYtd: fund.yieldYtd,
        yieldSinceInception: fund.yieldSinceInception,
        navDate: fund.navDate,
        setupDate: fund.setupDate,
        isActive: fund.isActive,
        lastSyncAt: new Date(),
      },
    });
  }

  // 获取统计信息
  async getStats(): Promise<{
    total: number;
    byMarket: Array<{ market: string; count: number }>;
  }> {
    const markets = ['NF_FUND', 'BOSERA', 'EFUNDS'];

    const counts = await Promise.all(
      markets.map(async (market) => ({
        market,
        count: await prisma.marketInstrument.count({
          where: { market },
        }),
      }))
    );

    const total = counts.reduce((sum, item) => sum + item.count, 0);

    return {
      total,
      byMarket: counts.filter(item => item.count > 0),
    };
  }
}
```

---

## 6. 集成到现有服务

### 6.1 扩展 InstrumentSyncService

```typescript
// app/src/services/instrumentSyncService.ts

import { FundSyncService } from './fundSyncService';

export class InstrumentSyncService {
  private fundSyncService = new FundSyncService();

  // 新增：同步所有中国基金
  async syncChineseFunds(): Promise<Record<string, { success: number; failed: number }>> {
    logger.info('Starting Chinese funds sync...');
    return await this.fundSyncService.syncAll();
  }

  // 新增：同步单个基金公司
  async syncSingleFundSource(sourceName: '南方基金' | '博时基金' | '易方达基金'): Promise<{ success: number; failed: number }> {
    return await this.fundSyncService.syncSource(sourceName);
  }

  // 修改：原有的 syncAll 方法增加基金同步
  async syncAll() {
    // 原有逻辑...
    const usStock = await this.syncAllUS();
    const usETF = await this.syncUSETF();
    const sse = await this.syncAllSSE();

    // 新增：基金同步
    const funds = await this.syncChineseFunds();

    return {
      usStock,
      usETF,
      sse,
      funds, // 新增
    };
  }
}
```

### 6.2 服务器启动时同步

```typescript
// app/src/server.ts

// 在启动时检查是否需要同步基金数据
if (config.forceSyncOnStartup) {
  // 原有逻辑...
  await instrumentSyncService.syncAll();
} else {
  // 原有逻辑...
  const stats = await instrumentSyncService.getStats();

  // 新增：检查基金数据
  const fundStats = await instrumentSyncService.getFundStats();
  logger.info(`Current funds: ${fundStats.total} (by market: ${JSON.stringify(fundStats.byMarket)})`);

  if (fundStats.total === 0) {
    logger.info('No fund data found, starting initial sync...');
    instrumentSyncService.syncChineseFunds()
      .then((result) => {
        logger.info('Initial fund sync completed:', result);
      })
      .catch((err) => {
        logger.error('Initial fund sync failed', err);
      });
  }
}
```

---

## 7. 配置管理

### 7.1 环境变量

```bash
# .env
# ... 现有配置 ...

# 基金同步配置
FUND_SYNC_ENABLED=true                    # 是否启用基金同步
FUND_SYNC_CRON="0 20 * * 1-5"            # 同步时间（工作日 20:00）
FUND_SYNC_ON_STARTUP=false               # 启动时是否同步（默认关闭，数据量大）
```

### 7.2 配置文件

```typescript
// app/src/config/index.ts

export const config = {
  // ... 现有配置 ...

  // 基金同步配置
  fundSyncEnabled: process.env.FUND_SYNC_ENABLED === 'true',
  fundSyncCron: process.env.FUND_SYNC_CRON || '0 20 * * 1-5',
  fundSyncOnStartup: process.env.FUND_SYNC_ON_STARTUP === 'false',
};
```

---

## 8. 错误处理

### 8.1 数据提取错误

```typescript
// 提取器基类
export abstract class BaseFundExtractor implements IFundDataExtractor {
  abstract fetch(): Promise<FundData[]>;
  abstract getSource(): string;

  protected async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    // 复用现有的重试机制
    return proxiedFetch(url, options);
  }

  protected parseHTMLData(html: string, pattern: RegExp): any[] {
    try {
      const match = html.match(pattern);
      if (!match) {
        throw new Error('Pattern not found in HTML');
      }
      return JSON.parse(match[1]);
    } catch (error) {
      logger.error(`Failed to parse HTML data: ${error.message}`);
      throw error;
    }
  }
}
```

### 8.2 数据验证

```typescript
// 数据验证器
export class FundDataValidator {
  static validate(fund: FundData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!fund.code || fund.code.length === 0) {
      errors.push('Fund code is required');
    }

    if (!fund.name || fund.name.length === 0) {
      errors.push('Fund name is required');
    }

    if (fund.lastPrice < 0) {
      errors.push('Last price cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 在 upsertFund 中使用
private async upsertFund(fund: FundData): Promise<void> {
  const validation = FundDataValidator.validate(fund);
  if (!validation.valid) {
    throw new Error(`Invalid fund data: ${validation.errors.join(', ')}`);
  }

  // ... upsert 逻辑
}
```

---

## 9. 性能优化

### 9.1 批量写入

```typescript
// 使用 Prisma 的 createMany 或 transaction
private async upsertFundsBatch(funds: FundData[]): Promise<void> {
  await prisma.$transaction(
    funds.map(fund =>
      prisma.marketInstrument.upsert({
        where: {
          symbol_market: { symbol: fund.code, market: fund.market },
        },
        update: { /* ... */ },
        create: { /* ... */ },
      })
    )
  );
}
```

### 9.2 并发控制

```typescript
import pLimit from 'p-limit';

const limit = pLimit(5); // 最多 5 个并发请求

async syncAll() {
  const tasks = this.extractors.map(extractor =>
    limit(() => this.syncSource(extractor.getSource()))
  );

  const results = await Promise.all(tasks);
  return results;
}
```

### 9.3 增量更新

```typescript
// 只更新有变化的记录
private async upsertFundIfChanged(fund: FundData): Promise<boolean> {
  const existing = await prisma.marketInstrument.findUnique({
    where: {
      symbol_market: { symbol: fund.code, market: fund.market },
    },
  });

  if (!existing) {
    await this.upsertFund(fund);
    return true;
  }

  // 检查是否有重要字段变化
  if (
    existing.lastPrice !== fund.lastPrice ||
    existing.changePercent !== fund.change ||
    existing.lastSyncAt < new Date(Date.now() - 24 * 60 * 60 * 1000) // 超过24小时
  ) {
    await this.upsertFund(fund);
    return true;
  }

  return false; // 无变化，跳过
}
```

---

## 10. 监控和日志

### 10.1 同步日志

```typescript
logger.info(`[FundSync] ${source} sync started`);
logger.info(`[FundSync] Fetched ${funds.length} funds from ${source}`);
logger.info(`[FundSync] ${source} sync completed: ${success} success, ${failed} failed`);
```

### 10.2 性能监控

```typescript
const startTime = Date.now();
// ... 同步逻辑 ...
const duration = Date.now() - startTime;
logger.info(`[FundSync] ${source} sync took ${duration}ms`);
```

---

## 11. 测试策略

### 11.1 单元测试

```typescript
// __tests__/fundDataExtractors/nffundExtractor.test.ts

describe('NFFundExtractor', () => {
  it('should transform raw data correctly', () => {
    const extractor = new NFFundExtractor();
    const rawData = [/* mock data */];
    const result = extractor.transform(rawData);

    expect(result[0].code).toBe('000084');
    expect(result[0].name).toBe('南方收益宝货币B');
  });
});
```

### 11.2 集成测试

```typescript
describe('FundSyncService', () => {
  it('should sync all fund sources', async () => {
    const service = new FundSyncService();
    const results = await service.syncAll();

    expect(results).toHaveProperty('南方基金');
    expect(results).toHaveProperty('博时基金');
    expect(results).toHaveProperty('易方达基金');
  });
});
```

---

## 12. 部署计划

### 12.1 Phase 1: 数据库迁移
1. 添加基金字段到 MarketInstrument
2. 运行 Prisma 迁移

### 12.2 Phase 2: 服务开发
1. 创建数据提取器
2. 创建基金同步服务
3. 集成到现有服务

### 12.3 Phase 3: 测试
1. 单元测试
2. 集成测试
3. 手动测试

### 12.4 Phase 4: 部署
1. 灰度发布（先同步一个基金公司）
2. 监控性能
3. 全量发布

---

## 13. 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| HTML 解析失败 | 数据无法提取 | 1. 增强错误处理<br>2. 定期检查 HTML 结构变化 |
| 数据格式变化 | 同步失败 | 1. 版本化提取器<br>2. 添加数据验证 |
| 性能问题 | 同步缓慢 | 1. 批量写入<br>2. 并发控制<br>3. 增量更新 |
| 数据量过大 | 内存溢出 | 1. 流式处理<br>2. 分批同步 |

---

## 14. 总结

本设计方案提供了一种系统化的方法来集成三家中国基金公司的 API 数据：

1. **统一的数据模型** - 扩展现有的 MarketInstrument 表
2. **模块化的提取器** - 每个基金公司一个提取器类
3. **集中式同步服务** - FundSyncService 管理所有基金同步
4. **渐进式集成** - 可以先集成一个，验证后再集成其他
5. **完善的错误处理** - 确保系统稳定性
6. **性能优化** - 批量写入、并发控制、增量更新

该设计保持了代码的可维护性和可扩展性，为将来添加更多基金公司 API 打下基础。
