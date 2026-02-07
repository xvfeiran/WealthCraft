import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Search, FolderPlus, Edit2, DollarSign, FileText, ArrowRightLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { portfolioApi, assetApi, recommendationApi, instrumentApi, transactionApi, channelApi } from '../api/client';
import type { Portfolio, Asset, PortfolioSummary, Recommendation, MarketInstrument, SubPortfolio, Transaction, Channel, Pagination } from '../types';

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
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionAsset, setTransactionAsset] = useState<Asset | null>(null);
  const [showAssetDetailModal, setShowAssetDetailModal] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [showMoveAssetModal, setShowMoveAssetModal] = useState(false);
  const [moveAsset, setMoveAsset] = useState<Asset | null>(null);

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

  const handleOpenTransaction = (asset: Asset) => {
    setTransactionAsset(asset);
    setShowTransactionModal(true);
  };

  const handleOpenAssetDetail = (asset: Asset) => {
    setDetailAsset(asset);
    setShowAssetDetailModal(true);
  };

  const handleOpenMoveAsset = (asset: Asset) => {
    setMoveAsset(asset);
    setShowMoveAssetModal(true);
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

  // Calculate total portfolio value and current allocations
  // Note: `assets` array contains ALL assets (both direct and in sub-portfolios)
  const calculateAllocations = () => {
    let totalValue = 0;
    const subPortfolioValues: Record<string, number> = {};
    let directAssetsValue = 0;

    // Sum all assets from the flat assets array (already includes all assets)
    assets.forEach((asset) => {
      const assetValue = (asset.quantity || 0) * (asset.currentPrice || 0);
      totalValue += assetValue;

      if (asset.subPortfolioId) {
        // Asset belongs to a sub-portfolio
        subPortfolioValues[asset.subPortfolioId] = (subPortfolioValues[asset.subPortfolioId] || 0) + assetValue;
      } else {
        // Direct asset
        directAssetsValue += assetValue;
      }
    });

    return {
      totalValue,
      directAssetsValue,
      subPortfolioValues,
      getSubPortfolioPercent: (subId: string) =>
        totalValue > 0 ? (subPortfolioValues[subId] || 0) / totalValue * 100 : 0,
      getAssetPercent: (assetValue: number) =>
        totalValue > 0 ? assetValue / totalValue * 100 : 0,
      getDirectAssetsPercent: () =>
        totalValue > 0 ? directAssetsValue / totalValue * 100 : 0,
    };
  };

  const allocations = portfolio ? calculateAllocations() : null;

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
            <span className="label">资产</span>
            <span className="value">{formatCurrency(summary.totalValue, summary.currency)}</span>
          </div>
          <div className="summary-card">
            <span className="label">成本</span>
            <span className="value">{formatCurrency(summary.totalCost, summary.currency)}</span>
          </div>
          <div className="summary-card">
            <span className="label">收益</span>
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
                      label={(props) => {
                        const data = props.payload as { name: string; percentage: number };
                        return `${data.name} ${data.percentage.toFixed(1)}%`;
                      }}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value), summary?.currency || 'CNY')}
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
                        {allocations && (
                          <span className="allocation-badge">
                            当前: {allocations.getSubPortfolioPercent(subPortfolio.id).toFixed(1)}%
                          </span>
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
                                <br />
                                <small>({formatPercent(asset.costPrice > 0 ? ((asset.currentPrice - asset.costPrice) / asset.costPrice) * 100 : 0)})</small>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="btn btn-icon btn-secondary"
                                    onClick={() => handleOpenTransaction(asset)}
                                    title="买入/卖出"
                                  >
                                    <DollarSign size={14} />
                                  </button>
                                  <button
                                    className="btn btn-icon btn-secondary"
                                    onClick={() => handleOpenAssetDetail(asset)}
                                    title="明细"
                                  >
                                    <FileText size={14} />
                                  </button>
                                  <button
                                    className="btn btn-icon btn-secondary"
                                    onClick={() => handleOpenMoveAsset(asset)}
                                    title="移动"
                                  >
                                    <ArrowRightLeft size={14} />
                                  </button>
                                  <button
                                    className="btn btn-icon btn-danger"
                                    onClick={() => handleDeleteAsset(asset.id)}
                                    title="删除"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
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
                      <th>当前比例</th>
                      <th>数量</th>
                      <th>成本价</th>
                      <th>现价</th>
                      <th>市值</th>
                      <th>盈亏</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.filter(a => !a.subPortfolioId).map((asset) => {
                      const assetValue = (asset.quantity || 0) * (asset.currentPrice || 0);
                      const currentPercent = allocations?.getAssetPercent(assetValue) || 0;
                      return (
                      <tr key={asset.id}>
                        <td>{asset.name}</td>
                        <td>{asset.symbol}</td>
                        <td>{MARKET_LABELS[asset.market] || asset.market}</td>
                        {portfolio.ruleType === 'ALLOCATION' && <td>{asset.allocationPercent}%</td>}
                        {portfolio.ruleType === 'CONTRIBUTION' && <td>{formatCurrency(asset.contributionAmount, portfolio.baseCurrency)}</td>}
                        <td>{currentPercent.toFixed(1)}%</td>
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
                          <div className="action-buttons">
                            <button
                              className="btn btn-icon btn-secondary"
                              onClick={() => handleOpenTransaction(asset)}
                              title="买入/卖出"
                            >
                              <DollarSign size={14} />
                            </button>
                            <button
                              className="btn btn-icon btn-secondary"
                              onClick={() => handleOpenAssetDetail(asset)}
                              title="明细"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              className="btn btn-icon btn-secondary"
                              onClick={() => handleOpenMoveAsset(asset)}
                              title="移动"
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                            <button
                              className="btn btn-icon btn-danger"
                              onClick={() => handleDeleteAsset(asset.id)}
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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

      {showTransactionModal && transactionAsset && (
        <TransactionModal
          asset={transactionAsset}
          onClose={() => { setShowTransactionModal(false); setTransactionAsset(null); }}
          onSaved={() => {
            setShowTransactionModal(false);
            setTransactionAsset(null);
            loadData();
          }}
        />
      )}

      {showAssetDetailModal && detailAsset && (
        <AssetDetailModal
          asset={detailAsset}
          onClose={() => { setShowAssetDetailModal(false); setDetailAsset(null); }}
          onTransaction={() => {
            setShowAssetDetailModal(false);
            setTransactionAsset(detailAsset);
            setShowTransactionModal(true);
          }}
        />
      )}

      {showMoveAssetModal && moveAsset && portfolio && (
        <MoveAssetModal
          asset={moveAsset}
          portfolio={portfolio}
          onClose={() => { setShowMoveAssetModal(false); setMoveAsset(null); }}
          onMoved={() => {
            setShowMoveAssetModal(false);
            setMoveAsset(null);
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
  const [channelId, setChannelId] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 只有直接添加到组合（非子组合）时才显示配置选项
  const showRuleConfig = !subPortfolioId && portfolio.ruleType;

  // 加载渠道列表
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
      // For synced instruments, use market price as currentPrice; otherwise use costPrice
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
              <div className="form-group">
                {/* 空占位，保持表单布局 */}
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

function TransactionModal({
  asset,
  onClose,
  onSaved,
}: {
  asset: Asset;
  onClose: () => void;
  onSaved: () => void;
}) {
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

function AssetDetailModal({
  asset,
  onClose,
  onTransaction,
}: {
  asset: Asset;
  onClose: () => void;
  onTransaction: () => void;
}) {
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

  const totalValue = (asset.quantity || 0) * (asset.currentPrice || 0);
  const totalCost = (asset.quantity || 0) * (asset.costPrice || 0);
  const profitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

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

function MoveAssetModal({
  asset,
  portfolio,
  onClose,
  onMoved,
}: {
  asset: Asset;
  portfolio: Portfolio;
  onClose: () => void;
  onMoved: () => void;
}) {
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
