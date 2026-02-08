# Binance API Documentation

**平台信息**
- **Host**: `api.binance.com` (主站) 或 `data-api.binance.vision` (仅市场数据)
- **协议**: HTTPS
- **数据格式**: JSON
- **认证**: 公共市场数据端点无需 API Key
- **支持的交易对**: 300+ 加密货币交易对
- **地域限制**: ⚠️ **中国地区访问受限**，需要配置代理

### ⚠️ 重要提示：地域限制与代理配置

Binance API 在中国大陆地区受访问限制（HTTP 451错误）。在中国使用时**必须配置代理**。

#### 代理配置方法

**1. 在 `.env` 文件中配置代理**:
```bash
# HTTP/HTTPS 代理
PROXY_URL=http://proxy.example.com:8080

# 或使用 SOCKS5 代理
PROXY_URL=socks5://proxy.example.com:1080
```

**2. 常见代理服务**:
- VPN 服务器的本地代理端口
- Shadowsocks/V2Ray 本地 SOCKS5 代理 (通常在 `127.0.0.1:1080`)
- 企业代理服务器

**3. 验证代理配置**:
```bash
# 测试代理是否工作
curl -x http://127.0.0.1:1080 https://api.binance.com/api/v3/ping
# 期望输出: {} (空JSON对象表示成功)
```

**4. 无代理时的错误**:
```json
{
  "code": 0,
  "msg": "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms."
}
```

---

## API 概览

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/v3/ticker/price` | GET | 获取最新价格 | 无需 |
| `/api/v3/ticker/24hr` | GET | 获取24小时统计数据 | 无需 |
| `/api/v3/exchangeInfo` | GET | 获取交易所信息 | 无需 |

---

## 1. 获取所有交易对的最新价格

### 端点
```
GET https://api.binance.com/api/v3/ticker/price
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `symbol` | string | 否 | 交易对符号（例如：`BTCUSDT`），不提供则返回所有 |

### 示例请求

```bash
# 获取所有交易对价格
GET https://api.binance.com/api/v3/ticker/price

# 获取单个交易对价格
GET https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT
```

### 响应示例

**所有交易对响应**:
```json
[
  {
    "symbol": "BTCUSDT",
    "price": "43250.75000000"
  },
  {
    "symbol": "ETHUSDT",
    "price": "2315.42000000"
  },
  {
    "symbol": "BNBUSDT",
    "price": "315.88000000"
  }
]
```

**单个交易对响应**:
```json
{
  "symbol": "BTCUSDT",
  "price": "43250.75000000"
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `symbol` | string | 交易对符号（例如：BTCUSDT = 比特币/泰达币） |
| `price` | string | 最新价格（字符串格式，精度8位小数） |

---

## 2. 获取24小时价格变动统计

### 端点
```
GET https://api.binance.com/api/v3/ticker/24hr
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `symbol` | string | 否 | 交易对符号，不提供则返回所有 |
| `type` | string | 否 | `FULL` 或 `MINI`，默认 `FULL` |

### 示例请求

```bash
# 获取所有交易对24小时统计
GET https://api.binance.com/api/v3/ticker/24hr

# 获取单个交易对24小时统计
GET https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT

# 获取精简版数据（减少带宽）
GET https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT&type=MINI
```

### 响应示例

