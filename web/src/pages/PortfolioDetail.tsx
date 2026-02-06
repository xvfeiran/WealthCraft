import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Search, FolderPlus, Edit2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { portfolioApi, assetApi, recommendationApi, instrumentApi } from '../api/client';
import type { Portfolio, Asset, PortfolioSummary, Recommendation, MarketInstrument, SubPortfolio } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const MARKET_LABELS: Record<string, string> = {
  SSE: '上交所-股票',
  SSE_FUND: '上交所-基金',
  SSE_BOND: '上交所-债券',
  NASDAQ: 'NASDAQ',
  NYSE: 'NYSE',
  AMEX: 'AMEX',
  US_ETF: '美股ETF',
};

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showSubPortfolioModal, setShowSubPortfolioModal] = useState(false);
  const [editingSubPortfolio, setEditingSubPortfolio] = useState<SubPortfolio | null>(null);
  const [addAssetToSubPortfolio, setAddAssetToSubPortfolio] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'recommendations'>('overview');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [portfolioRes, assetsRes, summaryRes, recsRes] = await Promise.all([
        portfolioApi.getById(id),
        assetApi.getByPortfolio(id),
        portfolioApi.getSummary(id),
        recommendationApi.getByPortfolio(id),
      ]);

      setPortfolio(portfolioRes.data.data);
      setAssets(assetsRes.data.data || []);
      setSummary(summaryRes.data.data);
      setRecommendations(recsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load portfolio', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('确定要删除此资产吗？')) return;
    try {
      await assetApi.delete(assetId);
      loadData();
    } catch (error) {
      console.error('Failed to delete asset', error);
    }
  };

  const handleDeleteSubPortfolio = async (subId: string) => {
    if (!id) return;
    if (!confirm('确定要删除此子组合吗？子组合内的资产将移至组合根目录。')) return;
    try {
      await portfolioApi.deleteSubPortfolio(id, subId);
      loadData();
    } catch (error) {
      console.error('Failed to delete sub-portfolio', error);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!id) return;
    try {
      await recommendationApi.generate(id);
      loadData();
    } catch (error) {
      console.error('Failed to generate recommendations', error);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!id || !confirm('确定要删除此组合吗？所有资产和交易记录都将被删除。')) return;
    try {
      await portfolioApi.delete(id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete portfolio', error);
    }
  };

  const formatCurrency = (value: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!portfolio) {
    return <div className="error">组合不存在</div>;
  }

  const pieData = summary?.assetAllocation.map((item) => ({
    name: MARKET_LABELS[item.type] || item.type,
    value: item.value,
    percentage: item.percentage,
  })) || [];

  return (
    <div className="portfolio-detail">
      <header className="detail-header">
        <div className="header-left">
          <Link to="/" className="back-link">
            <ArrowLeft size={20} /> 返回
          </Link>
          <h1>{portfolio.name}</h1>
          {portfolio.ruleType && (
            <span className={`rule-badge ${portfolio.ruleType.toLowerCase()}`}>
              {portfolio.ruleType === 'CONTRIBUTION' ? '定投' : '固定比例'}
            </span>
          )}
        </div>
        <div className="header-right">
          <button className="btn btn-danger" onClick={handleDeletePortfolio}>
            <Trash2 size={16} /> 删除组合
          </button>
        </div>
      </header>

      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <span className="label">总资产</span>
            <span className="value">{formatCurrency(summary.totalValue, summary.currency)}</span>
          </div>
          <div className="summary-card">
            <span className="label">总成本</span>
            <span className="value">{formatCurrency(summary.totalCost, summary.currency)}</span>
          </div>
          <div className="summary-card">
            <span className="label">总收益</span>
            <span className={`value ${summary.totalReturn >= 0 ? 'positive' : 'negative'}`}>
              {summary.totalReturn >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {formatCurrency(summary.totalReturn, summary.currency)}
            </span>
          </div>
          <div className="summary-card">
            <span className="label">收益率</span>
            <span className={`value ${summary.returnRate >= 0 ? 'positive' : 'negative'}`}>
              {formatPercent(summary.returnRate)}
            </span>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          概览
        </button>
        <button
          className={`tab ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          资产 ({portfolio.assetCount || assets.length})
        </button>
        <button
          className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          推荐操作
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h3>资产分布</h3>
            {pieData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value, summary?.currency || 'CNY')}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-chart">暂无资产数据</div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="assets-section">
            <div className="section-header">
              <h3>资产结构</h3>
              <div className="header-actions">
                <button className="btn btn-secondary" onClick={() => setShowSubPortfolioModal(true)}>
                  <FolderPlus size={16} /> 添加子组合
                </button>
                <button className="btn btn-primary" onClick={() => { setAddAssetToSubPortfolio(null); setShowAddAssetModal(true); }}>
                  <Plus size={16} /> 添加资产
                </button>
              </div>
            </div>

            {/* 子组合列表 */}
            {portfolio.subPortfolios && portfolio.subPortfolios.length > 0 && (
              <div className="sub-portfolios-section">
                {portfolio.subPortfolios.map((subPortfolio) => (
                  <div key={subPortfolio.id} className="sub-portfolio-card">
                    <div className="sub-portfolio-header">
                      <div className="sub-portfolio-info">
                        <h4>{subPortfolio.name}</h4>
                        {portfolio.ruleType === 'ALLOCATION' && subPortfolio.allocationPercent > 0 && (
                          <span className="allocation-badge">目标: {subPortfolio.allocationPercent}%</span>
                        )}
                        {portfolio.ruleType === 'CONTRIBUTION' && subPortfolio.contributionAmount > 0 && (
                          <span className="contribution-badge">定投: {formatCurrency(subPortfolio.contributionAmount, portfolio.baseCurrency)}</span>
                        )}
                      </div>
                      <div className="sub-portfolio-actions">
                        <button
                          className="btn btn-icon btn-secondary"
                          onClick={() => { setAddAssetToSubPortfolio(subPortfolio.id); setShowAddAssetModal(true); }}
                          title="添加资产到此子组合"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-secondary"
                          onClick={() => { setEditingSubPortfolio(subPortfolio); setShowSubPortfolioModal(true); }}
                          title="编辑子组合"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => handleDeleteSubPortfolio(subPortfolio.id)}
                          title="删除子组合"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {subPortfolio.assets && subPortfolio.assets.length > 0 ? (
                      <table className="assets-table sub-assets-table">
                        <thead>
                          <tr>
                            <th>名称</th>
                            <th>代码</th>
                            <th>市场</th>
                            <th>数量</th>
                            <th>成本价</th>
                            <th>现价</th>
                            <th>市值</th>
                            <th>盈亏</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subPortfolio.assets.map((asset) => (
                            <tr key={asset.id}>
                              <td>{asset.name}</td>
                              <td>{asset.symbol}</td>
                              <td>{MARKET_LABELS[asset.market] || asset.market}</td>
                              <td>{asset.quantity}</td>
                              <td>{formatCurrency(asset.costPrice, asset.currency)}</td>
                              <td>{formatCurrency(asset.currentPrice, asset.currency)}</td>
                              <td>{formatCurrency((asset.quantity || 0) * (asset.currentPrice || 0), asset.currency)}</td>
                              <td className={(asset.currentPrice - asset.costPrice) >= 0 ? 'positive' : 'negative'}>
                                {formatCurrency((asset.quantity || 0) * (asset.currentPrice - asset.costPrice), asset.currency)}
                              </td>
                              <td>
                                <button
                                  className="btn btn-icon btn-danger"
                                  onClick={() => handleDeleteAsset(asset.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-sub-assets">暂无资产</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 直接资产（不在子组合内）*/}
            <div className="direct-assets-section">
              <h4>直接持有的资产</h4>
              {assets.filter(a => !a.subPortfolioId).length === 0 ? (
                <div className="empty-state">
                  <p>还没有直接添加的资产</p>
                  <button className="btn btn-primary" onClick={() => { setAddAssetToSubPortfolio(null); setShowAddAssetModal(true); }}>
                    添加资产
                  </button>
                </div>
              ) : (
                <table className="assets-table">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>代码</th>
                      <th>市场</th>
                      {portfolio.ruleType === 'ALLOCATION' && <th>目标比例</th>}
                      {portfolio.ruleType === 'CONTRIBUTION' && <th>定投金额</th>}
                      <th>数量</th>
                      <th>成本价</th>
                      <th>现价</th>
                      <th>市值</th>
                      <th>盈亏</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.filter(a => !a.subPortfolioId).map((asset) => (
                      <tr key={asset.id}>
                        <td>{asset.name}</td>
                        <td>{asset.symbol}</td>
                        <td>{MARKET_LABELS[asset.market] || asset.market}</td>
                        {portfolio.ruleType === 'ALLOCATION' && <td>{asset.allocationPercent}%</td>}
                        {portfolio.ruleType === 'CONTRIBUTION' && <td>{formatCurrency(asset.contributionAmount, portfolio.baseCurrency)}</td>}
                        <td>{asset.quantity}</td>
                        <td>{formatCurrency(asset.costPrice, asset.currency)}</td>
                        <td>{formatCurrency(asset.currentPrice, asset.currency)}</td>
                        <td>{formatCurrency(asset.totalValue || 0, asset.currency)}</td>
                        <td className={asset.profitLoss && asset.profitLoss >= 0 ? 'positive' : 'negative'}>
                          {formatCurrency(asset.profitLoss || 0, asset.currency)}
                          <br />
                          <small>({formatPercent(asset.profitLossPercent || 0)})</small>
                        </td>
                        <td>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() => handleDeleteAsset(asset.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-section">
            <div className="section-header">
              <h3>推荐操作</h3>
              <button className="btn btn-secondary" onClick={handleGenerateRecommendations}>
                <RefreshCw size={16} /> 重新生成
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="empty-state">
                <p>暂无推荐操作</p>
                <p className="hint">设置目标配置后，系统将根据当前持仓偏离度生成建议</p>
              </div>
            ) : (
              <div className="recommendations-list">
                {recommendations.map((rec) => (
                  <div key={rec.id} className={`recommendation-card ${rec.action.toLowerCase()}`}>
                    <div className="rec-header">
                      <span className={`action-badge ${rec.action.toLowerCase()}`}>
                        {rec.action === 'BUY' ? '买入' : '卖出'}
                      </span>
                      <span className="asset-name">{rec.asset?.name || rec.assetId}</span>
                    </div>
                    <div className="rec-detail">
                      <span>建议数量: {rec.suggestedQuantity}</span>
                    </div>
                    <div className="rec-reason">{rec.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddAssetModal && id && (
        <AddAssetModal
          portfolioId={id}
          subPortfolioId={addAssetToSubPortfolio}
          portfolio={portfolio}
          onClose={() => { setShowAddAssetModal(false); setAddAssetToSubPortfolio(null); }}
          onAdded={() => {
            setShowAddAssetModal(false);
            setAddAssetToSubPortfolio(null);
            loadData();
          }}
        />
      )}

      {showSubPortfolioModal && id && (
        <SubPortfolioModal
          portfolioId={id}
          portfolio={portfolio}
          subPortfolio={editingSubPortfolio}
          onClose={() => { setShowSubPortfolioModal(false); setEditingSubPortfolio(null); }}
          onSaved={() => {
            setShowSubPortfolioModal(false);
            setEditingSubPortfolio(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddAssetModal({
  portfolioId,
  subPortfolioId,
  portfolio,
  onClose,
  onAdded,
}: {
  portfolioId: string;
  subPortfolioId: string | null;
  portfolio: Portfolio;
  onClose: () => void;
  onAdded: () => void;
}) {
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
  const [allocationPercent, setAllocationPercent] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 只有直接添加到组合（非子组合）时才显示配置选项
  const showRuleConfig = !subPortfolioId && portfolio.ruleType;

  // 搜索投资标的
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

  // 选择投资标的
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
      await assetApi.create(portfolioId, {
        symbol,
        name,
        market,
        subPortfolioId: subPortfolioId || undefined,
        currency,
        quantity: parseFloat(quantity) || 0,
        costPrice: parseFloat(costPrice) || 0,
        currentPrice: parseFloat(costPrice) || 0,
        allocationPercent: parseFloat(allocationPercent) || 0,
        contributionAmount: parseFloat(contributionAmount) || 0,
        source: selectedInstrument ? 'SYNC' : 'MANUAL',
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
                </select>
              </div>
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

function SubPortfolioModal({
  portfolioId,
  portfolio,
  subPortfolio,
  onClose,
  onSaved,
}: {
  portfolioId: string;
  portfolio: Portfolio;
  subPortfolio: SubPortfolio | null;
  onClose: () => void;
  onSaved: () => void;
}) {
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
