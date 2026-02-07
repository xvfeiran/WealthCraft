# 易方达基金 (E Funds) API Documentation

**平台信息**
- **Host**: `www.efunds.com.cn`
- **协议**: HTTPS
- **数据格式**: HTML (嵌入 JavaScript)
- **基金公司**: 易方达基金管理有限公司

## API 概览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/lm/jjcp/` | GET | 获取基金超市页面（HTML） |

---

## 获取基金列表

### 端点
```
GET https://www.efunds.com.cn/lm/jjcp/
```

### 请求参数

该 API 返回完整的 HTML 页面，基金数据通过 JavaScript 变量 `__FUND_SUPER_MARKET_DATA__` 嵌入在页面中。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 无 | - | - | 该端点不需要参数 |

### 示例请求

```bash
# 获取基金超市页面
GET https://www.efunds.com.cn/lm/jjcp/
```

### 响应格式

**Content-Type**: `text/html`

该 API 返回一个 HTML 页面，基金数据通过 JavaScript 变量 `__FUND_SUPER_MARKET_DATA__` 嵌入在页面中。

### 数据提取方法

需要从 HTML 中提取 JavaScript 变量 `__FUND_SUPER_MARKET_DATA__` 的值：

```javascript
// HTML 页面中嵌入的 JavaScript
var __FUND_SUPER_MARKET_DATA__ = [{
  // 基金对象
}, {
  // 更多基金对象
}];
```

### 响应结构

```javascript
var __FUND_SUPER_MARKET_DATA__ = [
  {
    // 基金对象（见下方字段说明）
  }
]
```

### 基金对象字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `fundcode` | string | 基金代码 | `"110022"` |
| `fundname` | string | 基金名称 | `"易方达消费行业股票"` |
| `fundSourceName` | string | 基金全称 | `"易方达消费行业股票型证券投资基金"` |
| `fundType` | string | 基金类型 | `"股票型"` |
| `netvalue` | string | 单位净值 | `"3.444"` |
| `tdate` | string | 净值日期（YYYYMMDD） | `"20260206"` |
| `setupdate` | string | 成立日期（YYYY-MM-DD） | `"2010-08-20"` |
| `rzd` | string | 日涨跌幅（%） | `"-1.49"` |
| `thisYearIncome` | string | 今年以来收益率（%） | `"0.03"` |
| `lastMonthIncome` | string | 近一月收益率（%） | `"-1.46"` |
| `lastYearIncome` | string | 近一年收益率（%） | `"0.67"` |
| `sinceIncome` | string | 成立以来收益率（%） | `"244.40"` |
| `fundpinyin` | string | 基金拼音 | `"YFDXFHYGP"` |
| `fundshortname` | string\|null | 基金简称 | `null` |
| `fundwebtype` | string | Web 类型 | `"1"` |
| `level1Type` | string | 一级类型代码 | `"03"` |
| `level2Type` | string | 二级类型代码 | `"0301"` |
| `managerName` | string | 基金经理姓名 | `"萧楠"` |
| `manager` | string\|null | - | `null` |
| `newFund` | boolean | 是否新基金 | `false` |
| `hasAward` | boolean | 是否获奖 | `false` |
| `awardInfo` | string\|null | 奖项信息 | `null` |
| `displayOrder` | string | 显示顺序 | `"3"` |
| `state` | string | 基金状态 | `"0"` |
| `status` | string\|null | 状态详情 | `null` |
| `incomeunit` | string | 收益单位 | `""` |
| `inexPandShortName` | string | 指数扩展简称 | `""` |
| `qrnh` | string | 七日年化（%） | `"1.471"` |
| `returnPeriod` | string | 回报周期 | `""` |
| `retirementMemo` | string\|null | 养老备注 | `null` |
| `tip` | string\|null | 提示信息 | `null` |
| `memo` | string\|null | 备注 | `null` |
| `contractType` | string\|null | 合同类型 | `null` |
| `njcode` | string\|null | - | `null` |
| `properties` | object | 基金属性 | 见下方 |
| `@Class` | string | Java 类名 | `"com.zving.efunds.vo.FundInfo"` |

### properties 对象字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `purchasable` | string | 是否可购买 | `"1"` |
| `riskLevel` | string | 风险等级 | `"中风险(R3)"` |
| `autoInvestable` | string | 是否可定投 | `"1"` |
| `interval` | string | - | `"0"` |
| `buyRatio` | string | 买入比例 | `""` |
| `f_return_period` | string | - | `""` |

### 完整示例

