# 南方基金 (NFFund) API Documentation

**平台信息**
- **Host**: `www.nffund.com`
- **协议**: HTTPS
- **数据格式**: JSON
- **基金公司**: 南方基金

## API 概览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/nfwebApi/fund/supermarket` | POST | 获取基金超市列表（所有基金数据） |

---

## 获取基金列表

### 端点
```
POST https://www.nffund.com/nfwebApi/fund/supermarket
```

### 请求参数

该 API 可能需要 POST 请求体，具体参数未在示例中显示。通常基金超市 API 可能支持以下筛选参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fundType` | string | 否 | 基金类型筛选 |
| `sortField` | string | 否 | 排序字段 |
| `sortOrder` | string | 否 | 排序方向（asc/desc） |
| `pageIndex` | number | 否 | 页码 |
| `pageSize` | number | 否 | 每页数量 |

### 示例请求

```bash
# 获取所有基金
POST https://www.nffund.com/nfwebApi/fund/supermarket
Content-Type: application/json
```

### 响应结构

```json
{
  "code": "ETS-5BP00000",
  "message": "操作成功",
  "data": {
    "g_index_hblist": [
      {
        // 基金对象（见下方字段说明）
      }
    ]
  }
}
```

### 响应字段说明

#### 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | string | 响应代码，成功为 `ETS-5BP00000` |
| `message` | string | 响应消息 |
| `data` | object | 数据对象 |
| `data.g_index_hblist` | array | 基金列表数组 |

#### 基金对象字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `fundcode` | string | 基金代码 | `"202308"` |
| `fundname` | string | 基金名称 | `"南方收益宝货币B"` |
| `fdate` | string | 基金净值日期（YYYYMMDD） | `"20260206"` |
| `nav` | string | 单位净值 | `"1.0000"` |
| `ljnav` | string | 累计净值 | `"1.0000"` |
| `upRatio` | string | 日涨跌幅（%） | `"0.00"` |
| `fmwfsy` | string | 七日年化收益率（%） | `"0.3924"` |
| `fqrsyl` | string | 万份收益（元） | `"1.445"` |
| `fyzqsy` | string\|null | - | - |
| `recentHalfYear` | string | 近半年收益率（%） | `"0.73"` |
| `recentOneYear` | string | 近一年收益率（%） | `"1.54"` |
| `thisYear` | string | 今年以来收益率（%） | `"0.15"` |
| `since` | string | 成立以来收益率（%） | `"31.41"` |
| `recentOneMonth` | string | 近一月收益率（%） | `"0.12"` |
| `recentThreeYear` | string | 近三年收益率（%） | `"5.90"` |
| `recentFiveYear` | string | 近五年收益率（%） | `"10.85"` |
| `transactionState` | number | 交易状态 | `0` |
| `investmentstyle` | number | 投资风格类型 | `7` |
| `sectype` | number | 安全类型 | `0` |
| `webFirstCategorys` | string | 一级分类 ID | `"173C6C94CE0608f07e8d831e6f2c99d7"` |
| `webSecondCategorys` | string | 二级分类 ID | `"173C6D59D385ffa57b879fb231e7d1b1"` |
| `status` | number | 基金状态 | `1` |
| `orderby` | number | 排序值 | `116` |
| `zx_status` | string | - | `"0"` |
| `valuagr_state` | string | 估值增长状态 | `"1"` |
| `hotTag` | number | 热门标签 | `0` |
| `dividendFlag` | boolean | 分红标志 | `false` |
| `fundManagerName` | string | 基金经理姓名（多个用\|分隔） | `"蔡奕奕\|邓文"` |
| `searchKey` | string | 搜索关键词 | `"(202308) 南方收益宝货币B 蔡奕奕\|邓文"` |
| `reits` | boolean | 是否 REITs | `false` |

### 完整示例

```json
{
  "code": "ETS-5BP00000",
  "message": "操作成功",
  "data": {
    "g_index_hblist": [
      {
        "fundcode": "202308",
        "fundname": "南方收益宝货币B",
        "fdate": "20260206",
        "nav": "1.0000",
        "ljnav": "1.0000",
        "upRatio": "0.00",
        "fmwfsy": "0.3924",
        "fqrsyl": "1.445",
        "fyzqsy": null,
        "recentHalfYear": "0.73",
        "recentOneYear": "1.54",
        "thisYear": "0.15",
        "since": "31.41",
        "recentOneMonth": "0.12",
        "recentThreeYear": "5.90",
        "recentFiveYear": "10.85",
        "transactionState": 0,
        "investmentstyle": 7,
        "sectype": 0,
        "webFirstCategorys": "173C6C94CE0608f07e8d831e6f2c99d7",
        "webSecondCategorys": "173C6D59D385ffa57b879fb231e7d1b1",
        "status": 1,
        "orderby": 116,
        "zx_status": "0",
        "valuagr_state": "1",
        "hotTag": 0,
        "dividendFlag": false,
        "fundManagerName": "蔡奕奕|邓文",
        "searchKey": "(202308) 南方收益宝货币B 蔡奕奕|邓文",
        "reits": false
      }
    ]
  }
}
```

### 使用示例

```typescript
const response = await fetch('https://www.nffund.com/nfwebApi/fund/supermarket', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  body: JSON.stringify({
    // 可能的请求参数
  }),
});

