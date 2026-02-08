# Binance API Integration Summary

## 实施日期
2026-02-08

## 实施内容

### 1. API 文档
- **文件**: `doc/external-apis/binance-api.md`
- **内容**:
  - Binance API 完整文档
  - 端点说明（价格、24小时统计、交易所信息）
  - 使用示例
  - **重要提示**: 地域限制说明和代理配置指南

### 2. 后端服务
- **文件**: `app/src/services/binanceSyncService.ts`
- **功能**:
  - `syncUSDTMarkets()`: 同步所有USDT交易对（过滤成交量 > $10,000）
  - `syncTopCryptos(limit)`: 同步前N名加密货币（按成交量排序）
  - `syncSpecificCryptos(symbols)`: 同步指定加密货币
  - `getStats()`: 获取数据库中的加密货币统计
  - `clearAll()`: 清空所有加密货币数据

### 3. 集成到投资标的同步服务
- **文件**: `app/src/services/instrumentSyncService.ts`
- **新增方法**:
  - `syncBinance()`: 同步所有币安USDT交易对
  - `syncBinanceTop(limit)`: 同步前N名加密货币
- **更新**: `syncAll()` 方法现在包含币安同步

### 4. 控制器更新
- **文件**: `app/src/controllers/instrumentController.ts`
- **更新**:
  - `validMarkets` 数组增加 `'BINANCE'`
  - `syncMarket()` 方法增加 BINANCE case 处理

### 5. 前端支持
- **文件**: `web/src/components/portfolio/AddAssetModal.tsx`
- **更新**:
  - `MARKET_LABELS` 增加 `'BINANCE': '币安加密货币'`
  - 搜索模式下市场筛选下拉菜单增加 BINANCE 选项
  - 手动输入模式下市场选择下拉菜单增加 BINANCE 选项

## 重要提示

### 地域限制
⚠️ **Binance API 在中国大陆地区受访问限制**，会返回 HTTP 451 错误。

### 解决方案
**必须配置代理**才能使用：
1. 在 `app/.env` 文件中设置 `PROXY_URL`
   ```bash
   # HTTP 代理示例
   PROXY_URL=http://127.0.0.1:1080

   # SOCKS5 代理示例
   PROXY_URL=socks5://127.0.0.1:1080
   ```

2. 重启后端服务器使配置生效

### 验证代理配置
```bash
# 测试是否能访问 Binance API
curl -x http://127.0.0.1:1080 https://api.binance.com/api/v3/ping
# 期望输出: {} (空JSON对象)
```

## 使用方法

### 1. 通过 API 触发同步
```bash
# 同步所有币安加密货币
POST /api/instruments/sync/binance

# 需要认证：
Authorization: Bearer <token>
```

### 2. 通过前端添加加密货币资产
1. 进入投资组合详情页
2. 点击"添加资产"
3. 市场选择"币安加密货币"
4. 输入币种代码（如 BTC, ETH）
5. 填写其他信息并提交

### 3. 直接调用服务
```typescript
import { binanceSyncService } from './services/binanceSyncService';

// 同步前100名加密货币
const result = await binanceSyncService.syncTopCryptos(100);
console.log(`成功: ${result.success}, 失败: ${result.failed}`);

// 获取统计信息
const stats = await binanceSyncService.getStats();
console.log(`数据库中加密货币总数: ${stats.total}`);
```

## 数据库字段映射

| Binance API 字段 | 数据库字段 | 说明 |
|-----------------|-----------|------|
| symbol → replace('USDT', '') | symbol | 币种代码（如 BTC） |
| lastPrice | lastPrice | 最新价格 |
| priceChange | change | 24小时涨跌额 |
| priceChangePercent | changePercent | 24小时涨跌幅 |
| quoteVolume | volume | 成交额（USDT） |
| quoteVolume | marketCap | 用成交额作为市值代理 |

## 支持的加密货币

系统会自动同步所有满足以下条件的加密货币：
- 交易对以 USDT 结尾
- 24小时成交额 > $10,000
- 排除 USDT/USDT 自身交易

主流加密货币包括：
- BTC (Bitcoin)
- ETH (Ethereum)
- BNB (Binance Coin)
- XRP, ADA, SOL, DOGE, DOT, MATIC, LTC, AVAX, LINK, ATOM, UNI 等

## 后续改进建议

1. **名称映射优化**: 目前使用简单的名称映射表，可以考虑从 Binance ExchangeInfo API 获取完整名称
2. **更多交易对**: 支持其他计价货币（BUSD, USDC, EUR等）
3. **K线数据**: 添加历史价格数据同步
4. **定时任务**: 设置每5分钟自动同步加密货币价格

## 相关文件

- API 文档: `doc/external-apis/binance-api.md`
- 同步服务: `app/src/services/binanceSyncService.ts`
- 投资标的服务: `app/src/services/instrumentSyncService.ts`
- 控制器: `app/src/controllers/instrumentController.ts`
- 前端组件: `web/src/components/portfolio/AddAssetModal.tsx`
