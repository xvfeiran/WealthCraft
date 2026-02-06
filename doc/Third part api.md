# **NASDAQ API**

### 1. 获取股票列表

* **URL**: `https://api.nasdaq.com/api/screener/stocks`
* **方法**: GET
* **查询参数**:

  * `download` (boolean, optional): 是否下载完整列表，默认 `true`
  * `exchange` (string, optional): 交易所筛选，可选值为 `NASDAQ`、`NYSE`、`AMEX`。不传则返回所有交易所的股票
* **示例请求**:

```
# 获取所有交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true

# 仅获取NASDAQ交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true&exchange=NASDAQ

# 仅获取NYSE交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true&exchange=NYSE

# 仅获取AMEX交易所股票
GET https://api.nasdaq.com/api/screener/stocks?download=true&exchange=AMEX
```

* **返回 JSON 结构**:

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

> **说明**:

* `symbol`：股票代码
* `name`：股票名称
* `lastsale`：最新成交价
* `netchange`：涨跌额
* `pctchange`：涨跌幅
* `volume`：成交量
* `marketCap`：市值
* `country`：国家
* `ipoyear`：上市年份
* `industry` / `sector`：行业分类
* `url`：股票详细页面 URL

---

### 2. 获取 ETF 列表

* **URL**: `https://api.nasdaq.com/api/screener/etf`
* **方法**: GET
* **示例请求**:

```
GET https://api.nasdaq.com/api/screener/etf
```

* **返回 JSON 结构**:

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

> **说明**:

* `symbol`：ETF 代码
* `companyName`：ETF 名称
* `lastSalePrice`：最新成交价
* `percentageChange`：涨跌幅
* `oneYearPercentage`：一年涨跌幅

---

# **SSE（上海证券交易所）API**

### 1. 获取股票列表

* **URL**: `https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity`
* **方法**: GET
* **查询参数**:

  * `select` (string, optional): 返回字段，用逗号分隔，如：`code,name,open`
* **示例请求**:

```
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity
```

* **返回 JSON 结构**:

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

> **说明**:

* `list`：股票数组，每项为 `[code, name, lastPrice]`
* `date`：数据日期
* `time`：时间（HHMMSS）
* `total` / `begin` / `end`：分页信息

---

### 2. 获取基金列表

* **URL**: `https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/fwr`
* **方法**: GET
* **示例请求**:

```
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/fwr
```

* **返回 JSON 结构**:

```json
{
  "date": 20260205,
  "time": 161457,
  "total": 991,
  "begin": 0,
  "end": 991,
  "list": [
    ["501001", "财通精选", 1.4900],
    ["501005", "精准医疗", 1.0180]
  ]
}
```

> **说明**:

* `list`：基金数组，每项为 `[code, name, lastPrice]`

---

### 3. 获取债券列表

* **URL**: `https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/all`
* **方法**: GET
* **示例请求**:

```
GET https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/all
```

* **返回 JSON 结构**:

```json
{
  "date": 20260205,
  "time": 161614,
  "total": 21198,
  "begin": 0,
  "end": 21198,
  "list": [
    ["010609", "06国债⑼", 100.0000],
    ["010706", "07国债06", 100.0000]
  ]
}
```

> **说明**:

* `list`：包含所有证券类型，需按代码前缀过滤债券
* 债券代码前缀：`01`（国债）、`02`（地方债）、`11`（可转债）、`12`（企业债）

---

### 4. 获取日 K 线数据

* **URL**: `https://yunhq.sse.com.cn:32042/v1/sh1/dayk/{code}`
* **方法**: GET
* **路径参数**:

  * `code`：股票代码
* **示例请求**:

```
GET https://yunhq.sse.com.cn:32042/v1/sh1/dayk/600006
```

* **返回 JSON 结构**:

```json
{
  "code": "600006",
  "total": 6321,
  "begin": 6221,
  "end": 6321,
  "kline": [
    [20250909, 7.4600, 7.5400, 7.4200, 7.4600, 30121893, 225263853],
    [20250910, 7.4400, 7.5000, 7.4300, 7.4600, 21287417, 158778966],
    [20250911, 7.4400, 7.6000, 7.3700, 7.5700, 43328832, 324701823]
  ]
}
```

> **说明**:

* `kline`：二维数组，每条记录对应一天的 K 线数据 `[date, open, high, low, close, volume, amount]`
* `date`：交易日期（YYYYMMDD）
* `open` / `high` / `low` / `close`：开盘、最高、最低、收盘价格
* `volume`：成交量
* `amount`：成交额
* `total` / `begin` / `end`：K 线总条数和分页信息
