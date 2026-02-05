
# 一、系统数据源：美股 ETF API

* **接口地址**
  `GET https://api.nasdaq.com/api/screener/etf`

* **返回结构示例**

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

* **实现要求**

  * 在 `app/src/services/marketDataService.ts` 中接入该 API
  * 前端做相应修改
  * 将接口说明写入文档：

    ```
    doc/Third part api.md
    ```

---

# 二、投资组合（Portfolio）

投资组合由**资产结构**与**投资规则**组成。

## 1. 资产结构

* 投资组合可包含多个资产类别（Asset Class）
* 每个资产类别下可添加多个资产（Asset）

## 2. 投资规则（Portfolio Rules）

投资组合可配置以下规则（可单独或组合使用）：

### 2.1 Allocation Rule（资产配置规则）

* 为各资产类别设定目标持仓比例

### 2.2 Contribution Rule（资金投入规则）

* 按设定周期投入固定金额（定投）

### 2.3 Rebalancing Rule（再平衡规则）

* 当持仓比例偏离目标配置时执行再平衡

---

## 投资建议（Investment Recommendation）

在投资组合概览页，根据以下数据生成投资建议：

* 当前持仓（Current Holdings）
* Allocation Rule
* Contribution Rule

系统提供两种再平衡模式：

---

## 再平衡模式

### 1. 卖出再平衡（Sell-based Rebalancing）

不使用新资金，仅通过买卖现有资产使组合回到目标比例。

**逻辑：**

1. 计算当前组合总市值。
2. 根据目标比例计算各资产目标市值。
3. 对比当前市值与目标市值：

   ```
   delta = target_value - current_value
   ```
4. 若 delta > 0 → 建议买入该资产
   若 delta < 0 → 建议卖出该资产
5. 输出每个资产的建议买入或卖出金额。

---

### 2. 买入再平衡（Contribution-based Rebalancing）

仅使用本次投入资金，不卖出现有资产。

**逻辑：**

1. 获取本次投入金额（Contribution）。
2. 计算当前组合总市值。
3. 计算投入后组合总市值：

   ```
   new_total = current_total + contribution
   ```
4. 根据目标比例计算各资产目标市值。
5. 计算资金缺口：

   ```
   gap = max(0, target_value - current_value)
   ```
6. 按各资产缺口比例分配本次投入资金。
7. 输出每个资产的建议买入金额。

---

## 特殊情况

### 1. 只有 Contribution Rule

* 每次按预设投资比例分配投入金额。

### 2. 只有 Allocation Rule

* 仅提供卖出再平衡建议。
* 不计算买入金额。
