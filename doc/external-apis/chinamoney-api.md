# 中国外汇交易中心API文档

## 概述

中国外汇交易中心（ChinaMoney）提供人民币汇率中间价数据，包括24种货币对人民币的汇率。

**数据源**: https://www.chinamoney.com.cn

**数据更新频率**: 每个工作日上午9:15左右

**支持货币**: USD, EUR, JPY, HKD, GBP, AUD, NZD, SGD, CHF, CAD, MOP, MYR, RUB, ZAR, KRW, AED, SAR, HUF, PLN, DKK, SEK, NOK, TRY, MXN, THB

---

## API端点

### 1. 获取最新汇率中间价

获取最新的人民币汇率中间价数据。

**端点**: `POST https://www.chinamoney.com.cn/r/cms/www/chinamoney/data/fx/ccpr.json`

**请求头**:
```json
{
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

**响应示例**:
```json
{
  "head": {
    "version": "2.0",
    "provider": "CWAP",
    "rep_code": "200",
    "rep_message": "",
    "ts": 1770341140564,
    "producer": ""
  },
  "data": {
    "lastDateEn": "06/02/2026 9:15",
    "pairChange": "美元/人民币欧元/人民币...",
    "lastDate": "2026-02-06 9:15"
  },
  "records": [
    {
      "vrtCode": "1",
      "price": "6.9590",
      "bp": "20.00",
      "vrtName": "美元/人民币",
      "vrtEName": "USD/CNY",
      "foreignCName": "USD",
      "bpDouble": 20.0,
      "isShowBp": true,
      "show": true
    },
    {
      "vrtCode": "3",
      "price": "4.4367",
      "bp": "39.00",
      "vrtName": "100日元/人民币",
      "vrtEName": "100JPY/CNY",
      "foreignCName": "JPY",
      "bpDouble": 39.0,
      "isShowBp": true,
      "show": true
    }
  ]
}
```

**关键字段说明**:
- `price`: 汇率中间价
- `foreignCName`: 货币代码（USD, EUR, JPY等）
- `vrtName`: 货币对名称
- `lastDate`: 汇率日期（格式："2026-02-06 9:15"）

**注意事项**:
- 日元汇率以"100日元/CNY"形式提供，需要除以100转换为"1日元/CNY"
- 其他货币直接为"1货币/CNY"形式

---

### 2. 获取历史汇率中间价

获取指定日期范围的人民币汇率中间价历史数据。

**端点**: `POST https://www.chinamoney.com.cn/ags/ms/cm-u-bk-ccpr/CcprHisNew`

**查询参数**:
- `startDate`: 开始日期（格式："2026-01-08"）
- `endDate`: 结束日期（格式："2026-02-07"）
- `currency`: 货币对列表（逗号分隔），例如："USD/CNY,EUR/CNY,100JPY/CNY,HKD/CNY"
- `pageNum`: 页码（从1开始）
- `pageSize`: 每页记录数（最大10）

**请求示例**:
```
POST https://www.chinamoney.com.cn/ags/ms/cm-u-bk-ccpr/CcprHisNew?startDate=2026-01-08&endDate=2026-02-07&currency=USD/CNY,EUR/CNY,100JPY/CNY,HKD/CNY&pageNum=1&pageSize=10
```

**响应示例**:
```json
{
  "head": {
    "version": "2.0",
    "provider": "CWAP",
    "rep_code": "200",
    "rep_message": ""
  },
  "data": {
    "head": ["USD/CNY", "EUR/CNY", "100JPY/CNY", "HKD/CNY"],
    "total": 22,
    "pageTotal": 3,
    "searchlist": ["USD/CNY", "EUR/CNY", "100JPY/CNY", "HKD/CNY"],
    "endDate": "2026-02-07",
    "pageSize": 10,
    "currency": "USD/CNY,EUR/CNY,100JPY/CNY,HKD/CNY",
    "pageNum": 1,
    "startDate": "2026-01-08"
  },
  "records": [
    {
      "date": "2026-02-06",
      "values": ["6.9590", "8.1923", "4.4367", "0.89080"]
    },
    {
      "date": "2026-02-05",
      "values": ["6.9570", "8.2036", "4.4328", "0.89062"]
    }
  ]
}
```

**分页处理**:
- `total`: 总货币对数量
- `pageTotal`: 总页数
- `pageNum`: 当前页码
- `pageSize`: 每页大小
- 一次请求最多返回10个货币对的数据

---

## 数据使用示例

### 解析最新汇率

