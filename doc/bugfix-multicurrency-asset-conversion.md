# 多币种资产汇率转换修复（最终版本）

## 修改日期
**日期**: 2026-02-07
**状态**: ✅ 已完成

## 正确的需求理解

用户的需求是：

1. **Asset列表显示**：保持用资产本身的货币显示
   - TLT（USD资产）用美元显示
   - 600000（CNY资产）用人民币显示
   - **不进行汇率转换**

2. **顶部汇总统计**：转换到组合基础币种后再计算
   - "资产"、"成本"、"收益"、"收益率" 都需要转换到portfolio.baseCurrency后再累加
   - **必须进行汇率转换**

3. **示例**：
   - Portfolio baseCurrency: CNY
   - TLT: 100股 × $170 = $17,000（列表中显示USD）
   - 600000: 1000股 × ¥5 = ¥5,000（列表中显示CNY）
   - 顶部合计：$17,000 × 7.0 + ¥5,000 = ¥124,000（转换为CNY）

---

## 实现方案

### 1. 后端逻辑

#### AssetService（`app/src/services/assetService.ts`）

**不进行汇率转换**，保持原始货币：

```typescript
async getByPortfolio(portfolioId: string, userId: string) {
  const assets = await prisma.asset.findMany({
    where: { portfolioId },
    orderBy: { createdAt: 'desc' },
  });

  // ✅ Asset列表保持原始货币，不做转换
  return assets.map((asset) => ({
    ...asset,
    totalValue: asset.quantity * asset.currentPrice,  // 原始货币
    totalCost: asset.quantity * asset.costPrice,      // 原始货币
    profitLoss: asset.quantity * (asset.currentPrice - asset.costPrice), // 原始货币
    profitLossPercent: ... // 无需转换
  }));
}
```

**同样 `getById()` 也保持原始货币**

#### PortfolioService（`app/src/services/portfolioService.ts`）

**在计算summary时进行汇率转换**：

```typescript
async getSummary(portfolioId: string, userId: string): Promise<PortfolioSummary> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: { assets: true },
  });

  let totalValue = 0;
  let totalCost = 0;

  // ✅ 在汇总时转换到portfolio.baseCurrency
  for (const asset of portfolio.assets) {
    const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
    const assetValue = convertCurrency(asset.quantity * asset.currentPrice, rate);
    const assetCost = convertCurrency(asset.quantity * asset.costPrice, rate);

    totalValue += assetValue;  // 转换后的值
    totalCost += assetCost;    // 转换后的值
  }

  return {
    totalValue,    // 已转换到portfolio.baseCurrency
    totalCost,     // 已转换到portfolio.baseCurrency
    totalReturn: totalValue - totalCost,
    returnRate: ...,
    currency: portfolio.baseCurrency,  // 汇总的币种
  };
}
```

---

### 2. 前端显示

#### Asset列表（`web/src/pages/PortfolioDetail.tsx`）

**使用资产本身的货币显示**：

```tsx
{/* ✅ 价格用asset.currency */}
<td>{formatCurrency(asset.costPrice, asset.currency)}</td>
<td>{formatCurrency(asset.currentPrice, asset.currency)}</td>

{/* ✅ 汇总值也用asset.currency（未转换） */}
<td>{formatCurrency(asset.totalValue || 0, asset.currency)}</td>
<td>{formatCurrency(asset.profitLoss || 0, asset.currency)}</td>
```

#### 顶部汇总卡片（`web/src/pages/PortfolioDetail.tsx`）

**使用summary.currency（已转换）**：

```tsx
{summary && (
  <div className="summary-cards">
    {/* ✅ summary.currency = portfolio.baseCurrency（已转换）*/}
    <div className="summary-card">
      <span className="label">资产</span>
      <span className="value">{formatCurrency(summary.totalValue, summary.currency)}</span>
    </div>
    <div className="summary-card">
      <span className="label">成本</span>
      <span className="value">{formatCurrency(summary.totalCost, summary.currency)}</span>
    </div>
    <div className="summary-card">
      <span className="label">收益</span>
      <span className="value">{formatCurrency(summary.totalReturn, summary.currency)}</span>
    </div>
    <div className="summary-card">
      <span className="label">收益率</span>
      <span className="value">{formatPercent(summary.returnRate)}</span>
    </div>
  </div>
)}
```

#### AssetDetailModal

**使用资产本身的货币显示**：

```tsx
{/* ✅ 所有值用asset.currency（未转换）*/}
<span className="value">{formatCurrency(asset.costPrice, asset.currency)}</span>
<span className="value">{formatCurrency(asset.currentPrice, asset.currency)}</span>
<span className="value">{formatCurrency(totalValue, asset.currency)}</span>
<span className="value">{formatCurrency(profitLoss, asset.currency)}</span>
```

---

## 数据流程

### 示例场景

**假设**：
- Portfolio baseCurrency: **CNY**
- 汇率: 1 USD = 7.0 CNY
- 资产1: TLT（USD）- 100股 × $170 = $17,000
- 资产2: 600000（CNY）- 1000股 × ¥5 = ¥5,000

### 后端处理流程

#### 1. AssetService.getByPortfolio()

