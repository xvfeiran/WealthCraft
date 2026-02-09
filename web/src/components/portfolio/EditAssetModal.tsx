import { useState, useEffect } from 'react';
import { assetApi, channelApi } from '../../api/client';
import type { Asset, Portfolio, Channel } from '../../types';

interface EditAssetModalProps {
  asset: Asset;
  portfolio: Portfolio;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditAssetModal({
  asset,
  portfolio,
  onClose,
  onUpdated,
}: EditAssetModalProps) {
  const [symbol, setSymbol] = useState(asset.symbol);
  const [name, setName] = useState(asset.name);
  const [currency, setCurrency] = useState(asset.currency);
  const [quantity, setQuantity] = useState(asset.quantity.toString());
  const [costPrice, setCostPrice] = useState(asset.costPrice.toString());
  const [currentPrice, setCurrentPrice] = useState(asset.currentPrice.toString());
  const [startDate, setStartDate] = useState(
    asset.startDate ? new Date(asset.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [channelId, setChannelId] = useState(asset.channelId || '');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadChannels = async () => {
      setLoadingChannels(true);
      try {
        const res = await channelApi.getAllSimple();
        setChannels(res.data.data || []);
      } catch (err) {
        console.error('Failed to load channels', err);
      } finally {
        setLoadingChannels(false);
      }
    };
    loadChannels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await assetApi.update(asset.id, {
        name,
        currency,
        quantity: parseFloat(quantity) || 0,
        costPrice: parseFloat(costPrice) || 0,
        currentPrice: parseFloat(currentPrice) || 0,
        startDate: new Date(startDate),
        channelId: channelId || null,
      });

      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>编辑资产</h3>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="editSymbol">代码</label>
            <input
              type="text"
              id="editSymbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              disabled
              className="readonly-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="editName">名称</label>
            <input
              type="text"
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="editCurrency">币种</label>
            <select
              id="editCurrency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="CNY">人民币 (CNY)</option>
              <option value="USD">美元 (USD)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="editQuantity">数量</label>
              <input
                type="number"
                id="editQuantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="editCostPrice">成本价</label>
              <input
                type="number"
                id="editCostPrice"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="editCurrentPrice">现价</label>
            <input
              type="number"
              id="editCurrentPrice"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label htmlFor="editStartDate">开始时间</label>
            <input
              type="date"
              id="editStartDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label htmlFor="editChannel">渠道</label>
            <select
              id="editChannel"
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
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '更新中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}