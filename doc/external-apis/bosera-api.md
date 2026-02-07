# 博时基金 (Bosera) API Documentation

**平台信息**
- **Host**: `www.bosera.com`
- **协议**: HTTPS
- **数据格式**: HTML (嵌入 JavaScript)
- **基金公司**: 博时基金管理有限公司

## API 概览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/fund/index.html` | GET | 获取基金列表页面（HTML） |

---

## 获取基金列表

### 端点
```
GET https://www.bosera.com/fund/index.html
```

### 请求参数

该 API 返回完整的 HTML 页面，基金数据嵌入在页面的 JavaScript 中。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 无 | - | - | 该端点不需要参数 |

### 示例请求

```bash
# 获取基金列表页面
GET https://www.bosera.com/fund/index.html
```

### 响应格式

**Content-Type**: `text/html`

该 API 返回一个 HTML 页面，基金数据通过 JavaScript 变量 `window.fundListJson` 嵌入在页面中。

### 数据提取方法

需要从 HTML 中提取 JavaScript 变量 `window.fundListJson` 的值：

```javascript
// HTML 页面中嵌入的 JavaScript
window.fundListJson = [{
  // 基金对象
}, {
  // 更多基金对象
}];
```

### 响应结构

```javascript
window.fundListJson = [
  {
    // 基金对象（见下方字段说明）
  }
]
```

### 基金对象字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `fundCode` | string | 基金代码 | `"000084"` |
| `subFundCode` | string | 子基金代码 | `"000084"` |
| `fundName` | string | 基金名称 | `"博时安盈债券A"` |
| `shortName` | string | 基金简称 | `"博时安盈债券A"` |
| `showName` | string\|null | 显示名称 | `null` |
| `enName` | string | 英文名称 | `"Stable–Gain Bond Fund A"` |
| `expenda` | string | - | `""` |
| `fundType` | string | 基金类型代码 | `"1105"` |
| `orgFundType` | string | 原始基金类型 | `"1105"` |
| `chargType` | number | 收费类型 | `0` |
| `yieldType` | number | 收益类型 | `0` |
| `netDate` | string | 净值日期（YYYY-MM-DD） | `"2026-02-06"` |
| `netValue` | string | 单位净值 | `"1.2586"` |
| `totalNetValue` | string | 累计净值 | `"1.4865"` |
| `conNetValue` | string | - | `"1.2586"` |
| `splitNetValue` | string | 拆分净值 | `"--"` |
| `rate` | string | 日涨跌幅（%） | `"0.01"` |
| `assetValue` | string\|null | - | `null` |
| `conAssetValue` | string\|null | - | `null` |
| `splitAssetValue` | string\|null | - | `null` |
| `fundIncome` | string | - | `""` |
| `yield` | string | 七日年化（%） | `"0"` |
| `yield30Days` | string | - | `"0"` |
| `yieldThisYear` | string | - | `"0"` |
| `yieldTotal` | string | - | `"0"` |
| `weekYield` | string | 周收益率（小数） | `".0003"` |
| `monthYield` | string | 月收益率（小数） | `".0013"` |
| `threeMonthYield` | string | 三月收益率（小数） | `".0033"` |
| `halfYearYield` | string | 半年收益率（小数） | `".0069"` |
| `thisYearYield` | string | 今年收益率（小数） | `".0014"` |
| `totalYield` | string | 总收益率（小数） | `".5159"` |
| `yearYield` | string | 年收益率（小数） | `".0152"` |
| `transNavGrowth` | string\|null | - | `null` |
| `fundRisk` | string | 基金风险等级 | `"中低"` |
| `fundTypeShow` | string | 基金类型显示名称 | `"债券"` |
| `showFlag` | string | 显示标志 | `"1"` |
| `buyAmount` | string | 购买金额 | `"1"` |
| `curType` | string | 货币类型 | `"156"` |
| `fundStatus` | string | 基金状态 | `"0"` |
| `bookPeriod` | string | - | `"0"` |
| `fundInfoUrl` | string | 基金详情 URL | `"/fund/000084.html"` |
| `buyFundUrl` | string | 购买基金 URL | `"https://trade.bosera.com/indi/api/www/buyfundurl.do?fundCode=000084"` |
| `limitLarge` | string | - | `""` |
| `limitLargeDesc` | string | - | `" "` |
| `subsStartTime` | string\|null | 认购开始时间 | `null` |
| `subsEndTime` | string\|null | 认购结束时间 | `null` |
| `propaUrl` | string\|null | - | `null` |
| `pic` | string\|null | - | `null` |
| `scheduleStatus` | string | - | `"1"` |
| `fundRedeemDay` | number | 基金赎回天数 | `2` |
| `scheduledUrl` | string | 定投 URL | `"https://trade.bosera.com/indi/api/www/fundscheduleurl.do?fundCode=000084"` |
| `baseFundCode` | string | 基础基金代码 | `"000084"` |
| `rootFundCode` | string | 根基金代码 | `"000084"` |
| `week` | string | 周收益率（%） | `"0.03"` |
| `month` | string | 月收益率（%） | `"0.13"` |
| `threeMonth` | string | 三月收益率（%） | `"0.33"` |
| `year` | string | 年收益率（%） | `"1.52"` |
| `total` | string | 总收益率（%） | `"51.59"` |
| `tagName` | string | - | `""` |
| `isNew` | string | 是否新基金 | `"0"` |
| `isRecomm` | string | 是否推荐 | `"0"` |
| `isETF` | string | 是否 ETF | `"0"` |
| `isCrossETF` | string | 是否跨境 ETF | `"0"` |
| `yieldShowName` | string | - | `""` |
| `yieldVaule` | string | - | `""` |
| `showPriceValue` | boolean | 是否显示价格值 | `false` |
| `closePeriodDesc` | string | - | `""` |
| `isDelist` | string | 是否退市 | `"0"` |
| `isShowPromos` | string | 是否显示促销 | `"0"` |