```json
[
  {
    "symbol": "BTCUSDT",
    "priceChange": "1250.50000000",
    "priceChangePercent": "2.975",
    "weightedAvgPrice": "42890.32000000",
    "prevClosePrice": "42000.25000000",
    "lastPrice": "43250.75000000",
    "lastQty": "0.00542000",
    "bidPrice": "43250.20000000",
    "bidQty": "1.25000000",
    "askPrice": "43251.00000000",
    "askQty": "2.15000000",
    "openPrice": "42000.25000000",
    "highPrice": "43800.00000000",
    "lowPrice": "41850.50000000",
    "volume": "34582.25000000",
    "quoteVolume": "1482345678.90000000",
    "openTime": 1707264000000,
    "closeTime": 1707350399999,
    "firstId": 123456789,
    "lastId": 123456890,
    "count": 102
  }
]
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `symbol` | string | 交易对符号 |
| `priceChange` | string | 24小时价格变动 |
| `priceChangePercent` | string | 24小时价格变动百分比 |
| `weightedAvgPrice` | string | 24小时加权平均价 |
| `prevClosePrice` | string | 前收盘价 |
| `lastPrice` | string | 最新价格 |
| `lastQty` | string | 最新成交量 |
| `bidPrice` | string | 当前最高买价 |
| `bidQty` | string | 当前最高买量 |
| `askPrice` | string | 当前最低卖价 |
| `askQty` | string | 当前最低卖量 |
| `openPrice` | string | 24小时内开盘价 |
| `highPrice` | string | 24小时内最高价 |
| `lowPrice` | string | 24小时内最低价 |
| `volume` | string | 24小时成交量（基础货币，如BTC） |
| `quoteVolume` | string | 24小时成交额（计价货币，如USDT） |
| `openTime` | number | 24小时开始时间戳 |
| `closeTime` | number | 24小时结束时间戳 |
| `firstId` | number | 首笔成交ID |
| `lastId` | number | 末笔成交ID |
| `count` | number | 24小时内成交笔数 |

---

## 3. 获取交易所信息

### 端点
```
GET https://api.binance.com/api/v3/exchangeInfo
```

### 示例请求

```bash
GET https://api.binance.com/api/v3/exchangeInfo
```

### 响应示例

```json
{
  "timezone": "UTC",
  "serverTime": 1707350400000,
  "symbols": [
    {
      "symbol": "BTCUSDT",
      "status": "TRADING",
      "baseAsset": "BTC",
      "baseAssetPrecision": 8,
      "quoteAsset": "USDT",
      "quotePrecision": 8,
      "quoteAssetPrecision": 8,
      "baseCommissionPrecision": 8,
      "quoteCommissionPrecision": 8,
      "orderTypes": [
        "LIMIT",
        "LIMIT_MAKER",
        "MARKET",
        "STOP_LOSS_LIMIT",
        "TAKE_PROFIT_LIMIT"
      ],
      "icebergAllowed": true,
      "ocoAllowed": true,
      "quoteOrderQtyMarketAllowed": true,
      "allowTrailingStop": false,
      "isSpotTradingAllowed": true,
      "isMarginTradingAllowed": true,
      "filters": [
        {
          "filterType": "PRICE_FILTER",
          "minPrice": "0.01000000",
          "maxPrice": "1000000.00000000",
          "tickSize": "0.01000000"
        }
      ]
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `timezone` | string | 交易所时区 |
| `serverTime` | number | 服务器时间戳 |
| `symbols` | array | 交易对信息列表 |
| `symbol` | string | 交易对符号 |
| `status` | string | 交易状态（`TRADING`, `BREAK`, `HALT`） |
| `baseAsset` | string | 基础资产（如BTC） |
| `quoteAsset` | string | 计价资产（如USDT） |
| `isSpotTradingAllowed` | boolean | 是否允许现货交易 |

---

## 支持的主要交易对

### 主流加密货币

| 交易对 | 名称 | 币种 |
|--------|------|------|
| BTCUSDT | Bitcoin | 比特币 |
| ETHUSDT | Ethereum | 以太坊 |
| BNBUSDT | BNB | 币安币 |
| XRPUSDT | XRP | 瑞波币 |
| ADAUSDT | Cardano | 艾达币 |
| SOLUSDT | Solana | Solana |
| DOGEUSDT | Dogecoin | 狗狗币 |
| DOTUSDT | Polkadot | 波卡 |
| MATICUSDT | Polygon | 马蹄链 |
| LTCUSDT | Litecoin | 莱特币 |
| AVAXUSDT | Avalanche | 雪崩 |
| LINKUSDT | Chainlink | 链链 |
| ATOMUSDT | Cosmos | 原子链 |
| UNIUSDT | Uniswap | UniSwap |

### 稳定币

| 交易对 | 说明 |
|--------|------|
| USDT | Tether (USD) |
| BUSD | Binance USD |
| USDC | USD Coin |

---

## 数据使用示例

### 获取并解析加密货币价格

```typescript
// 获取所有加密货币价格
const response = await fetch('https://api.binance.com/api/v3/ticker/price');
const data = await response.json();

for (const crypto of data) {
  const symbol = crypto.symbol; // 例如: "BTCUSDT"
  const price = parseFloat(crypto.price); // 例如: 43250.75

  // 解析基础货币和计价货币
  const quoteAsset = 'USDT';
  if (symbol.endsWith(quoteAsset)) {
    const baseAsset = symbol.replace(quoteAsset, ''); // "BTC"

    console.log(`${baseAsset}: $${price.toFixed(2)}`);
    // 输出: BTC: $43250.75
  }
}
```

### 获取并解析24小时统计数据

```typescript
// 获取加密货币24小时统计
const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
const data = await response.json();

for (const crypto of data) {
  const symbol = crypto.symbol;
  const lastPrice = parseFloat(crypto.lastPrice);
  const priceChange = parseFloat(crypto.priceChange);
  const priceChangePercent = parseFloat(crypto.priceChangePercent);
  const volume = parseFloat(crypto.volume);
  const quoteVolume = parseFloat(crypto.quoteVolume);

  console.log(`${symbol}:`);
  console.log(`  价格: $${lastPrice.toFixed(2)}`);
  console.log(`  涨跌: ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${priceChangePercent.toFixed(2)}%)`);
  console.log(`  成交量: ${volume.toFixed(4)}`);
  console.log(`  成交额: $${quoteVolume.toLocaleString()}`);
}
```

### 过滤USDT交易对

```typescript
// 只获取USDT计价的加密货币
const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
const allCryptos = await response.json();

// 过滤USDT交易对
const usdtPairs = allCryptos.filter(c => c.symbol.endsWith('USDT'));

console.log(`USDT交易对数量: ${usdtPairs.length}`);
// 输出: USDT交易对数量: 1800+

// 按成交额排序，获取前20名
const top20 = usdtPairs
  .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
  .slice(0, 20);

for (const crypto of top20) {
  const baseAsset = crypto.symbol.replace('USDT', '');
  console.log(`${baseAsset}: $${parseFloat(crypto.quoteVolume).toLocaleString()}`);
}
```

---

## 定时同步策略

### 建议同步频率
- **实时同步**: 加密货币市场24/7交易，价格波动频繁
- **推荐频率**: 每5-10分钟同步一次
- **批量同步**: 每次同步获取所有USDT交易对数据

### 实现示例（node-cron）

```typescript
import cron from 'node-cron';

// 每5分钟执行一次加密货币同步
cron.schedule('*/5 * * * *', async () => {
  console.log('Starting cryptocurrency sync...');
  await syncCryptocurrencies();
});
```

---

## 错误处理

### 常见错误

1. **网络错误**: API可能因网络问题无法访问
   - **解决**: 实现重试机制，最多重试3次

2. **频率限制**: Rate Limit (1200 weight/minute)
   - **解决**: 请求间隔至少1秒，控制同步频率

3. **维护时段**: 服务器维护时可能返回错误
   - **解决**: 捕获异常，记录日志，下次重试

### 错误响应示例

```json
{
  "code": -1003,
  "msg": "Too many requests; current limit is 1200 request weight per minute. Please use the websocket for continuous updates."
}
```

### 常见错误代码

| 代码 | 说明 |
|------|------|
| -1003 | 请求过于频繁 |
| -1021 | 时间戳超出接收窗口 |
| -2013 | 不存在的交易对 |
| -1121 | 无效的交易对 |

---

## 数据说明

### 市场特点
- **24/7 交易**: 加密货币市场全天候交易，无休市时间
- **高波动性**: 价格可能在短时间内大幅波动
- **多交易对**: 同一加密货币可能有多个交易对（如BTC/USDT, BTC/BUSD）

### 交易对命名规则
- 格式: `{BaseAsset}{QuoteAsset}`
- 示例: `BTCUSDT` (BTC = 基础资产, USDT = 计价资产)
- 常见计价货币: USDT, BUSD, USDC, BTC, ETH

### 币种筛选建议
**优先同步的交易对**:
1. USDT计价的交易对（稳定币，美元锚定）
2. 成交额前100名的交易对
3. 主流加密货币（BTC, ETH, BNB等）

**可选择性跳过**:
- 低成交量交易对（24小时成交额 < $10,000）
- 杠杆代币（UP, DOWN, BULL, BEAR后缀）
- 小币种（风险较高）

---

## 参考资料

- **官方文档**: https://developers.binance.com/docs/binance-spot-api-docs/rest-api
- **GitHub文档**: https://github.com/binance/binance-spot-api-docs/blob/master/README_CN.md
- **市场数据API**: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints
- **官方支持**: https://www.binance.com/en/support/faq
- **数据更新频率**: 实时
- **数据权威性**: 全球最大加密货币交易所之一

---

## 代码实现

完整实现请参考：
- [binanceSyncService.ts](../../app/src/services/binanceSyncService.ts) - 加密货币同步服务
- [instrumentSyncService.ts](../../app/src/services/instrumentSyncService.ts) - 投资标的同步服务
- [httpClient.ts](../../app/src/utils/httpClient.ts) - HTTP 客户端（含重试机制）