```javascript
var __FUND_SUPER_MARKET_DATA__ = [
  {
    "awardInfo": null,
    "contractType": null,
    "displayOrder": "3",
    "fundSourceName": "易方达消费行业股票型证券投资基金",
    "fundType": "股票型",
    "fundcode": "110022",
    "fundname": "易方达消费行业股票",
    "fundpinyin": "YFDXFHYGP",
    "fundshortname": null,
    "fundwebtype": "1",
    "hasAward": false,
    "incomeunit": "",
    "inexPandShortName": "",
    "lastMonthIncome": "-1.46",
    "lastYearIncome": "0.67",
    "level1Type": "03",
    "level2Type": "0301",
    "manager": null,
    "managerName": "萧楠",
    "memo": null,
    "netvalue": "3.444",
    "newFund": false,
    "njcode": null,
    "properties": {
      "purchasable": "1",
      "riskLevel": "中风险(R3)",
      "autoInvestable": "1",
      "interval": "0",
      "buyRatio": "",
      "f_return_period": ""
    },
    "qrnh": "",
    "retirementMemo": null,
    "returnPeriod": "",
    "rzd": "-1.49",
    "setupdate": "2010-08-20",
    "sinceIncome": "244.40",
    "state": "0",
    "status": null,
    "tdate": "20260206",
    "thisYearIncome": "0.03",
    "tip": null,
    "@Class": "com.zving.efunds.vo.FundInfo"
  }
]
```

---

## 数据提取方法

### 方法 1: 使用正则表达式

```javascript
const response = await fetch('https://www.efunds.com.cn/lm/jjcp/');
const html = await response.text();

// 提取 __FUND_SUPER_MARKET_DATA__ 的值
const match = html.match(/var __FUND_SUPER_MARKET_DATA__\s*=\s*(\[.*?\]);/s);

if (match) {
  const funds = JSON.parse(match[1]);
  console.log(`找到 ${funds.length} 只基金`);
}
```

### 方法 2: 使用 Cheerio (Node.js)

```javascript
const cheerio = require('cheerio');
const response = await fetch('https://www.efunds.com.cn/lm/jjcp/');
const html = await response.text();
const $ = cheerio.load(html);

// 查找包含 __FUND_SUPER_MARKET_DATA__ 的 script 标签
const scriptContent = $('script').filter(function() {
  return $(this).html().includes('__FUND_SUPER_MARKET_DATA__');
}).html();

const match = scriptContent.match(/var __FUND_SUPER_MARKET_DATA__\s*=\s*(\[.*?\]);/s);
const funds = JSON.parse(match[1]);
```

### 方法 3: 使用 Python BeautifulSoup

```python
import requests
import re
import json

response = requests.get('https://www.efunds.com.cn/lm/jjcp/')
html = response.text

# 使用正则表达式提取数据
match = re.search(r'var __FUND_SUPER_MARKET_DATA__\s*=\s*(\[.*?\]);', html, re.DOTALL)

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
- 某些字段是布尔类型（如 `newFund`, `hasAward`）
- 使用时需要转换：

```javascript
const netvalue = parseFloat(fund.netvalue);
const rzd = parseFloat(fund.rzd);
```

### 3. 收益率字段
所有收益率字段都是**百分比格式**的字符串：
- `thisYearIncome`: 今年以来收益率（如 `"0.03"` 表示 0.03%）
- `lastMonthIncome`: 近一月收益率（如 `"-1.46"` 表示 -1.46%）
- `lastYearIncome`: 近一年收益率（如 `"0.67"` 表示 0.67%）
- `sinceIncome`: 成立以来收益率（如 `"244.40"` 表示 244.40%）

### 4. null 值处理
- 某些字段可能为 `null`（如 `fundshortname`, `manager`, `memo`）
- 需要进行 null 检查：

```javascript
const shortName = fund.fundshortName || fund.fundname;
```

### 5. 基金类型
`fundType` 字段描述基金类型：
- `"股票型"`
- `"混合型"`
- `"债券型"`
- `"货币型"`
- `"指数型"`
- `"QDII"`
- `"FOF"`
- `"REITs"`
- `"互认基金"`

### 6. 风险等级
`properties.riskLevel` 字段描述风险等级：
- `"低风险(R1)"`
- `"中低风险(R2)"`
- `"中风险(R3)"`
- `"中高风险(R4)"`
- `"高风险(R5)"`

### 7. 基金状态
`state` 字段表示基金状态：
- `"0"`: 正常
- 其他值可能表示暂停申购等状态

### 8. 净值日期格式
- `tdate`: YYYYMMDD 格式（如 `"20260206"`）
- `setupdate`: YYYY-MM-DD 格式（如 `"2010-08-20"`）

### 9. 基金经理
- `managerName`: 基金经理姓名
- 某些基金可能有多个经理，但该字段通常只显示一个

### 10. 请求频率
- 建议每天只请求一次（基金净值每日更新一次）
- 避免频繁请求造成服务器压力

### 11. 字符编码
- 页面使用 UTF-8 编码
- 确保正确处理中文字符

---

## 数据更新时间

- 基金净值通常在每个交易日收盘后更新（约 18:00-20:00）
- `tdate` 字段表示净值日期
- 建议在每日 20:00 后同步数据

---

## 代码实现建议

### TypeScript 接口定义

```typescript
interface EfundsFundProperties {
  purchasable: string;
  riskLevel: string;
  autoInvestable: string;
  interval: string;
  buyRatio: string;
  f_return_period: string;
}

