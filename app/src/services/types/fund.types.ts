// 基金数据接口定义

export interface FundData {
  code: string;           // 基金代码
  name: string;           // 基金名称
  market: string;         // 市场标识: NF_FUND, BOSERA, EFUNDS
  type: string;           // FUND

  // 价格数据
  lastPrice: number;      // 最新净值
  change: number;         // 日涨跌幅（%）

  // 基金特有数据
  fundType?: string;      // 基金类型
  riskLevel?: string;     // 风险等级
  managerName?: string;   // 基金经理

  // 收益率数据
  yield7d?: number;       // 七日年化（货币基金）
  yield1w?: number;       // 近一周
  yield1m?: number;       // 近一月
  yield3m?: number;       // 近三月
  yield6m?: number;       // 近六月
  yield1y?: number;       // 近一年
  yieldYtd?: number;      // 今年以来
  yieldSinceInception?: number; // 成立以来

  // 日期
  navDate?: Date;         // 净值日期
  setupDate?: Date;       // 成立日期

  // 状态
  isActive: boolean;      // 是否可交易
}

// 统一的数据提取器接口
export interface IFundDataExtractor {
  fetch(): Promise<FundData[]>;
  getSource(): string;    // 返回数据源名称
}

// 同步结果类型
export interface SourceResult {
  source: string;
  success: number;
  failed: number;
  duration?: number;
  error?: string;
}

export interface SyncResults {
  [source: string]: {
    success: number;
    failed?: number;
    duration?: number;
    error?: string;
  };
}

// 进度跟踪类型
export interface SourceProgress {
  source: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  total?: number;
  processed: number;
  success: number;
  failed: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
}

export interface OverallProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  percent: number;
  sources: SourceProgress[];
}

// 性能指标类型
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  operations: number;
  errors: number;
}