const result = await response.json();

if (result.code === 'ETS-5BP00000') {
  const funds = result.data.g_index_hblist;

  funds.forEach(fund => {
    console.log(`基金代码: ${fund.fundcode}`);
    console.log(`基金名称: ${fund.fundname}`);
    console.log(`单位净值: ${fund.nav}`);
    console.log(`日涨跌: ${fund.upRatio}%`);
    console.log(`近一年收益: ${fund.recentOneYear}%`);
  });
}
```

---

## 注意事项

### 1. 数据量
- 该 API 返回所有南方基金的数据
- 数据量很大（60,000+ 行 JSON）
- 建议实现分页或增量更新

### 2. 数据类型
- 所有数值字段在响应中都是**字符串格式**
- 使用时需要转换为数值类型：
  ```typescript
  const nav = parseFloat(fund.nav);
  const upRatio = parseFloat(fund.upRatio);
  ```

### 3. null 值处理
- 某些字段可能为 `null`（如 `fyzqsy`、`recentThreeYear`、`recentFiveYear`）
- 需要进行 null 检查：
  ```typescript
  const threeYear = fund.recentThreeYear
    ? parseFloat(fund.recentThreeYear)
    : null;
  ```

### 4. 基金类型
根据 `webFirstCategorys` 和 `webSecondCategorys` 字段可以区分不同类型的基金：
- 货币市场基金
- 债券基金
- 股票基金
- 混合基金
- 等

### 5. 基金经理
- `fundManagerName` 字段可能包含多个基金经理，使用 `|` 分隔
- 示例：`"蔡奕奕|邓文"` 表示两位基金经理

### 6. 交易状态
`transactionState` 字段表示基金的交易状态：
- `0`: 正常交易
- `2`: 限制交易
- `3`: 暂停交易
- 等其他状态

### 7. 请求频率
- 建议每天只请求一次（基金净值每日更新一次）
- 避免频繁请求造成服务器压力

---

## 数据更新时间

- 基金净值通常在每个交易日收盘后更新（约 18:00-20:00）
- `fdate` 字段表示净值日期
- 建议在每日 20:00 后同步数据

---

## 代码实现建议

```typescript
interface NFFundResponse {
  code: string;
  message: string;
  data: {
    g_index_hblist: NFFund[];
  };
}

interface NFFund {
  fundcode: string;
  fundname: string;
  fdate: string;
  nav: string;
  ljnav: string;
  upRatio: string;
  fmwfsy: string;
  fqrsyl: string;
  fyzqsy: string | null;
  recentHalfYear: string;
  recentOneYear: string;
  thisYear: string;
  since: string;
  recentOneMonth: string;
  recentThreeYear: string | null;
  recentFiveYear: string | null;
  transactionState: number;
  investmentstyle: number;
  sectype: number;
  webFirstCategorys: string;
  webSecondCategorys: string;
  status: number;
  orderby: number;
  zx_status: string;
  valuagr_state: string;
  hotTag: number;
  dividendFlag: boolean;
  fundManagerName: string;
  searchKey: string;
  reits: boolean;
}

// 解析基金数据
function parseFund(fund: NFFund) {
  return {
    code: fund.fundcode,
    name: fund.fundname,
    nav: parseFloat(fund.nav),
    change: parseFloat(fund.upRatio),
    yield7d: parseFloat(fund.fmwfsy),
    yield1y: parseFloat(fund.recentOneYear),
    managers: fund.fundManagerName.split('|'),
  };
}
```

---

## 相关链接

- **官方网站**: https://www.nffund.com
- **数据来源**: POST https://www.nffund.com/nfwebApi/fund/supermarket
