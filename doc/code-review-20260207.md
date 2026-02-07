# 代码审查报告 - 2026-02-07

## 问题代码文件

### 1. PortfolioDetail.tsx (2049 行) ⚠️ 严重

**问题**:
- 违反单一职责原则 (SRP)
- 包含 6 个 Modal 组件
- 主组件 857 行
- 难以维护和测试

**组件结构**:
```
PortfolioDetail.tsx
├── PortfolioDetail (主组件, 857 行)
├── AddAssetModal (~399 行)
├── SubPortfolioModal (~117 行)
├── TransactionModal (~180 行)
├── AssetDetailModal (~188 行)
├── MoveAssetModal (~103 行)
└── EditAssetModal (~186 行)
```

**重构方案**:
```
web/src/components/portfolio/
├── AddAssetModal.tsx
├── SubPortfolioModal.tsx
├── TransactionModal.tsx
├── AssetDetailModal.tsx
├── MoveAssetModal.tsx
├── EditAssetModal.tsx
└── index.ts
```

### 2. instrumentSyncService.ts (545 行) ⚠️ 中等

**问题**:
- 功能边界清晰，但方法数量较多
- 可以考虑按市场拆分

**当前结构**:
- syncChineseFunds
- syncUSExchange (NASDAQ, NYSE, AMEX)
- syncSSEStock, syncSSEFund, syncSSEBond
- 辅助方法: search, getBySymbol, getStats, clearAll

**评估**: 暂时不需要重构，功能相关性强

### 3. 其他文件 (400 行以下)

**评估**: 可接受范围，暂不需要重构

## 整洁代码原则 (Clean Code)

### 函数/组件大小
- ✅ **推荐**: < 100 行
- ⚠️ **警告**: 100-300 行
- ❌ **不可接受**: > 300 行

### 单一职责原则 (SRP)
- 一个组件/函数应该只做一件事
- 如果组件名包含 "And" 或 "Or"，通常违反 SRP

### 模块化原则
- 相关功能应该组织在一起
- 共享逻辑应该提取到 hooks/utils
- 组件应该按功能层次组织

## 重构优先级

1. **高优先级**: PortfolioDetail.tsx
   - 影响: 可维护性、可测试性
   - 工作量: 中等
   - 收益: 高

2. **低优先级**: instrumentSyncService.ts
   - 影响: 可读性
   - 工作量: 高
   - 收益: 中

## 后续行动

- [ ] 提取 PortfolioDetail.tsx 中的 Modal 组件
- [ ] 创建共享 hooks 文件
- [ ] 更新文档记录最佳实践
