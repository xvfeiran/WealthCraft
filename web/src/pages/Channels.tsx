import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { channelApi } from '../api/client';
import type { Channel, Pagination } from '../types';

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async (page = 1) => {
    try {
      setLoading(true);
      const response = await channelApi.getAll(page, 10);
      setChannels(response.data.data || []);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Failed to load channels', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该渠道吗？')) return;
    try {
      await channelApi.delete(id);
      loadChannels(pagination?.page || 1);
    } catch (error) {
      console.error('Failed to delete channel', error);
    }
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingChannel(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingChannel(null);
  };

  const handleSave = () => {
    handleModalClose();
    loadChannels(pagination?.page || 1);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="channels-page">
      <header className="page-header">
        <div className="header-left">
          <Link to="/" className="back-button">
            <ArrowLeft size={20} />
          </Link>
          <h1>渠道管理</h1>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> 新增渠道
          </button>
        </div>
      </header>

      <main className="page-main">
        {channels.length === 0 ? (
          <div className="empty-state">
            <p>还没有配置渠道</p>
            <button className="btn btn-primary" onClick={handleCreate}>
              创建第一个渠道
            </button>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>币种</th>
                  <th>账号</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <tr key={channel.id}>
                    <td>{channel.name}</td>
                    <td>{channel.currency}</td>
                    <td>{channel.account || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-icon"
                          onClick={() => handleEdit(channel)}
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => handleDelete(channel.id)}
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => loadChannels(pagination.page - 1)}
                >
                  上一页
                </button>
                <span className="page-info">
                  第 {pagination.page} 页 / 共 {pagination.totalPages} 页
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadChannels(pagination.page + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {showModal && (
        <ChannelModal
          channel={editingChannel}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ChannelModal({
  channel,
  onClose,
  onSave,
}: {
  channel: Channel | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(channel?.name || '');
  const [currency, setCurrency] = useState(channel?.currency || 'CNY');
  const [account, setAccount] = useState(channel?.account || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!channel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await channelApi.update(channel.id, { name, currency, account: account || undefined });
      } else {
        await channelApi.create({ name, currency, account: account || undefined });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEditing ? '编辑渠道' : '新增渠道'}</h3>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">渠道名称</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例如：南方基金、老虎证券"
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency">账户币种</label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="CNY">人民币 (CNY)</option>
              <option value="USD">美元 (USD)</option>
              <option value="HKD">港币 (HKD)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="account">账号（可选）</label>
            <input
              type="text"
              id="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="账号或备注信息"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
