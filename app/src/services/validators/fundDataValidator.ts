import { FundData } from '../types/fund.types';
import { logger } from '../../utils/logger';

export class FundDataValidator {
  static validate(fund: FundData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 必填字段验证
    if (!fund.code || fund.code.trim().length === 0) {
      errors.push('Fund code is required');
    }

    if (!fund.name || fund.name.trim().length === 0) {
      errors.push('Fund name is required');
    }

    if (!fund.market || fund.market.trim().length === 0) {
      errors.push('Market is required');
    }

    // 数值范围验证
    if (fund.lastPrice < 0) {
      errors.push('Last price cannot be negative');
    }

    // 日期验证
    if (fund.navDate && isNaN(fund.navDate.getTime())) {
      errors.push('Invalid navDate');
    }

    if (fund.setupDate && isNaN(fund.setupDate.getTime())) {
      errors.push('Invalid setupDate');
    }

    // 收益率验证（不能为负数的无穷大）
    const yields = [
      fund.yield7d, fund.yield1w, fund.yield1m, fund.yield3m,
      fund.yield6m, fund.yield1y, fund.yieldYtd, fund.yieldSinceInception
    ];

    for (const yieldValue of yields) {
      if (yieldValue !== undefined && (isNaN(yieldValue) || !isFinite(yieldValue))) {
        errors.push('Invalid yield value');
        break;
      }
    }

    // 记录无效数据
    if (errors.length > 0) {
      logger.warn(`[FundValidator] Invalid fund data for ${fund.code}: ${errors.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
