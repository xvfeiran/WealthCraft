import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { transactionApi } from '../../api/client';
import type { Asset, Transaction, Pagination } from '../../types';

interface AssetDetailModalProps {
  asset: Asset;
  onClose: () => void;
  onTransaction: () => void;
}

export function AssetDetailModal({
  asset,
  onClose,
  onTransaction,
}: AssetDetailModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await transactionApi.getByAsset(asset.id, page, 10);
      setTransactions(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('删除交易记录后不会自动调整资产数据，确定要删除吗？')) return;
    try {
      await transactionApi.delete(txId);
      loadTransactions(pagination?.page || 1);
    } catch (err) {
      console.error('Failed to delete transaction', err);
    }
  };

  const formatCurrency = (value: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const TYPE_LABELS: Record<string, string> = {
    BUY: '买入',
    SELL: '卖出',
    DIVIDEND: '分红',
    FEE: '费用',
  };

  // Asset详情保持原始货币，不做转换
  // 汇总转换只在portfolio summary中做
  const totalValue = asset.totalValue || 0;
  const totalCost = asset.totalCost || 0;
  const profitLoss = asset.profitLoss || 0;
  const profitLossPercent = asset.profitLossPercent || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal asset-detail-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{asset.name} ({asset.symbol})</h3>

        <div className="asset-summary">
          <div className="summary-item">
            <span className="label">持仓数量</span>
            <span className="value">{asset.quantity}</span>
          </div>
          <div className="summary-item">
            <span className="label">成本价</span>
            <span className="value">{formatCurrency(asset.costPrice, asset.currency)}</span>
          </div>
          <div className="summary-item">
            <span className="label">现价</span>
            <span className="value">{formatCurrency(asset.currentPrice, asset.currency)}</span>
          </div>
          <div className="summary-item">
            <span className="label">开始时间</span>
            <span className="value">{new Date(asset.startDate || asset.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="summary-item">
            <span className="label">总市值</span>
            <span className="value">{formatCurrency(totalValue, asset.currency)}</span>
          </div>
          <div className="summary-item">
            <span className="label">总成本</span>
            <span className="value">{formatCurrency(totalCost, asset.currency)}</span>
          </div>
          <div className="summary-item">
            <span className="label">盈亏</span>
            <span className={`value ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(profitLoss, asset.currency)} ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="section-header">
          <h4>交易记录</h4>
          <button className="btn btn-primary btn-sm" onClick={onTransaction}>
            <Plus size={14} /> 新增交易
          </button>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <p>暂无交易记录</p>
          </div>
        ) : (
          <>
            <div className="transaction-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="transaction-item">
                  <div className="transaction-left">
                    <span className={`transaction-type-badge ${tx.type.toLowerCase()}`}>
                      {TYPE_LABELS[tx.type]}
                    </span>
                    <div>
                      <div className="transaction-detail">
                        {tx.quantity} x {formatCurrency(tx.price, asset.currency)}
                        {tx.fee > 0 && ` (费用: ${formatCurrency(tx.fee, asset.currency)})`}
                      </div>
                      {tx.channel && (
                        <div className="transaction-channel">渠道: {tx.channel.name}</div>
                      )}
                    </div>
                  </div>
                  <div className="transaction-right">
                    <div className="transaction-amount">
                      {formatCurrency(tx.quantity * tx.price + tx.fee, asset.currency)}
                    </div>
                    <div className="transaction-date">{formatDate(tx.timestamp)}</div>
                  </div>
                  <div className="transaction-actions">
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => handleDeleteTransaction(tx.id)}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadTransactions(pagination.page - 1)}
                >
                  上一页
                </button>
                <span className="page-info">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadTransactions(pagination.page + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
