import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, Wallet, Settings } from 'lucide-react';
import { portfolioApi } from '../api/client';
import type { Portfolio, PortfolioSummary } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PortfolioSummary>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      const response = await portfolioApi.getAll();
      const portfolioList = response.data.data || [];
      setPortfolios(portfolioList);

      // Load summaries for each portfolio
      const summaryPromises = portfolioList.map((p: Portfolio) =>
        portfolioApi.getSummary(p.id).then((res) => ({ id: p.id, summary: res.data.data }))
      );
      const results = await Promise.all(summaryPromises);
      const summaryMap: Record<string, PortfolioSummary> = {};
      results.forEach(({ id, summary }) => {
        summaryMap[id] = summary;
      });
      setSummaries(summaryMap);
    } catch (error) {
      console.error('Failed to load portfolios', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // 计算所有组合的合计（简单版本：假设所有组合使用相同币种）
  const totalSummary = useMemo(() => {
    const summaryValues = Object.values(summaries);
    if (summaryValues.length === 0) return null;

    const baseCurrency = summaryValues[0].currency;
    const totalValue = summaryValues.reduce((sum, s) => sum + s.totalValue, 0);
    const totalCost = summaryValues.reduce((sum, s) => sum + s.totalCost, 0);
    const totalReturn = totalValue - totalCost;
    const returnRate = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalReturn,
      returnRate,
      currency: baseCurrency,
    };
  }, [summaries]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Fin-Pilot</h1>
          <span className="user-email">{user?.email}</span>
        </div>
        <div className="header-right">
          <Link to="/channels" className="btn btn-secondary">
            <Settings size={16} /> 渠道管理
          </Link>
          <button className="btn btn-secondary" onClick={logout}>
            退出登录
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* 合计统计卡片 */}
        {totalSummary && (
          <div className="summary-cards">
            <div className="summary-card">
              <span className="label">资产</span>
              <span className="value">{formatCurrency(totalSummary.totalValue, totalSummary.currency)}</span>
            </div>
            <div className="summary-card">
              <span className="label">成本</span>
              <span className="value">{formatCurrency(totalSummary.totalCost, totalSummary.currency)}</span>
            </div>
            <div className="summary-card">
              <span className="label">收益</span>
              <span className={`value ${totalSummary.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                {totalSummary.totalReturn >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {formatCurrency(totalSummary.totalReturn, totalSummary.currency)}
              </span>
            </div>
            <div className="summary-card">
              <span className="label">收益率</span>
              <span className={`value ${totalSummary.returnRate >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(totalSummary.returnRate)}
              </span>
            </div>
          </div>
        )}

        <div className="section-header">
          <h2>我的投资组合</h2>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> 创建组合
          </button>
        </div>

        {portfolios.length === 0 ? (
          <div className="empty-state">
            <Wallet size={48} />
            <p>还没有投资组合</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              创建第一个组合
            </button>
          </div>
        ) : (
          <div className="portfolio-grid">
            {portfolios.map((portfolio) => {
              const summary = summaries[portfolio.id];
              const isPositive = summary && summary.totalReturn >= 0;

              return (
                <Link
                  to={`/portfolio/${portfolio.id}`}
                  key={portfolio.id}
                  className="portfolio-card"
                >
                  <div className="card-header">
                    <h3>{portfolio.name}</h3>
                    {portfolio.ruleType && (
                      <span className={`rule-badge ${portfolio.ruleType.toLowerCase()}`}>
                        {portfolio.ruleType === 'CONTRIBUTION' ? '定投' : '固定比例'}
                      </span>
                    )}
                  </div>

                  {summary ? (
                    <>
                      <div className="card-value">
                        <span className="label">资产</span>
                        <span className="value">
                          {formatCurrency(summary.totalValue, summary.currency)}
                        </span>
                      </div>

                      <div className="card-return">
                        <span className={`return-value ${isPositive ? 'positive' : 'negative'}`}>
                          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {formatCurrency(summary.totalReturn, summary.currency)}
                          <span className="return-percent">
                            ({formatPercent(summary.returnRate)})
                          </span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="card-empty">暂无数据</div>
                  )}

                  <div className="card-footer">
                    <span>{portfolio.assetCount || 0} 个资产</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreatePortfolioModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadPortfolios();
          }}
        />
      )}
    </div>
  );
}

function CreatePortfolioModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState<'CONTRIBUTION' | 'ALLOCATION' | ''>('');
  const [contributionPeriod, setContributionPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [baseCurrency, setBaseCurrency] = useState('CNY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await portfolioApi.create({
        name,
        baseCurrency,
        ruleType: ruleType || undefined,
        contributionPeriod: ruleType === 'CONTRIBUTION' ? contributionPeriod : undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>创建投资组合</h3>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">组合名称</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例如：我的股票组合"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ruleType">投资规则（可选）</label>
            <select
              id="ruleType"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as 'CONTRIBUTION' | 'ALLOCATION' | '')}
            >
              <option value="">不设置</option>
              <option value="CONTRIBUTION">定投</option>
              <option value="ALLOCATION">固定比例</option>
            </select>
          </div>

          {ruleType === 'CONTRIBUTION' && (
            <div className="form-group">
              <label htmlFor="contributionPeriod">定投周期</label>
              <select
                id="contributionPeriod"
                value={contributionPeriod}
                onChange={(e) => setContributionPeriod(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
              >
                <option value="DAILY">每日</option>
                <option value="WEEKLY">每周</option>
                <option value="MONTHLY">每月</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="baseCurrency">基础币种</label>
            <select
              id="baseCurrency"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
            >
              <option value="CNY">人民币 (CNY)</option>
              <option value="USD">美元 (USD)</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
