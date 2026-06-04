import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchContracts } from '../../services/contracts';
import api from '../../services/api';

const statusColor = (s) => ({
  draft: '#6b7280',
  pending_signatures: '#f59e0b',
  active: '#10b981',
  completed: '#3b82f6',
  cancelled: '#ef4444',
  disputed: '#f97316',
  open: '#6366f1',
  filled: '#8b5cf6',
}[s] || '#6b7280');

export default function FreelancerDashboard() {
  const [contracts, setContracts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ active: 0, completed: 0, earned: 0 });

  const loadData = useCallback(async () => {
    try {
      const [contractData, jobData, proposalData] = await Promise.all([
        fetchContracts({ role: 'freelancer', limit: 50 }),
        api.get('/jobs', { params: { status: 'open', limit: 5 } }).catch(() => ({ data: { jobs: [] } })),
        api.get('/proposals/mine').catch(() => ({ data: [] })),
      ]);
      const list = contractData.contracts || [];
      setContracts(list);
      setJobs(jobData.data?.jobs || []);
      setMyProposals(proposalData.data || []);
      const completed = list.filter(c => c.status === 'completed');
      setStats({
        active: list.filter(c => c.status === 'active' || c.status === 'in_progress').length,
        completed: completed.length,
        earned: completed.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0),
      });
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setUser(JSON.parse(stored)); } catch {}
  }, []);

  const profilePct = user?.bio ? 80 : 40;
  const skillPct = user?.skills?.length > 0 ? 80 : 20;
  const matchRate = Math.min(profilePct + skillPct / 2, 100);

  return (
    <div>
      <div className="page-header">
        <h2>Freelancer Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Track your contracts, proposals, and earnings</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">Active Contracts</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.earned.toFixed(2)} ETH</span>
          <span className="stat-label">Total Earned</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{myProposals.length}</span>
          <span className="stat-label">Proposals Sent</span>
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Active Contracts</h3>
        {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <p>No active contracts yet.</p>
            <Link to="/jobs" className="btn btn-primary btn-sm">Browse Jobs</Link>
          </div>
        ) : (
          <div className="contracts-list">
            {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').slice(0, 5).map(c => (
              <Link to={`/contracts/${c.id}`} key={c.id} className="contract-card">
                <div className="contract-main">
                  <h3>{c.title}</h3>
                  <span className="status-badge" style={{ background: statusColor(c.status) }}>{c.status}</span>
                </div>
                <div className="contract-meta">
                  <span>{c.total_amount} ETH</span>
                  <span>{c.client_id?.slice(0, 12)}...</span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>My Proposals</h3>
        {myProposals.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <p>You haven't submitted any proposals yet.</p>
            <Link to="/jobs" className="btn btn-outline btn-sm">Browse Open Jobs</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myProposals.slice(0, 5).map(p => (
              <div key={p.id} className="contract-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.job_title || `Job ${p.job_id}`}</span>
                  <span className="status-badge" style={{
                    background: p.status === 'pending' ? '#f59e0b' : p.status === 'accepted' ? '#10b981' : '#ef4444',
                    fontSize: 11, padding: '2px 8px',
                  }}>{p.status}</span>
                </div>
                <div className="contract-meta">
                  <span>Bid: {p.bid_amount} ETH</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Recommended Jobs</h3>
        {jobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <p>No open jobs right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {jobs.map(job => (
              <Link to={`/jobs/${job.id}`} key={job.id} className="contract-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{job.title}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>{job.budget} ETH</span>
                </div>
                <div className="contract-meta">
                  {job.category && <span className="job-category">{job.category}</span>}
                  {job.duration_days && <span>{job.duration_days} days</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link to="/jobs" className="btn btn-outline btn-sm">View All Jobs</Link>
      </div>

      <div className="dashboard-section">
        <h3>Profile & Skill Match</h3>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Profile Complete</span>
                <span style={{ fontWeight: 600 }}>{profilePct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${profilePct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Skills Listed</span>
                <span style={{ fontWeight: 600 }}>{skillPct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${skillPct}%`, height: '100%', background: 'var(--success)', borderRadius: 3 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Job Match Rate</span>
                <span style={{ fontWeight: 600 }}>{matchRate}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${matchRate}%`, height: '100%', background: '#f59e0b', borderRadius: 3 }} />
              </div>
            </div>
          </div>
          <Link to="/profile" className="btn btn-outline btn-sm" style={{ marginTop: 16 }}>
            Update Profile
          </Link>
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <Link to="/jobs" className="action-card">
            <span className="action-icon">🔍</span>
            <span>Find Jobs</span>
          </Link>
          <Link to="/contracts" className="action-card">
            <span className="action-icon">📋</span>
            <span>My Contracts</span>
          </Link>
          <Link to="/profile" className="action-card">
            <span className="action-icon">👤</span>
            <span>Update Profile</span>
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