### 完整示例

```javascript
window.fundListJson = [
  {
    "fundCode": "000084",
    "subFundCode": "000084",
    "fundName": "博时安盈债券A",
    "shortName": "博时安盈债券A",
    "showName": null,
    "enName": "Stable–Gain Bond Fund A",
    "expenda": "",
    "fundType": "1105",
    "orgFundType": "1105",
    "chargType": 0,
    "yieldType": 0,
    "netDate": "2026-02-06",
    "netValue": "1.2586",
    "totalNetValue": "1.4865",
    "conNetValue": "1.2586",
    "splitNetValue": "--",
    "rate": "0.01",
    "assetValue": null,
    "conAssetValue": null,
    "splitAssetValue": null,
    "fundIncome": "",
    "yield": "0",
    "yield30Days": "0",
    "yieldThisYear": "0",
    "yieldTotal": "0",
    "weekYield": ".0003",
    "monthYield": ".0013",
    "threeMonthYield": ".0033",
    "halfYearYield": ".0069",
    "thisYearYield": ".0014",
    "totalYield": ".5159",
    "yearYield": ".0152",
    "transNavGrowth": null,
    "fundRisk": "中低",
    "fundTypeShow": "债券",
    "showFlag": "1",
    "buyAmount": "1",
    "curType": "156",
    "fundStatus": "0",
    "bookPeriod": "0",
    "fundInfoUrl": "/fund/000084.html",
    "buyFundUrl": "https://trade.bosera.com/indi/api/www/buyfundurl.do?fundCode=000084",
    "limitLarge": "",
    "limitLargeDesc": " ",
    "subsStartTime": null,
    "subsEndTime": null,
    "propaUrl": null,
    "pic": null,
    "scheduleStatus": "1",
    "fundRedeemDay": 2,
    "scheduledUrl": "https://trade.bosera.com/indi/api/www/fundscheduleurl.do?fundCode=000084",
    "baseFundCode": "000084",
    "rootFundCode": "000084",
    "week": "0.03",
    "month": "0.13",
    "threeMonth": "0.33",
    "year": "1.52",
    "total": "51.59",
    "tagName": "",
    "isNew": "0",
    "isRecomm": "0",
    "isETF": "0",
    "isCrossETF": "0",
    "yieldShowName": "",
    "yieldVaule": "",
    "showPriceValue": false,
    "closePeriodDesc": "",
    "isDelist": "0",
    "isShowPromos": "0"
  }
]
```

