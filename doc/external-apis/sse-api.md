# SSE（上海证券交易所）API Documentation

**平台信息**
- **Host**: `yunhq.sse.com.cn:32042`
- **协议**: HTTPS
- **端口**: 32042
- **数据格式**: JSON
- **支持的交易所**: 上海证券交易所 (SSE)

## API 概览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v1/sh1/list/exchange/equity` | GET | 获取股票列表 |
| `/v1/sh1/list/exchange/fwr` | GET | 获取基金列表 |
| `/v1/sh1/list/exchange/all` | GET | 获取所有证券（含债券） |
| `/v1/sh1/dayk/{code}` | GET | 获取日 K 线数据 |

---

## 1. 获取股票列表

### 端点
```
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `select` | string | 否 | 返回字段，用逗号分隔（如：`code,name,open`） |

### 示例请求

```bash
# 获取所有股票
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity

# 指定返回字段
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity?select=code,name,open
```

### 响应示例

```json
{
  "date": 20260205,
  "time": 134137,
  "total": 2345,
  "begin": 0,
  "end": 2345,
  "list": [
    ["600000", "浦发银行", 10.13],
    ["600004", "白云机场", 9.62],
    ["600006", "东风股份", 6.96],
    ["600007", "中国国贸", 20.77]
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `date` | number | 数据日期（YYYYMMDD） |
| `time` | number | 时间（HHMMSS） |
| `total` | number | 总记录数 |
| `begin` | number | 起始索引 |
| `end` | number | 结束索引 |
| `list` | array | 股票数组，每项为 `[code, name, lastPrice]` |

### list 数组结构

| 索引 | 字段 | 类型 | 说明 |
|------|------|------|------|
| 0 | code | string | 股票代码（6 位数字） |
| 1 | name | string | 股票名称 |
| 2 | lastPrice | number | 最新价格 |

### 使用示例

```typescript
const response = await proxiedFetch(
  'https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity',
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.sse.com.cn/',
    },
  }
);

const data = await response.json();
const stocks = data.list.map(([code, name, lastPrice]) => ({
  code,
  name,
  lastPrice,
}));
```

---

## 2. 获取基金列表

### 端点
```
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/fwr
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `select` | string | 否 | 返回字段，用逗号分隔 |

### 示例请求

```bash
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/fwr
```

### 响应示例

```json
{
  "date": 20260205,
  "time": 161457,
  "total": 991,
  "begin": 0,
  "end": 991,
  "list": [
    ["501001", "财通精选", 1.49],
    ["501005", "精准医疗", 1.018]
  ]
}
```

### 字段说明

与股票列表相同，`list` 数组每项为 `[code, name, lastPrice]`。

---

## 3. 获取债券列表

### 端点
```
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/all
```

### 示例请求

```bash
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/all
```

### 响应示例

```json
{
  "date": 20260205,
  "time": 161614,
  "total": 21198,
  "begin": 0,
  "end": 21198,
  "list": [
    ["010609", "06国债⑨", 100.00],
    ["010706", "07国债06", 100.00]
  ]
}
```

### 债券代码规则

| 前缀 | 类型 | 说明 |
|------|------|------|
| `01` | 国债 | 国债 |
| `02` | 地方债 | 地方政府债 |
| `11` | 可转债 | 可转换债券 |
| `12` | 企业债 | 企业债券 |

### 使用示例

```typescript
const response = await proxiedFetch(
  'https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/all'
);

const data = await response.json();

// 过滤债券
const bondPrefixes = ['01', '02', '11', '12'];
const bonds = data.list.filter(([code]) =>
  bondPrefixes.some(prefix => code.startsWith(prefix))
);
```

---

## 4. 获取日 K 线数据

### 端点
```
GET https://yunhq.sse.com.cn:32042/v1/sh1/dayk/{code}
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 股票代码（6 位数字） |

### 示例请求

```bash
# 获取股票 600006 的日 K 线
GET https://yunhq.sse.com.cn:32042/v1/sh1/dayk/600006
```

### 响应示例

```json
{
  "code": "600006",
  "total": 6321,
  "begin": 6221,
  "end": 6321,
  "kline": [
    [20250909, 7.46, 7.54, 7.42, 7.46, 30121893, 225263853],
    [20250910, 7.44, 7.50, 7.43, 7.46, 21287417, 158778966],
    [20250911, 7.44, 7.60, 7.37, 7.57, 43328832, 324701823]
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | string | 股票代码 |
| `total` | number | K 线总条数 |
| `begin` | number | 起始索引 |
| `end` | number | 结束索引 |
| `kline` | array | K 线数据数组 |

### kline 数组结构

每条记录对应一天的 K 线数据：

| 索引 | 字段 | 类型 | 说明 |
|------|------|------|------|
| 0 | date | number | 交易日期（YYYYMMDD） |
| 1 | open | number | 开盘价 |
| 2 | high | number | 最高价 |
| 3 | low | number | 最低价 |
| 4 | close | number | 收盘价 |
| 5 | volume | number | 成交量 |
| 6 | amount | number | 成交额 |

### 使用示例

```typescript
const code = '600006';
const response = await proxiedFetch(
  `https://yunhq.sse.com.cn:32042/v1/sh1/dayk/${code}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.sse.com.cn/',
    },
  }
);

const data = await response.json();
const klines = data.kline.map(([date, open, high, low, close, volume, amount]) => ({
  date,
  open,
  high,
  low,
  close,
  volume,
  amount,
}));
```

---

## 注意事项

### 1. 请求频率限制
- 建议每次请求间隔至少 1 秒
- 避免高频请求导致 IP 被限制

### 2. 端口说明
- SSE API 使用非标准端口 `32042`
- 确保防火墙允许此端口

### 3. 数据格式
- 日期格式：`YYYYMMDD`（如：20260205）
- 时间格式：`HHMMSS`（如：134137）
- 价格和数量为数值类型

### 4. 数据数组格式
- SSE API 使用数组格式返回数据
- 需要根据索引访问字段
- 建议封装为对象以便使用

### 5. Referer 要求
- 某些端点可能需要 `Referer: https://www.sse.com.cn/`
- 建议在请求头中包含

### 6. K 线分页
- K 线数据可能分页返回
- 使用 `begin` 和 `end` 参数处理分页

---

## 代码实现

完整实现请参考：
- [instrumentSyncService.ts](../../app/src/services/instrumentSyncService.ts) - 同步服务
- [marketDataService.ts](../../app/src/services/marketDataService.ts) - 数据服务
- [httpClient.ts](../../app/src/utils/httpClient.ts) - HTTP 客户端（含重试机制）

---

## 数据同步配置

```typescript
// 环境变量配置
FORCE_SYNC_ON_STARTUP=true  // 启动时强制同步
HTTP_MAX_RETRIES=3          // 最大重试次数
HTTP_TIMEOUT_MS=30000       // 请求超时（毫秒）
```

同步任务在每天 6:00 AM 自动运行（仅工作日）。
