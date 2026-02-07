# External APIs Documentation

本目录包含 WealthCraft 项目使用的所有第三方交易平台 API 文档。

## 文档目录

### 美国市场

| 平台 | Host | 交易所 | 文档 |
|------|------|--------|------|
| **NASDAQ** | api.nasdaq.com | NASDAQ, NYSE, AMEX | [NASDAQ API](./nasdaq-api.md) |

### 中国市场 - 证券交易所

| 平台 | Host | 交易所 | 文档 |
|------|------|--------|------|
| **SSE** | yunhq.sse.com.cn:32042 | 上海证券交易所 | [SSE API](./sse-api.md) |

### 中国市场 - 基金公司

| 平台 | Host | 公司 | 文档 |
|------|------|------|------|
| **南方基金** | www.nffund.com | 南方基金 | [南方基金 API](./nffund-api.md) |
| **博时基金** | www.bosera.com | 博时基金 | [博时基金 API](./bosera-api.md) |
| **易方达基金** | www.efunds.com.cn | 易方达基金 | [易方达基金 API](./efunds-api.md) |

## 使用说明

每个 API 文档包含：
- API 端点和请求方法
- 请求参数说明
- 响应数据结构
- 使用示例
- 注意事项和限制

## 数据同步

项目使用 [`instrumentSyncService`](../../app/src/services/instrumentSyncService.ts) 定期同步各交易所的市场数据。

## 相关文件

- [同步服务实现](../../app/src/services/instrumentSyncService.ts)
- [数据服务实现](../../app/src/services/marketDataService.ts)
- [HTTP 客户端（带重试机制）](../../app/src/utils/httpClient.ts)
