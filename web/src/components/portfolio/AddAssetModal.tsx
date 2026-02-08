import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { assetApi, channelApi, instrumentApi } from '../../api/client';
import type { Portfolio, Channel, MarketInstrument } from '../../types';

const MARKET_LABELS: Record<string, string> = {
  SSE: '上交所-股票',
  SSE_FUND: '上交所-基金',
  SSE_BOND: '上交所-债券',
  NASDAQ: 'NASDAQ',
  NYSE: 'NYSE',
  AMEX: 'AMEX',
  US_ETF: '美股ETF',
  BINANCE: '币安加密货币',
};

interface AddAssetModalProps {
  portfolioId: string;
  subPortfolioId: string | null;
  portfolio: Portfolio;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * AddAssetModal - Modal for adding a new asset to a portfolio
 *
 * This component handles both:
 * 1. Searching and selecting from synced market instruments
 * 2. Manual input for custom assets
 *
 * State management:
 * - mode: 'search' | 'manual' - current input mode
 * - form fields: symbol, name, market, currency, quantity, costPrice, etc.
 * - search state: query, results, loading, selected instrument
 */
export function AddAssetModal({
  portfolioId,
  subPortfolioId,
  portfolio,
  onClose,
  onAdded,
}: AddAssetModalProps) {
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMarket, setSearchMarket] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MarketInstrument[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null);

  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [market, setMarket] = useState('SSE');
  const [currency, setCurrency] = useState('CNY');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocationPercent, setAllocationPercent] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [channelId, setChannelId] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only show rule config when adding directly to portfolio (not sub-portfolio)
  const showRuleConfig = !subPortfolioId && portfolio.ruleType;

  // Load channels list
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

  // Search market instruments
  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 1) return;
    setSearching(true);
    try {
      const res = await instrumentApi.search(searchQuery, searchMarket || undefined, 20);
      setSearchResults(res.data.data || []);
    } catch (err) {
      console.error('Search failed', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searchMarket]);

  // Select instrument from search results
  const handleSelectInstrument = (instrument: MarketInstrument) => {
    setSelectedInstrument(instrument);
    setSymbol(instrument.symbol);
    setName(instrument.name);
    setCurrency(instrument.currency);
    setCostPrice(instrument.lastPrice.toString());
    setMarket(instrument.market);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const currentPriceValue = selectedInstrument
        ? selectedInstrument.lastPrice
        : parseFloat(costPrice) || 0;

      await assetApi.create(portfolioId, {
        symbol,
        name,
        market,
        subPortfolioId: subPortfolioId || undefined,
        currency,
        quantity: parseFloat(quantity) || 0,
        costPrice: parseFloat(costPrice) || 0,
        currentPrice: currentPriceValue,
        startDate: new Date(startDate),
        allocationPercent: parseFloat(allocationPercent) || 0,
        contributionAmount: parseFloat(contributionAmount) || 0,
        source: selectedInstrument ? 'SYNC' : 'MANUAL',
        channelId: channelId || undefined,
      });
      onAdded();
    } catch (err: any) {
      setError(err.response?.data?.error || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, curr: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: curr,
    }).format(price);
  };

  const subPortfolioName = subPortfolioId
    ? portfolio.subPortfolios?.find(sp => sp.id === subPortfolioId)?.name
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <h3>添加资产{subPortfolioName ? ` 到「${subPortfolioName}」` : ''}</h3>

        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'search' ? 'active' : ''}`}
            onClick={() => setMode('search')}
          >
            <Search size={16} /> 搜索添加
          </button>
          <button
            className={`mode-tab ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            手动输入
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Search Mode */}
        {mode === 'search' && !selectedInstrument && (
          <div className="search-section">
            <div className="search-bar">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入代码或名称搜索..."
              />
              <select value={searchMarket} onChange={(e) => setSearchMarket(e.target.value)}>
                <option value="">全部市场</option>
                <option value="SSE">上交所-股票</option>
                <option value="SSE_FUND">上交所-基金</option>
                <option value="SSE_BOND">上交所-债券</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="NYSE">NYSE</option>
                <option value="AMEX">AMEX</option>
                <option value="US_ETF">美股ETF</option>
                <option value="BINANCE">币安加密货币</option>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSearch}
                disabled={searching || !searchQuery}
              >
                {searching ? '搜索中...' : '搜索'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((item) => (
                  <div
                    key={`${item.market}-${item.symbol}`}
                    className="search-result-item"
                    onClick={() => handleSelectInstrument(item)}
                  >
                    <div className="result-main">
                      <span className="result-symbol">{item.symbol}</span>
                      <span className="result-name">{item.name}</span>
                    </div>
                    <div className="result-info">
                      <span className="result-market">{MARKET_LABELS[item.market] || item.market}</span>
                      <span className="result-price">{formatPrice(item.lastPrice, item.currency)}</span>
                      <span className={`result-change ${item.changePercent >= 0 ? 'positive' : 'negative'}`}>
                        {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !searching && (
              <div className="no-results">
                未找到匹配的投资标的，请尝试其他关键词或
                <button type="button" className="link-btn" onClick={() => setMode('manual')}>
                  手动输入
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Input Mode */}
        {(mode === 'manual' || selectedInstrument) && (
          <form onSubmit={handleSubmit}>
            {selectedInstrument && (
              <div className="selected-instrument">
                <span>已选择: {selectedInstrument.name} ({selectedInstrument.symbol})</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedInstrument(null);
                    setSymbol('');
                    setName('');
                  }}
                >
                  重新选择
                </button>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="symbol">代码</label>
                <input
                  type="text"
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  required
                  placeholder="例如: 600000"
                  disabled={!!selectedInstrument}
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">名称</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="例如: 浦发银行"
                  disabled={!!selectedInstrument}
                />
              </div>
            </div>

            <div className="form-row">
              {selectedInstrument ? (
                <div className="form-group">
                  <label>市场</label>
                  <input
                    type="text"
                    value={MARKET_LABELS[market] || market}
                    disabled
                    className="readonly-input"
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="market">市场</label>
                  <select id="market" value={market} onChange={(e) => setMarket(e.target.value)}>
                    <option value="SSE">上交所-股票</option>
                    <option value="SSE_FUND">上交所-基金</option>
                    <option value="SSE_BOND">上交所-债券</option>
                    <option value="NASDAQ">NASDAQ</option>
                    <option value="NYSE">NYSE</option>
                    <option value="AMEX">AMEX</option>
                    <option value="US_ETF">美股ETF</option>
                    <option value="BINANCE">币安加密货币</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="currency">币种</label>
                <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">数量</label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.01"
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="costPrice">成本价</label>
                <input
                  type="number"
                  id="costPrice"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">开始时间</label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {showRuleConfig && portfolio.ruleType === 'ALLOCATION' && (
              <div className="form-group">
                <label htmlFor="allocationPercent">目标比例 (%)</label>
                <input
                  type="number"
                  id="allocationPercent"
                  value={allocationPercent}
                  onChange={(e) => setAllocationPercent(e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                />
              </div>
            )}

            {showRuleConfig && portfolio.ruleType === 'CONTRIBUTION' && (
              <div className="form-group">
                <label htmlFor="contributionAmount">每次定投金额 ({portfolio.baseCurrency})</label>
                <input
                  type="number"
                  id="contributionAmount"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0"
                />
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '添加中...' : '添加'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
