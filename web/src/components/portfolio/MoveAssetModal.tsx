import { useState } from 'react';
import { assetApi } from '../../api/client';
import type { Asset, Portfolio } from '../../types';

interface MoveAssetModalProps {
  asset: Asset;
  portfolio: Portfolio;
  onClose: () => void;
  onMoved: () => void;
}

export function MoveAssetModal({
  asset,
  portfolio,
  onClose,
  onMoved,
}: MoveAssetModalProps) {
  const [targetSubPortfolioId, setTargetSubPortfolioId] = useState<string | null>(
    asset.subPortfolioId || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果目标与当前位置相同，不需要移动
    if (targetSubPortfolioId === (asset.subPortfolioId || null)) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await assetApi.move(asset.id, targetSubPortfolioId);
      onMoved();
    } catch (err: any) {
      setError(err.response?.data?.error || '移动失败');
    } finally {
      setLoading(false);
    }
  };

  const currentLocation = asset.subPortfolioId
    ? portfolio.subPortfolios?.find(sp => sp.id === asset.subPortfolioId)?.name || '子组合'
    : '直接持有';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>移动资产</h3>
        <p className="move-asset-info">
          将 <strong>{asset.name}</strong> 从「{currentLocation}」移动到：
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="move-options">
            <label className={`move-option ${targetSubPortfolioId === null ? 'selected' : ''}`}>
              <input
                type="radio"
                name="target"
                checked={targetSubPortfolioId === null}
                onChange={() => setTargetSubPortfolioId(null)}
              />
              <span className="option-label">直接持有的资产</span>
              <span className="option-desc">不属于任何子组合</span>
            </label>

            {portfolio.subPortfolios?.map((sub) => (
              <label
                key={sub.id}
                className={`move-option ${targetSubPortfolioId === sub.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="target"
                  checked={targetSubPortfolioId === sub.id}
                  onChange={() => setTargetSubPortfolioId(sub.id)}
                />
                <span className="option-label">{sub.name}</span>
                {portfolio.ruleType === 'ALLOCATION' && sub.allocationPercent > 0 && (
                  <span className="option-desc">目标比例: {sub.allocationPercent}%</span>
                )}
              </label>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || targetSubPortfolioId === (asset.subPortfolioId || null)}
            >
              {loading ? '移动中...' : '确认移动'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