```typescript
// 假设已获取API响应
const data = responseJson;
const rateDate = new Date(data.data.lastDate.split(' ')[0]); // "2026-02-06 9:15" -> "2026-02-06"

for (const record of data.records) {
  const fromCurrency = record.foreignCName;
  const toCurrency = 'CNY';
  let rate = parseFloat(record.price);

  // 特殊处理日元（100日元/CNY -> 1日元/CNY）
  if (fromCurrency === 'JPY') {
    rate = rate / 100;
  }

  console.log(`${fromCurrency}/${toCurrency}: ${rate}`);
  // 输出: USD/CNY: 6.9590
  // 输出: JPY/CNY: 0.044367
}
```

### 解析历史汇率

```typescript
// 假设已获取API响应
const data = responseJson;
const currencyPairs = data.data.head; // ["USD/CNY", "EUR/CNY", "100JPY/CNY"]

for (const record of data.records) {
  const date = record.date; // "2026-02-06"
  const values = record.values; // ["6.9590", "8.1923", "4.4367"]

  currencyPairs.forEach((pair, index) => {
    const rate = parseFloat(values[index]);
    const [from, to] = pair.split('/');

    // 特殊处理日元
    let normalizedRate = rate;
    if (from === '100JPY') {
      normalizedRate = rate / 100;
    }

    console.log(`${date}: ${from}/${to} = ${normalizedRate}`);
  });
}
```

---

## 定时同步策略

### 建议同步时间
- **每日8:00 AM**: 中国外汇交易中心通常在9:15发布最新汇率，8:00同步可确保获取前一工作日的数据
- **跳过周末**: 汇率只在交易日更新，建议只在周一至周五执行同步

### 实现示例（node-cron）

```typescript
import cron from 'node-cron';

// 每天早上8点执行汇率同步
cron.schedule('0 8 * * *', async () => {
  console.log('Starting exchange rate sync...');
  await syncExchangeRates();
});
```

---

## 错误处理

### 常见错误

1. **网络错误**: API可能因网络问题无法访问
   - **解决**: 实现重试机制，最多重试3次

2. **数据格式变化**: API响应格式可能调整
   - **解决**: 验证`head.rep_code`是否为"200"

3. **节假日无数据**: 非交易日可能无新数据
   - **解决**: 使用上一个工作日的汇率数据

### 错误响应示例

```json
{
  "head": {
    "rep_code": "400",
    "rep_message": "Invalid parameter"
  }
}
```

---

## 数据说明

### 汇率类型
- **中间价**: 中国外汇交易中心公布的基准汇率
- **发布时间**: 每个工作日上午9:15
- **数据来源**: 中国外汇交易中心（CFETS）

### 支持货币对

| 货币代码 | 货币名称 | 汇率形式 |
|---------|---------|---------|
| USD | 美元 | 1 USD/CNY |
| EUR | 欧元 | 1 EUR/CNY |
| JPY | 日元 | 100 JPY/CNY |
| HKD | 港元 | 1 HKD/CNY |
| GBP | 英镑 | 1 GBP/CNY |
| AUD | 澳元 | 1 AUD/CNY |
| NZD | 新西兰元 | 1 NZD/CNY |
| SGD | 新加坡元 | 1 SGD/CNY |
| CHF | 瑞士法郎 | 1 CHF/CNY |
| CAD | 加元 | 1 CAD/CNY |
| MOP | 澳门元 | 1 CNY/MOP |
| MYR | 马来西亚林吉特 | 1 CNY/MYR |
| RUB | 俄罗斯卢布 | 1 CNY/RUB |
| ZAR | 南非兰特 | 1 CNY/ZAR |
| KRW | 韩元 | 1 CNY/KRW |
| AED | 阿联酋迪拉姆 | 1 CNY/AED |
| SAR | 沙特里亚尔 | 1 CNY/SAR |
| HUF | 匈牙利福林 | 1 CNY/HUF |
| PLN | 波兰兹罗提 | 1 CNY/PLN |
| DKK | 丹麦克朗 | 1 CNY/DKK |
| SEK | 瑞典克朗 | 1 CNY/SEK |
| NOK | 挪威克朗 | 1 CNY/NOK |
| TRY | 土耳其里拉 | 1 CNY/TRY |
| MXN | 墨西哥比索 | 1 CNY/MXN |
| THB | 泰铢 | 1 CNY/THB |

---

## 参考资料

- **官方网站**: https://www.chinamoney.com.cn
- **数据发布**: 人民币汇率中间价
- **更新频率**: 每个工作日
- **数据权威性**: 官方发布，具有法律效力
