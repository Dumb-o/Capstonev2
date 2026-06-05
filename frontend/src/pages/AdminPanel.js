import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
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
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            <div className="page-header">
              <div>
                <h1 className="page-title">Admin Panel</h1>
                <p className="page-sub">Manage platform <span>users, disputes, and settings</span></p>
              </div>
            </div>

            {stats && (
              <div className="stats-grid">
                <div className="stat-card accent-card">
                  <div className="s-top">
                    <span className="s-label">Total Users</span>
                    <div className="s-icon">👥</div>
                  </div>
                  <div className="s-val">{stats.total_users}</div>
                  <div className="s-sub">Registered on platform</div>
                </div>
                <div className="stat-card">
                  <div className="s-top">
                    <span className="s-label">Contracts</span>
                    <div className="s-icon">📋</div>
                  </div>
                  <div className="s-val">{stats.total_contracts}</div>
                </div>
                <div className="stat-card">
                  <div className="s-top">
                    <span className="s-label">Volume</span>
                    <div className="s-icon">◈</div>
                  </div>
                  <div className="s-val">{stats.total_volume_eth?.toFixed(2)} ETH</div>
                </div>
                <div className="stat-card">
                  <div className="s-top">
                    <span className="s-label">Active Disputes</span>
                    <div className="s-icon">⚖️</div>
                  </div>
                  <div className="s-val">{stats.active_disputes}</div>
                  <span className="s-badge" style={stats.active_disputes > 0 ? { background: '#fef2f2', color: '#dc2626' } : {}}>
                    {stats.active_disputes > 0 ? 'Needs attention' : 'All clear'}
                  </span>
                </div>
              </div>
            )}

            <div className="admin-tabs">
              {['dashboard', 'disputes', 'users'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`admin-tab ${tab === t ? 'active' : ''}`}
                >{t}</button>
              ))}
            </div>

            {tab === 'dashboard' && (
              <div className="admin-section">
                <h3>Platform Overview</h3>
                <div className="two-col">
                  <div className="card">
                    <div className="card-header">
                      <h3>Platform Fees</h3>
                    </div>
                    <div className="card-body">
                      <div className="cs-val" style={{ fontSize: 32 }}>
                        {stats?.platform_fees_accumulated?.toFixed(4)} ETH
                      </div>
                      <div className="cs-lbl" style={{ marginTop: 4 }}>Accumulated platform fees</div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-header">
                      <h3>User Breakdown</h3>
                    </div>
                    <div className="card-body">
                      {['admin', 'client', 'freelancer'].map(r => {
                        const count = users.filter(u => u.role === r).length;
                        return (
                          <div key={r} className="project-row" style={{ border: 'none' }}>
                            <div className="project-row-top">
                              <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{r}s</span>
                              <span style={{ fontWeight: 700, fontSize: 16 }}>{count}</span>
                            </div>
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
                  <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <h3>No disputes</h3>
                    <p>All contracts are running smoothly.</p>
                  </div>
                ) : (
                  <div className="disputes-list">
                    {disputes.map((d) => (
                      <div key={d.id} className="dispute-card">
                        <div className="dispute-header">
                          <span style={{ fontWeight: 600 }}>Contract: {d.contract_id?.slice(0, 12)}...</span>
                          <span className={`status-badge status-${d.status === 'open' ? 'pending' : 'completed'}`}>{d.status}</span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}><strong>Raised by:</strong> {d.raised_by}</p>
                        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 8 }}><strong>Reason:</strong> {d.reason}</p>
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
                          <span className="badge badge-completed">Decision: {d.decision}</span>
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
                    <div key={u.id} className="contract-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                          {(u.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username || 'Unnamed'}</div>
                          <div className="contract-meta" style={{ gap: 8 }}>
                            <span>{u.email || 'no email'}</span>
                            <span className={`role-badge ${u.role}`}>{u.role}</span>
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
