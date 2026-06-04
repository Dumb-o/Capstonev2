import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loading from '../components/shared/Loading';
import api from '../services/api';

export default function AdminPanel() {
  const [tab, setTab] = useState('dashboard');
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [disputesRes, statsRes, usersRes] = await Promise.all([
          api.get('/admin/disputes'),
          api.get('/admin/stats'),
          api.get('/admin/users?limit=50'),
        ]);
        setDisputes(disputesRes.data.disputes || []);
        setStats(statsRes.data);
        setUsers(usersRes.data.users || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const resolveDispute = async (id, decision) => {
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { decision });
      setDisputes(disputes.map((d) =>
        d.id === id ? { ...d, status: 'resolved', decision } : d
      ));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          <div className="page-header">
            <h2>Admin Panel</h2>
          </div>

          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.total_users}</span>
                <span className="stat-label">Users</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.total_contracts}</span>
                <span className="stat-label">Contracts</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.total_volume_eth?.toFixed(2)} ETH</span>
                <span className="stat-label">Volume</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.active_disputes}</span>
                <span className="stat-label">Active Disputes</span>
              </div>
            </div>
          )}

          <div className="admin-tabs" style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
            {['dashboard', 'disputes', 'users'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px', background: 'none', border: 'none',
                  borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                  color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: tab === t ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize',
                }}
              >{t}</button>
            ))}
          </div>

          {tab === 'dashboard' && (
            <div className="admin-section">
              <h3>Platform Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                <div className="contract-card" style={{ padding: 20 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Platform Fees</span>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                    {stats?.platform_fees_accumulated?.toFixed(4)} ETH
                  </div>
                </div>
                <div className="contract-card" style={{ padding: 20 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>User Breakdown</span>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {['admin', 'client', 'freelancer'].map(r => {
                      const count = users.filter(u => u.role === r).length;
                      return (
                        <div key={r} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ textTransform: 'capitalize' }}>{r}s</span>
                          <span style={{ fontWeight: 600 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'disputes' && (
            <div className="admin-section">
              <h3>Disputes</h3>
              {disputes.length === 0 ? (
                <p className="empty-text">No disputes</p>
              ) : (
                <div className="disputes-list">
                  {disputes.map((d) => (
                    <div key={d.id} className="dispute-card">
                      <div className="dispute-header">
                        <span>Contract: {d.contract_id?.slice(0, 12)}...</span>
                        <span className={`status-badge status-${d.status}`}>{d.status}</span>
                      </div>
                      <p><strong>Raised by:</strong> {d.raised_by}</p>
                      <p><strong>Reason:</strong> {d.reason}</p>
                      {d.status === 'open' && (
                        <div className="dispute-actions">
                          <button onClick={() => resolveDispute(d.id, 'release')} className="btn btn-sm btn-success">
                            Release to Freelancer
                          </button>
                          <button onClick={() => resolveDispute(d.id, 'refund')} className="btn btn-sm btn-danger">
                            Refund Client
                          </button>
                        </div>
                      )}
                      {d.status === 'resolved' && (
                        <p><strong>Decision:</strong> {d.decision}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'users' && (
            <div className="admin-section">
              <h3>All Users ({users.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {users.map(u => (
                  <div key={u.id} className="contract-card" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{u.username || 'Unnamed'}</span>
                      <div className="contract-meta">
                        <span>{u.email || 'no email'}</span>
                        <span className="status-badge" style={{
                          background: u.role === 'admin' ? '#ef4444' : u.role === 'client' ? '#3b82f6' : '#10b981',
                          fontSize: 10, padding: '1px 6px',
                        }}>{u.role}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
