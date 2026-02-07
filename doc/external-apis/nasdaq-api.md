# NASDAQ API Documentation

**平台信息**
- **Host**: `api.nasdaq.com`
- **协议**: HTTPS
- **数据格式**: JSON
- **支持的交易所**: NASDAQ, NYSE, AMEX

## API 概览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/screener/stocks` | GET | 获取股票列表 |
| `/api/screener/etf` | GET | 获取 ETF 列表 |

---

## 1. 获取股票列表

### 端点
```
GET https://api.nasdaq.com/api/screener/stocks
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `download` | boolean | 否 | 是否下载完整列表，默认 `true` |
| `exchange` | string | 否 | 交易所筛选：`NASDAQ`, `NYSE`, `AMEX` |

### 示例请求

```bash
# 获取所有交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true

# 仅获取 NASDAQ 交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true&exchange=NASDAQ

# 仅获取 NYSE 交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true&exchange=NYSE

# 仅获取 AMEX 交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true&exchange=AMEX
```

### 响应示例

```json
{
  "data": {
    "asOf": null,
    "headers": {
      "symbol": "Symbol",
      "name": "Name",
      "lastsale": "Last Sale",
      "netchange": "Net Change",
      "pctchange": "% Change",
      "marketCap": "Market Cap",
      "country": "Country",
      "ipoyear": "IPO Year",
      "volume": "Volume",
      "sector": "Sector",
      "industry": "Industry",
      "url": "Url"
    },
    "rows": [
      {
        "symbol": "A",
        "name": "Agilent Technologies Inc. Common Stock",
        "lastsale": "$132.98",
        "netchange": "0.84",
        "pctchange": "0.636%",
        "volume": "1958389",
        "marketCap": "37612014928.00",
        "country": "United States",
        "ipoyear": "1999",
        "industry": "Biotechnology: Laboratory Analytical Instruments",
        "sector": "Industrials",
        "url": "/market-activity/stocks/a"
      },
      {
        "symbol": "AA",
        "name": "Alcoa Corporation Common Stock",
        "lastsale": "$58.16",
        "netchange": "-3.19",
        "pctchange": "-5.20%",
        "volume": "10792263",
        "marketCap": "15061348101.00",
        "country": "United States",
        "ipoyear": "2016",
        "industry": "Aluminum",
        "sector": "Industrials",
        "url": "/market-activity/stocks/aa"
      }
    ]
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `symbol` | string | 股票代码 |
| `name` | string | 股票名称 |
| `lastsale` | string | 最新成交价（格式：$123.45） |
| `netchange` | string | 涨跌额 |
| `pctchange` | string | 涨跌幅（格式：+1.23%） |
| `volume` | string | 成交量 |
| `marketCap` | string | 市值 |
| `country` | string | 国家 |
| `ipoyear` | string | 上市年份 |
| `sector` | string | 行业大类 |
| `industry` | string | 细分行业 |
| `url` | string | 股票详细页面 URL |

### 使用示例

```typescript
const response = await proxiedFetch(
  'https://api.nasdaq.com/api/screener/stocks?download=true&exchange=NASDAQ',
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  }
);

const data = await response.json();
const stocks = data.data.rows;
```

---

## 2. 获取 ETF 列表

### 端点
```
GET https://api.nasdaq.com/api/screener/etf
```

### 请求参数

无查询参数。

### 示例请求

```bash
GET https://api.nasdaq.com/api/screener/etf
```

### 响应示例

```json
{
  "data": {
    "records": {
      "totalrecords": 4433,
      "limit": 50,
      "offset": 0,
      "data": {
        "headers": {
          "symbol": "SYMBOL",
          "companyName": "NAME",
          "lastSalePrice": "LAST PRICE",
          "percentageChange": "% CHANGE",
          "oneYearPercentagechange": "1 yr % CHANGE"
        },
        "rows": [
          {
            "symbol": "PALL",
            "companyName": "abrdn Physical Palladium Shares ETF",
            "lastSalePrice": "$160.30",
            "percentageChange": "+0.36%",
            "oneYearPercentage": "68.93%"
          }
        ]
      }
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `symbol` | string | ETF 代码 |
| `companyName` | string | ETF 名称 |
| `lastSalePrice` | string | 最新成交价（格式：$123.45） |
| `percentageChange` | string | 日涨跌幅（格式：+1.23%） |
| `oneYearPercentage` | string | 一年涨跌幅（格式：12.34%） |

### 使用示例

```typescript
const response = await proxiedFetch(
  'https://api.nasdaq.com/api/screener/etf',
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  }
);

const data = await response.json();
const etfs = data.data.records.data.rows;
```

---

## 注意事项

### 1. 请求频率限制
- 建议每次请求间隔至少 1 秒
- 避免短时间内大量请求

### 2. 数据格式
- 价格字段包含 `$` 符号，需要处理
- 涨跌幅包含 `%` 符号，需要处理
- 所有数值字段都是字符串格式

### 3. 错误处理
该 API 可能返回以下错误：
- 网络超时（建议启用重试机制）
- 服务器维护（返回 HTTP 5xx）
- 参数错误（返回 HTTP 4xx）

### 4. 数据更新
- 数据实时更新，但可能有延迟
- 建议在交易时间内定期同步

### 5. 代理配置
在某些地区可能需要代理访问。项目已集成代理支持：
```typescript
// 使用配置的代理
const response = await proxiedFetch(url, options);
```

---

## 代码实现

完整实现请参考：
- [instrumentSyncService.ts](../../app/src/services/instrumentSyncService.ts) - 同步服务
- [marketDataService.ts](../../app/src/services/marketDataService.ts) - 数据服务
- [httpClient.ts](../../app/src/utils/httpClient.ts) - HTTP 客户端（含重试机制）