---

## 数据提取方法

### 方法 1: 使用正则表达式

```javascript
const response = await fetch('https://www.bosera.com/fund/index.html');
const html = await response.text();

// 提取 window.fundListJson 的值
const match = html.match(/window\.fundListJson\s*=\s*(\[.*?\]);/s);

if (match) {
  const funds = JSON.parse(match[1]);
  console.log(`找到 ${funds.length} 只基金`);
}
```

### 方法 2: 使用 Cheerio (Node.js)

```javascript
const cheerio = require('cheerio');
const response = await fetch('https://www.bosera.com/fund/index.html');
const html = await response.text();
const $ = cheerio.load(html);

// 查找包含 fundListJson 的 script 标签
const scriptContent = $('script').filter(function() {
  return $(this).html().includes('window.fundListJson');
}).html();

const match = scriptContent.match(/window\.fundListJson\s*=\s*(\[.*?\]);/s);
const funds = JSON.parse(match[1]);
```

### 方法 3: 使用 Python BeautifulSoup

```python
import requests
import re
import json

response = requests.get('https://www.bosera.com/fund/index.html')
html = response.text

# 使用正则表达式提取数据
match = re.search(r'window\.fundListJson\s*=\s*(\[.*?\]);', html, re.DOTALL)

if match:
    funds = json.loads(match.group(1))
    print(f"找到 {len(funds)} 只基金")
```

---

## 注意事项

### 1. 数据格式
- 该 API 返回 **HTML** 而非 JSON
- 数据嵌入在 JavaScript 变量中，需要额外解析步骤

### 2. 数据类型
- 所有数值字段在响应中都是**字符串格式**
- 某些字段是数字类型（如 `chargType`, `yieldType`, `fundRedeemDay`）
- 使用时需要转换：

```javascript
const netValue = parseFloat(fund.netValue);
const rate = parseFloat(fund.rate);
```

### 3. 收益率字段
- 小数格式：`weekYield`, `monthYield`, `threeMonthYield` 等（如 `.0003`）
- 百分比格式：`week`, `month`, `threeMonth` 等（如 `"0.03"`）
- 两种格式表示相同的收益率，只是单位不同：

```javascript
// 小数格式需要乘以 100 得到百分比
const weekYieldPercent = parseFloat(fund.weekYield) * 100; // 0.03

// 百分比格式直接使用
const weekYieldPercent2 = parseFloat(fund.week); // 0.03
```

### 4. null 值处理
- 某些字段可能为 `null`（如 `showName`, `assetValue`, `subsStartTime`）
- 需要进行 null 检查：

```javascript
const subsTime = fund.subsStartTime || '未设置';
```

### 5. 基金类型
`fundType` 字段是基金类型代码：
- `"1105"`: 债券型基金
- 其他代码对应不同类型

### 6. 基金风险等级
`fundRisk` 字段描述风险等级：
- `"低"`
- `"中低"`
- `"中"`
- `"中高"`
- `"高"`

### 7. 请求频率
- 建议每天只请求一次（基金净值每日更新一次）
- 避免频繁请求造成服务器压力

### 8. 字符编码
- 页面使用 UTF-8 编码
- 确保正确处理中文字符

---

## 数据更新时间

- 基金净值通常在每个交易日收盘后更新（约 18:00-20:00）
- `netDate` 字段表示净值日期
- 建议在每日 20:00 后同步数据

---

## 代码实现建议

### TypeScript 接口定义

