import { useState, useEffect } from 'react';
import { transactionApi, channelApi } from '../../api/client';
import type { Asset, Channel } from '../../types';

interface TransactionModalProps {
  asset: Asset;
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionModal({
  asset,
  onClose,
  onSaved,
}: TransactionModalProps) {
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(asset.currentPrice?.toString() || '');
  const [fee, setFee] = useState('');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [channelId, setChannelId] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const res = await channelApi.getAllSimple();
      setChannels(res.data.data || []);
    } catch (err) {
      console.error('Failed to load channels', err);
    }
  };

  const formatCurrency = (value: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await transactionApi.create(asset.id, {
        type,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        fee: parseFloat(fee) || 0,
        timestamp: new Date(timestamp).toISOString(),
        channelId: channelId || undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(price) || 0) + (parseFloat(fee) || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal transaction-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{asset.name} ({asset.symbol})</h3>

        <div className="transaction-type-tabs">
          <button
            type="button"
            className={`type-tab ${type === 'BUY' ? 'active buy' : ''}`}
            onClick={() => setType('BUY')}
          >
            买入
          </button>
          <button
            type="button"
            className={`type-tab ${type === 'SELL' ? 'active sell' : ''}`}
            onClick={() => setType('SELL')}
          >
            卖出
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="txPrice">单价</label>
              <input
                type="number"
                id="txPrice"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                required
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label htmlFor="txQuantity">数量</label>
              <input
                type="number"
                id="txQuantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.01"
                required
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="txFee">费用</label>
              <input
                type="number"
                id="txFee"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label htmlFor="txTimestamp">时间</label>
              <input
                type="datetime-local"
                id="txTimestamp"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="txChannel">渠道</label>
            <select
              id="txChannel"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            >
              <option value="">不选择渠道</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} ({ch.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>总金额</label>
            <div className="summary-item">
              <span className="value">{formatCurrency(totalAmount, asset.currency)}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className={`btn ${type === 'BUY' ? 'btn-primary' : 'btn-danger'}`}
              disabled={loading}
            >
              {loading ? '处理中...' : type === 'BUY' ? '确认买入' : '确认卖出'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
