# 添加资产功能改进

## 修改日期
**日期**: 2026-02-07
**状态**: ✅ 已完成

## 功能改进

### 1. 市场字段优化
- **搜索添加**: 从市场数据搜索选择资产时，市场字段自动填充并显示为只读（不再显示下拉选择框）
- **手动输入**: 手动输入资产时，仍可从下拉列表选择市场

### 2. 渠道选择功能
- 添加了"渠道"下拉选择框
- 渠道为可选字段（不选择任何渠道也可以添加资产）
- 自动加载用户已配置的所有渠道
- 显示格式：渠道名称 (账号)
- 渠道数据来源：`GET /channels/simple` API

## 代码变更

### 前端

#### 1. 组件状态
- 添加 `channelId` state
- 添加 `channels` state
- 添加 `loadingChannels` state

#### 2. API调用
- 组件加载时调用 `channelApi.getAllSimple()` 获取渠道列表
- `assetApi.create()` 添加 `channelId` 参数

#### 3. UI改动

**搜索选择模式（`selectedInstrument`存在时）**：
```tsx
<div className="form-group">
  <label>市场</label>
  <input
    type="text"
    value={MARKET_LABELS[market] || market}
    disabled
    className="readonly-input"
  />
</div>
```

**渠道选择（新增）**：
```tsx
<div className="form-group">
  <label htmlFor="channel">渠道（可选）</label>
  <select
    id="channel"
    value={channelId}
    onChange={(e) => setChannelId(e.target.value)}
    disabled={loadingChannels}
  >
    <option value="">不选择</option>
    {channels.map((channel) => (
      <option key={channel.id} value={channel.id}>
        {channel.name}
        {channel.account ? ` (${channel.account})` : ''}
      </option>
    ))}
  </select>
  {loadingChannels && <small>加载渠道中...</small>}
</div>
```

#### 4. 样式
添加 `readonly-input` 样式：
```css
.readonly-input {
  background: #f5f5f5;
  color: #666;
  cursor: not-allowed;
  border: 1px solid #ddd;
}
```

#### 5. API类型更新
```typescript
create: (portfolioId: string, data: {
  // ... existing fields
  channelId?: string;  // 新增
}) => api.post<ApiResponse>(`/assets/portfolio/${portfolioId}`, data),
```

### 后端

#### 1. 数据库Schema
**Asset模型** - 添加字段：
```prisma
channelId  String?  // 关联的交易渠道ID（可选）
channel    Channel? @relation(fields: [channelId], references: [id], onDelete: SetNull)
```

**Channel模型** - 添加关联：
```prisma
assets  Asset[]
```

**Migration**: `20260207092954_add_channel_id_to_asset`

#### 2. Controller更新
```typescript
const {
  // ... existing fields
  channelId,  // 新增
} = req.body;

const asset = await assetService.create(portfolioId, req.user.userId, {
  // ... existing fields
  channelId,  // 新增
});
```

#### 3. Service更新
**接口定义**：
```typescript
data: {
  // ... existing fields
  channelId?: string;  // 新增
}
```

**创建逻辑**：
```typescript
const asset = await prisma.asset.create({
  data: {
    // ... existing fields
    channelId: data.channelId || null,
  },
});
```

## 测试场景

### 场景1: 从搜索添加资产
1. 用户在添加资产弹窗中选择"搜索添加"
2. 输入关键词搜索（如"南方"）
3. 从搜索结果中选择一只基金
4. **预期**：
   - 市场字段显示为只读（如"上交所-基金"）
   - 可以选择渠道（可选）
   - 提交成功后，资产保存并关联到选择的渠道

### 场景2: 手动输入添加资产
1. 用户在添加资产弹窗中选择"手动输入"
2. 填写代码、名称
3. 从下拉列表选择市场
4. **预期**：
   - 可以选择市场（下拉选择）
   - 可以选择渠道（可选）
   - 提交成功后，资产保存

### 场景3: 不选择渠道
1. 用户添加资产时，渠道选择框保持为"不选择"
2. **预期**：
   - 可以正常提交
   - 资产的channelId为null

### 场景4: 选择渠道
1. 用户已配置渠道（如"南方基金"、"老虎证券"）
2. 添加资产时选择一个渠道
3. **预期**：
   - 提交成功后，资产关联到该渠道
   - 可以在资产详情中看到渠道信息

## 数据库变更

### Migration SQL
```sql
-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "channelId" TEXT;

-- AddForeignKey
CREATE INDEX "Asset_channelId_idx" ON "Asset"("channelId");
```

## 用户体验改进

### 修改前
- ❌ 添加资产时需要手动选择市场（即使从搜索选择）
- ❌ 无法关联交易渠道
- ❌ 无法追踪资产是在哪个渠道交易的

### 修改后
- ✅ 从搜索选择时，市场自动显示且只读
- ✅ 可以选择渠道（可选）
- ✅ 支持渠道与资产的关联
- ✅ 可以按渠道筛选和统计资产

## 后续扩展

1. **渠道统计**: 按渠道统计资产分布
2. **交易记录**: 在交易记录中显示渠道
3. **渠道详情**: 查看渠道下的所有资产
4. **渠道筛选**: 在资产列表中按渠道筛选

---

**修改者**: Claude Code
**版本**: v1.0
**状态**: ✅ 完成
