import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { portfolioApi } from '../api/client';
import type { Portfolio, PortfolioSummary } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PortfolioSummary>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          <button className="btn btn-secondary" onClick={logout}>
            退出登录
          </button>
        </div>
      </header>

      <main className="dashboard-main">
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
                    <span className={`risk-badge ${portfolio.riskLevel.toLowerCase()}`}>
                      {portfolio.riskLevel === 'LOW' ? '低风险' : portfolio.riskLevel === 'MEDIUM' ? '中风险' : '高风险'}
                    </span>
                  </div>

                  {summary ? (
                    <>
                      <div className="card-value">
                        <span className="label">总资产</span>
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
  const [riskLevel, setRiskLevel] = useState('MEDIUM');
  const [baseCurrency, setBaseCurrency] = useState('CNY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await portfolioApi.create({ name, riskLevel, baseCurrency });
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
            <label htmlFor="riskLevel">风险等级</label>
            <select
              id="riskLevel"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
            >
              <option value="LOW">低风险</option>
              <option value="MEDIUM">中风险</option>
              <option value="HIGH">高风险</option>
            </select>
          </div>

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