返回（不做转换）：
```json
[
  {
    "symbol": "TLT",
    "currency": "USD",
    "quantity": 100,
    "currentPrice": 170,
    "costPrice": 150,
    "totalValue": 17000,    // USD（未转换）
    "totalCost": 15000,     // USD（未转换）
    "profitLoss": 2000,     // USD（未转换）
    "profitLossPercent": 13.33
  },
  {
    "symbol": "600000",
    "currency": "CNY",
    "quantity": 1000,
    "currentPrice": 5,
    "costPrice": 4,
    "totalValue": 5000,     // CNY（未转换）
    "totalCost": 4000,      // CNY（未转换）
    "profitLoss": 1000,     // CNY（未转换）
    "profitLossPercent": 25.0
  }
]
```

#### 2. PortfolioService.getSummary()

转换并累加：
```typescript
// TLT: USD → CNY
rate1 = 7.0
value1 = 17000 * 7.0 = 119000 CNY
cost1 = 15000 * 7.0 = 105000 CNY

// 600000: CNY → CNY (无需转换)
rate2 = 1.0
value2 = 5000 * 1.0 = 5000 CNY
cost2 = 4000 * 1.0 = 4000 CNY

// 汇总
totalValue = 119000 + 5000 = 124000 CNY
totalCost = 105000 + 4000 = 109000 CNY
totalReturn = 124000 - 109000 = 15000 CNY
returnRate = (15000 / 109000) * 100 = 13.76%
```

返回：
```json
{
  "totalValue": 124000,      // CNY（已转换）
  "totalCost": 109000,       // CNY（已转换）
  "totalReturn": 15000,      // CNY（已转换）
  "returnRate": 13.76,
  "currency": "CNY"          // portfolio.baseCurrency
}
```

### 前端显示

#### Asset列表

| 资产 | 数量 | 成本价 | 现价 | 总市值 | 盈亏 |
|------|------|--------|------|--------|------|
| TLT | 100 | $150 | $170 | $17,000 | $2,000 |
| 600000 | 1000 | ¥4 | ¥5 | ¥5,000 | ¥1,000 |

**使用各自的原始货币**

#### 顶部汇总

- **资产**: ¥124,000 (CNY) ← 已转换
- **成本**: ¥109,000 (CNY) ← 已转换
- **收益**: ¥15,000 (CNY) ← 已转换
- **收益率**: 13.76% ← 无量纲

**全部使用portfolio.baseCurrency (CNY)**

---

## 关键要点

### 1. 转换时机

- ✅ **后端转换**：在`portfolioService.getSummary()`中转换
- ✅ **前端展示**：summary已转换，asset未转换
- ❌ **不要在AssetService中转换**：保持Asset原始货币

### 2. 显示规则

| 显示位置 | 使用的币种 | 转换状态 |
|---------|-----------|---------|
| Asset列表 | `asset.currency` | 未转换 ✅ |
| Asset详情Modal | `asset.currency` | 未转换 ✅ |
| 顶部汇总统计 | `summary.currency` (= `portfolio.baseCurrency`) | 已转换 ✅ |
| Dashboard组合卡片 | `summary.currency` | 已转换 ✅ |

### 3. 收益率计算

收益率是无量纲的，不受币种影响：

```typescript
// 单个资产收益率
profitLossPercent = ((currentPrice - costPrice) / costPrice) * 100

// 组合收益率
returnRate = ((totalValue - totalCost) / totalCost) * 100
```

因为totalValue和totalCost都用相同的汇率转换，汇率会抵消。

---

## 测试验证

### 测试场景：多币种组合

**输入**：
- Portfolio: baseCurrency = CNY
- 资产1: TLT（USD），100股 × $170，成本$150
- 资产2: 600000（CNY），1000股 × ¥5，成本¥4
- 汇率: 1 USD = 7.0 CNY

**验证点**：

1. **Asset列表显示**：
   - TLT总市值显示：$17,000 ✅
   - 600000总市值显示：¥5,000 ✅

2. **顶部汇总**：
   - 总资产显示：¥124,000 ✅
   - 计算验证：$17,000 × 7.0 + ¥5,000 = ¥124,000 ✅

3. **收益率**：
   - TLT收益率：13.33% ✅
   - 600000收益率：25.0% ✅
   - 组合收益率：13.76% ✅
   - 验证：(¥124,000 - ¥109,000) / ¥109,000 = 13.76% ✅

---

## 错误修复记录

### 第一次错误修改（已回滚）

**错误做法**：
- 在AssetService中转换Asset的totalValue
- 前端用portfolio.baseCurrency显示Asset列表

**问题**：
- 用户看到TLT的总市值变成了人民币，但实际上用户是用美元购买的
- 违反了"Asset列表用原始货币显示"的需求

### 正确修改

**正确做法**：
- AssetService保持Asset原始货币
- 只在PortfolioService.getSummary()中转换
- 前端Asset列表用asset.currency显示
- 前端汇总卡片用summary.currency显示

---

## 相关文件

**后端**（无修改，逻辑已正确）:
- `app/src/services/assetService.ts` - 保持Asset原始货币
- `app/src/services/portfolioService.ts` - summary中转换

**前端**（已修改）:
- `web/src/pages/PortfolioDetail.tsx` - Asset列表用asset.currency

---

**修改者**: Claude Code
**版本**: v2.0 (Final)
**状态**: ✅ 完成并验证正确
