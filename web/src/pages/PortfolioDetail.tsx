import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Search, FolderPlus, Edit2, DollarSign, FileText, ArrowRightLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { portfolioApi, assetApi, instrumentApi, transactionApi, channelApi } from '../api/client';
import type { Portfolio, Asset, PortfolioSummary, MarketInstrument, SubPortfolio, Transaction, Channel, Pagination, SubPortfolioSummary } from '../types';
import {
  AddAssetModal,
  SubPortfolioModal,
  TransactionModal,
  AssetDetailModal,
  MoveAssetModal,
  EditAssetModal,
} from '../components/portfolio';

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
  const [loading, setLoading] = useState(true);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showSubPortfolioModal, setShowSubPortfolioModal] = useState(false);
  const [editingSubPortfolio, setEditingSubPortfolio] = useState<SubPortfolio | null>(null);
  const [addAssetToSubPortfolio, setAddAssetToSubPortfolio] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'chart'>('assets');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionAsset, setTransactionAsset] = useState<Asset | null>(null);
  const [showAssetDetailModal, setShowAssetDetailModal] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [showMoveAssetModal, setShowMoveAssetModal] = useState(false);
  const [moveAsset, setMoveAsset] = useState<Asset | null>(null);
  const [showEditAssetModal, setShowEditAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [subPortfolioSummaries, setSubPortfolioSummaries] = useState<SubPortfolioSummary[]>([]);
  const [profitCurve, setProfitCurve] = useState<Array<{ date: string; value: number; cost: number; profit: number; profitRate: number }>>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [portfolioRes, assetsRes, summaryRes, summariesRes, profitCurveRes] = await Promise.all([
        portfolioApi.getById(id),
        assetApi.getByPortfolio(id),
        portfolioApi.getSummary(id),
        portfolioApi.getSubPortfolioSummaries(id),
        portfolioApi.getProfitCurve(id),
      ]);

      setPortfolio(portfolioRes.data.data);
      setAssets(assetsRes.data.data || []);
      setSummary(summaryRes.data.data);
      setSubPortfolioSummaries(summariesRes.data.data || []);
      setProfitCurve(profitCurveRes.data.data || []);
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

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowEditAssetModal(true);
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

  // Get deviation color based on deviation value
  // Positive deviation (over-allocated): Red color system
  // Negative deviation (under-allocated): Green color system
  // Larger absolute deviation = darker/more intense color
  const getDeviationColor = (deviation: number) => {
    const absDeviation = Math.abs(deviation);

    // Define intensity levels (larger deviation = darker/more saturated color)
    if (absDeviation >= 15) {
      // Very high deviation - darkest colors
      return deviation > 0 ? '#9B2C2C' : '#22543D'; // Dark red / Dark green
    }
    if (absDeviation >= 10) {
      // High deviation
      return deviation > 0 ? '#C53030' : '#276749'; // Red / Green
    }
    if (absDeviation >= 7) {
      // Medium-high deviation
      return deviation > 0 ? '#E53E3E' : '#2F855A'; // Medium red / Medium green
    }
    if (absDeviation >= 5) {
      // Medium deviation
      return deviation > 0 ? '#FC8181' : '#38A169'; // Light red / Light green
    }
    if (absDeviation >= 3) {
      // Low-medium deviation
      return deviation > 0 ? '#FEB2B2' : '#68D391'; // Very light red / Very light green
    }
    if (absDeviation >= 1) {
      // Low deviation
      return deviation > 0 ? '#FED7D7' : '#9AE6B4'; // Pale red / Pale green
    }
    // Minimal deviation - very light colors
    return deviation > 0 ? '#FFF5F5' : '#C6F6D5'; // Very pale red / Very pale green
  };

  const getDeviationBadgeStyle = (deviation: number): React.CSSProperties => ({
    backgroundColor: getDeviationColor(deviation),
    // Use white text on darker backgrounds (deviation >= 7%), black text on lighter backgrounds
    color: Math.abs(deviation) >= 7 ? '#fff' : '#000',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  });

  // Prepare rose chart data showing sub-portfolios and direct assets
  const getRoseChartData = () => {
    if (!portfolio || !allocations) return [];

    const data: Array<{ name: string; value: number; type: 'sub' | 'direct' }> = [];

    // Add sub-portfolios
    portfolio.subPortfolios?.forEach((sp) => {
      const value = allocations.subPortfolioValues[sp.id] || 0;
      if (value > 0) {
        data.push({
          name: sp.name,
          value,
          type: 'sub',
        });
      }
    });

    // Add direct assets as a group (if any exist)
    if (allocations.directAssetsValue > 0) {
      data.push({
        name: '直接资产',
        value: allocations.directAssetsValue,
        type: 'direct',
      });
    }

    return data;
  };

  // Prepare bar chart data for ALLOCATION portfolios (expected vs actual)
  const getAllocationBarData = () => {
    if (!portfolio || portfolio.ruleType !== 'ALLOCATION' || !allocations) return [];

    const data: Array<{ name: string; expected: number; actual: number }> = [];

    // Add sub-portfolios
    portfolio.subPortfolios?.forEach((sp) => {
      const actualPercent = allocations.getSubPortfolioPercent(sp.id);
      data.push({
        name: sp.name,
        expected: sp.allocationPercent || 0,
        actual: actualPercent,
      });
    });

    // Add direct assets (if they have allocation percent set)
    const directAssetsWithAllocation = assets.filter(
      (a) => !a.subPortfolioId && a.allocationPercent > 0
    );
    if (directAssetsWithAllocation.length > 0) {
      directAssetsWithAllocation.forEach((asset) => {
        const assetValue = (asset.quantity || 0) * (asset.currentPrice || 0);
        const actualPercent = allocations.getAssetPercent(assetValue);
        data.push({
          name: asset.symbol,
          expected: asset.allocationPercent,
          actual: actualPercent,
        });
      });
    }

    return data;
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
          className={`tab ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          资产 ({portfolio.assetCount || assets.length})
        </button>
        <button
          className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          图表
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'chart' && (
          <div className="overview-section">
            {/* 玫瑰图：显示子组合和直接资产的分布 */}
            {(() => {
              const roseData = getRoseChartData();
              if (roseData.length > 0) {
                return (
                  <div style={{ marginBottom: '30px' }}>
                    <h3>资产结构</h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={roseData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(props) => {
                              const data = props.payload as { name: string; value: number };
                              const percent = allocations && allocations.totalValue > 0
                                ? ((data.value / allocations.totalValue) * 100).toFixed(1)
                                : '0.0';
                              return `${data.name} ${percent}%`;
                            }}
                            outerRadius={100}
                            innerRadius={0}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            {roseData.map((_, index) => (
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
                  </div>
                );
              }
              return null;
            })()}

            {/* 固定比例组合：显示预期vs实际占比的柱状图 */}
            {portfolio.ruleType === 'ALLOCATION' && (() => {
              const barData = getAllocationBarData();
              if (barData.length > 0) {
                return (
                  <div style={{ marginBottom: '30px' }}>
                    <h3>预期 vs 实际占比</h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                          <Legend />
                          <Bar dataKey="expected" fill="#8884d8" name="预期占比" />
                          <Bar dataKey="actual" fill="#82ca9d" name="实际占比" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* 收益曲线 */}
            {profitCurve.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3>收益曲线</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={profitCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('zh-CN');
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'profit') {
                            return [formatCurrency(value, summary?.currency || 'CNY'), '收益'];
                          }
                          if (name === 'profitRate') {
                            return [`${value.toFixed(2)}%`, '收益率'];
                          }
                          return [formatCurrency(value, summary?.currency || 'CNY'), name === 'value' ? '资产' : '成本'];
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" name="收益" strokeWidth={2} dot={false} yAxisId="left" />
                      <Line type="monotone" dataKey="profitRate" stroke="#3b82f6" name="收益率" strokeWidth={2} dot={false} yAxisId="right" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 子组合汇总 */}
            {subPortfolioSummaries.length > 0 && (
              <div className="sub-portfolio-summaries-section" style={{ marginTop: '30px' }}>
                <h3>子组合汇总</h3>
                <div className="sub-portfolio-cards-grid">
                  {subPortfolioSummaries.map((item) => (
                    <div key={item.subPortfolio.id} className="sub-portfolio-summary-card">
                      <div className="sub-portfolio-summary-header">
                        <h4>{item.subPortfolio.name}</h4>
                        <span style={getDeviationBadgeStyle(item.deviation)}>
                          {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(1)}%
                        </span>
                      </div>
                      <div className="sub-portfolio-summary-body">
                        <div className="summary-item">
                          <span className="label">当前占比</span>
                          <span
                            className="value"
                            style={{
                              color: getDeviationColor(item.deviation),
                              fontWeight: 'bold',
                            }}
                          >
                            {item.currentPercent.toFixed(1)}%
                          </span>
                        </div>
                        {item.subPortfolio.allocationPercent > 0 && (
                          <div className="summary-item">
                            <span className="label">目标占比</span>
                            <span className="value">{item.subPortfolio.allocationPercent}%</span>
                          </div>
                        )}
                        <div className="summary-item">
                          <span className="label">资产</span>
                          <span className="value">{formatCurrency(item.summary.totalValue, item.summary.currency)}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">成本</span>
                          <span className="value">{formatCurrency(item.summary.totalCost, item.summary.currency)}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">收益</span>
                          <span className={`value ${item.summary.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                            {item.summary.totalReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {formatCurrency(item.summary.totalReturn, item.summary.currency)}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="label">收益率</span>
                          <span className={`value ${item.summary.returnRate >= 0 ? 'positive' : 'negative'}`}>
                            {formatPercent(item.summary.returnRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                        {allocations && portfolio.ruleType === 'ALLOCATION' && (
                          <span
                            className="allocation-badge"
                            style={{
                              backgroundColor: getDeviationColor(
                                allocations.getSubPortfolioPercent(subPortfolio.id) - subPortfolio.allocationPercent
                              ),
                              color: Math.abs(allocations.getSubPortfolioPercent(subPortfolio.id) - subPortfolio.allocationPercent) >= 5 ? '#fff' : '#000',
                            }}
                          >
                            当前: {allocations.getSubPortfolioPercent(subPortfolio.id).toFixed(1)}%
                          </span>
                        )}
                        {allocations && portfolio.ruleType !== 'ALLOCATION' && (
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
                                    onClick={() => handleOpenEdit(asset)}
                                    title="编辑"
                                  >
                                    <Edit2 size={14} />
                                  </button>
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
              {assets.filter(a => !a.subPortfolioId).length > 0 && (
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
                              onClick={() => handleOpenEdit(asset)}
                              title="编辑"
                            >
                              <Edit2 size={14} />
                            </button>
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

      {showEditAssetModal && editingAsset && (
        <EditAssetModal
          asset={editingAsset}
          portfolio={portfolio}
          onClose={() => {
            setShowEditAssetModal(false);
            setEditingAsset(null);
          }}
          onUpdated={() => {
            setShowEditAssetModal(false);
            setEditingAsset(null);
            loadData();
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