interface EfundsFund {
  fundcode: string;
  fundname: string;
  fundSourceName: string;
  fundType: string;
  netvalue: string;
  tdate: string;
  setupdate: string;
  rzd: string;
  thisYearIncome: string;
  lastMonthIncome: string;
  lastYearIncome: string;
  sinceIncome: string;
  fundpinyin: string;
  fundshortname: string | null;
  fundwebtype: string;
  level1Type: string;
  level2Type: string;
  managerName: string;
  manager: string | null;
  newFund: boolean;
  hasAward: boolean;
  awardInfo: string | null;
  displayOrder: string;
  state: string;
  status: string | null;
  incomeunit: string;
  inexPandShortName: string;
  qrnh: string;
  returnPeriod: string;
  retirementMemo: string | null;
  tip: string | null;
  memo: string | null;
  contractType: string | null;
  njcode: string | null;
  properties: EfundsFundProperties;
  '@Class': string;
}

// 解析基金数据
function parseEfundsFund(fund: EfundsFund) {
  return {
    code: fund.fundcode,
    name: fund.fundname,
    fullName: fund.fundSourceName,
    fundType: fund.fundType,
    netValue: parseFloat(fund.netvalue),
    change: parseFloat(fund.rzd),
    thisYearIncome: parseFloat(fund.thisYearIncome),
    lastMonthIncome: parseFloat(fund.lastMonthIncome),
    lastYearIncome: parseFloat(fund.lastYearIncome),
    sinceIncome: parseFloat(fund.sinceIncome),
    navDate: fund.tdate,
    setupDate: fund.setupdate,
    managerName: fund.managerName,
    riskLevel: fund.properties.riskLevel,
    purchasable: fund.properties.purchasable === '1',
    autoInvestable: fund.properties.autoInvestable === '1',
    isNew: fund.newFund,
    url: `https://www.efunds.com.cn/fund/${fund.fundcode}.shtml`,
  };
}
```

### Node.js 完整示例

```javascript
async function fetchEfundsFunds() {
  const response = await fetch('https://www.efunds.com.cn/lm/jjcp/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const html = await response.text();

  // 提取 __FUND_SUPER_MARKET_DATA__
  const match = html.match(/var __FUND_SUPER_MARKET_DATA__\s*=\s*(\[.*?\]);/s);

  if (!match) {
    throw new Error('无法提取基金数据');
  }

  const funds = JSON.parse(match[1]);

  console.log(`找到 ${funds.length} 只基金`);

  return funds.map(fund => ({
    code: fund.fundcode,
    name: fund.fundname,
    fullName: fund.fundSourceName,
    fundType: fund.fundType,
    netValue: parseFloat(fund.netvalue),
    change: parseFloat(fund.rzd),
    thisYearIncome: parseFloat(fund.thisYearIncome),
    lastMonthIncome: parseFloat(fund.lastMonthIncome),
    lastYearIncome: parseFloat(fund.lastYearIncome),
    sinceIncome: parseFloat(fund.sinceIncome),
    navDate: fund.tdate,
    setupDate: fund.setupdate,
    managerName: fund.managerName,
    riskLevel: fund.properties.riskLevel,
    isNew: fund.newFund,
  }));
}

// 使用
const funds = await fetchEfundsFunds();
console.log(funds.slice(0, 5)); // 显示前 5 只基金
```

---

## 与其他基金公司 API 对比

| 特性 | 易方达基金 | 南方基金 | 博时基金 |
|------|-----------|---------|---------|
| **返回格式** | HTML + JavaScript | JSON | HTML + JavaScript |
| **数据提取** | 需要解析 HTML | 直接解析 JSON | 需要解析 HTML |
| **变量名** | `__FUND_SUPER_MARKET_DATA__` | `g_index_hblist` | `fundListJson` |
| **请求方式** | GET | POST | GET |
| **数据量** | 中等（数百只基金） | 大（数万条数据） | 大（数百只基金） |
| **数据更新** | 每日 | 每日 | 每日 |

---

## 相关链接

- **官方网站**: https://www.efunds.com.cn
- **基金超市页面**: https://www.efunds.com.cn/lm/jjcp/
- **API 前缀**: https://api.efunds.com.cn/xcowch/