```typescript
interface BoseraFund {
  fundCode: string;
  subFundCode: string;
  fundName: string;
  shortName: string;
  showName: string | null;
  enName: string;
  expenda: string;
  fundType: string;
  orgFundType: string;
  chargType: number;
  yieldType: number;
  netDate: string;
  netValue: string;
  totalNetValue: string;
  conNetValue: string;
  splitNetValue: string;
  rate: string;
  assetValue: string | null;
  conAssetValue: string | null;
  splitAssetValue: string | null;
  fundIncome: string;
  yield: string;
  yield30Days: string;
  yieldThisYear: string;
  yieldTotal: string;
  weekYield: string;
  monthYield: string;
  threeMonthYield: string;
  halfYearYield: string;
  thisYearYield: string;
  totalYield: string;
  yearYield: string;
  transNavGrowth: string | null;
  fundRisk: string;
  fundTypeShow: string;
  showFlag: string;
  buyAmount: string;
  curType: string;
  fundStatus: string;
  bookPeriod: string;
  fundInfoUrl: string;
  buyFundUrl: string;
  limitLarge: string;
  limitLargeDesc: string;
  subsStartTime: string | null;
  subsEndTime: string | null;
  propaUrl: string | null;
  pic: string | null;
  scheduleStatus: string;
  fundRedeemDay: number;
  scheduledUrl: string;
  baseFundCode: string;
  rootFundCode: string;
  week: string;
  month: string;
  threeMonth: string;
  year: string;
  total: string;
  tagName: string;
  isNew: string;
  isRecomm: string;
  isETF: string;
  isCrossETF: string;
  yieldShowName: string;
  yieldVaule: string;
  showPriceValue: boolean;
  closePeriodDesc: string;
  isDelist: string;
  isShowPromos: string;
}

// 解析基金数据
function parseBoseraFund(fund: BoseraFund) {
  return {
    code: fund.fundCode,
    name: fund.fundName,
    shortName: fund.shortName,
    enName: fund.enName,
    netValue: parseFloat(fund.netValue),
    totalNetValue: parseFloat(fund.totalNetValue),
    change: parseFloat(fund.rate),
    weekYield: parseFloat(fund.week),
    monthYield: parseFloat(fund.month),
    yearYield: parseFloat(fund.year),
    totalYield: parseFloat(fund.total),
    riskLevel: fund.fundRisk,
    fundType: fund.fundTypeShow,
    fundStatus: fund.fundStatus,
    url: `https://www.bosera.com${fund.fundInfoUrl}`,
  };
}
```

### Node.js 完整示例

```javascript
async function fetchBoseraFunds() {
  const response = await fetch('https://www.bosera.com/fund/index.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const html = await response.text();

  // 提取 fundListJson
  const match = html.match(/window\.fundListJson\s*=\s*(\[.*?\]);/s);

  if (!match) {
    throw new Error('无法提取基金数据');
  }

  const funds = JSON.parse(match[1]);

  console.log(`找到 ${funds.length} 只基金`);

  return funds.map(fund => ({
    code: fund.fundCode,
    name: fund.fundName,
    netValue: parseFloat(fund.netValue),
    change: parseFloat(fund.rate),
    weekYield: parseFloat(fund.week),
    monthYield: parseFloat(fund.month),
    yearYield: parseFloat(fund.year),
    totalYield: parseFloat(fund.total),
    riskLevel: fund.fundRisk,
    fundType: fund.fundTypeShow,
  }));
}

// 使用
const funds = await fetchBoseraFunds();
console.log(funds.slice(0, 5)); // 显示前 5 只基金
```

---

## 与其他基金公司 API 对比

| 特性 | 博时基金 | 南方基金 |
|------|---------|---------|
| **返回格式** | HTML + JavaScript | JSON |
| **数据提取** | 需要解析 HTML | 直接解析 JSON |
| **数据量** | 大（数百只基金） | 大（数万条数据） |
| **请求方式** | GET | POST |
| **数据更新** | 每日 | 每日 |

---

## 相关链接

- **官方网站**: https://www.bosera.com
- **基金产品页面**: https://www.bosera.com/fund/index.html
- **交易平台**: https://trade.bosera.com
