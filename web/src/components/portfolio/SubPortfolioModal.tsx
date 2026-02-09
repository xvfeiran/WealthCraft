import { useState } from 'react';
import { portfolioApi } from '../../api/client';
import type { Portfolio, SubPortfolio } from '../../types';

interface SubPortfolioModalProps {
  portfolioId: string;
  portfolio: Portfolio;
  subPortfolio: SubPortfolio | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SubPortfolioModal({
  portfolioId,
  portfolio,
  subPortfolio,
  onClose,
  onSaved,
}: SubPortfolioModalProps) {
  const [name, setName] = useState(subPortfolio?.name || '');
  const [allocationPercent, setAllocationPercent] = useState(
    subPortfolio?.allocationPercent?.toString() || ''
  );
  const [contributionAmount, setContributionAmount] = useState(
    subPortfolio?.contributionAmount?.toString() || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!subPortfolio;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        name,
        allocationPercent: parseFloat(allocationPercent) || 0,
        contributionAmount: parseFloat(contributionAmount) || 0,
      };

      if (isEditing) {
        await portfolioApi.updateSubPortfolio(portfolioId, subPortfolio.id, data);
      } else {
        await portfolioApi.createSubPortfolio(portfolioId, data);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEditing ? '编辑子组合' : '创建子组合'}</h3>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="subName">子组合名称</label>
            <input
              type="text"
              id="subName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例如：A股组合、债券组合"
            />
          </div>

          {portfolio.ruleType === 'ALLOCATION' && (
            <div className="form-group">
              <label htmlFor="subAllocation">目标比例 (%)</label>
              <input
                type="number"
                id="subAllocation"
                value={allocationPercent}
                onChange={(e) => setAllocationPercent(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
              />
              <small className="form-hint">该子组合在整个投资组合中的目标占比</small>
            </div>
          )}

          {portfolio.ruleType === 'CONTRIBUTION' && (
            <div className="form-group">
              <label htmlFor="subContribution">每次定投金额 ({portfolio.baseCurrency})</label>
              <input
                type="number"
                id="subContribution"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                step="0.01"
                min="0"
                placeholder="0"
              />
              <small className="form-hint">每次定投时分配给该子组合的金额</small>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '保存中...' : isEditing ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
