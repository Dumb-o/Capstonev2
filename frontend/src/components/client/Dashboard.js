import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchContracts } from '../../services/contracts';

const sampleFreelancers = [
  { name: 'Alex Rivera', role: 'UI/UX Designer', rating: '4.9', color: '#6366f1' },
  { name: 'Sarah Chen', role: 'Full Stack Dev', rating: '5.0', color: '#10b981' },
  { name: 'Maya Patel', role: 'Graphic Designer', rating: '4.8', color: '#f59e0b' },
];

export default function ClientDashboard() {
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState({ active: 0, open: 0, spent: 0 });

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchContracts({ role: 'client', limit: 50 });
        const list = data.contracts || [];
        setContracts(list);
        const active = list.filter(c => c.status === 'active' || c.status === 'in_progress');
        setStats({
          active: active.length,
          open: list.filter(c => c.status === 'pending' || c.status === 'draft').length,
          spent: active.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0),
        });
      } catch {}
    }
    load();
  }, []);

  const statusColor = (s) => ({
    draft: '#6b7280',
    pending_signatures: '#f59e0b',
    active: '#10b981',
    completed: '#3b82f6',
    cancelled: '#ef4444',
    disputed: '#f97316',
  }[s] || '#6b7280');

  return (
    <div>
      <div className="page-header">
        <h2>Client Dashboard</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">Active Projects</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.open}</span>
          <span className="stat-label">Open Contracts</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.spent.toFixed(2)} ETH</span>
          <span className="stat-label">Total Spent</span>
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Active Projects</h3>
        {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <p>No active projects yet.</p>
            <Link to="/create-contract" className="btn btn-primary btn-sm">Create a Contract</Link>
          </div>
        ) : (
          <div className="contracts-list">
            {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').slice(0, 5).map(c => (
              <Link to={`/contracts/${c.id}`} key={c.id} className="contract-card">
                <div className="contract-main">
                  <h3>{c.title}</h3>
                  <span className="status-badge" style={{ background: statusColor(c.status) }}>
                    {c.status}
                  </span>
                </div>
                <div className="contract-meta">
                  <span>{c.total_amount} ETH</span>
                  <span>{c.freelancer_id?.slice(0, 12)}...</span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Available Freelancers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {sampleFreelancers.map((f, i) => (
            <div key={i} className="contract-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: f.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13
                }}>
                  {f.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{f.role}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>⭐ {f.rating}</div>
            </div>
          ))}
        </div>
        <Link to="/jobs" className="btn btn-outline btn-sm">Browse All Talent</Link>
      </div>

      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <Link to="/create-contract" className="action-card">
            <span className="action-icon">📝</span>
            <span>Post a Job</span>
          </Link>
          <Link to="/jobs" className="action-card">
            <span className="action-icon">🔍</span>
            <span>Find Talent</span>
          </Link>
          <Link to="/contracts" className="action-card">
            <span className="action-icon">📋</span>
            <span>All Contracts</span>
          </Link>
          <Link to="/messages" className="action-card">
            <span className="action-icon">💬</span>
            <span>Messages</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
