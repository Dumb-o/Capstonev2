import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  closed: '#6b7280',
}[s] || '#6b7280');

const categories = [
  'web-dev', 'blockchain', 'mobile', 'design', 'writing',
  'marketing', 'data-science', 'devops', 'other',
];

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ active: 0, completed: 0, spent: 0, proposals: 0 });
  const [showPostForm, setShowPostForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', budget: '', category: '', skills: '', duration_days: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [contractData, jobsData, proposalData] = await Promise.all([
        fetchContracts({ role: 'client', limit: 50 }),
        api.get('/jobs').catch(() => ({ data: { jobs: [] } })),
        api.get('/proposals/received').catch(() => ({ data: [] })),
      ]);
      const list = contractData.contracts || [];
      setContracts(list);
      const active = list.filter(c => c.status === 'active' || c.status === 'in_progress');
      const completed = list.filter(c => c.status === 'completed');
      setStats({
        active: active.length,
        completed: completed.length,
        spent: completed.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0),
        proposals: proposalData.data?.length || 0,
      });
      setMyJobs(jobsData.data?.jobs?.filter(j => j.status === 'open') || []);
      setProposals(proposalData.data?.filter(p => p.status === 'pending') || []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setUser(JSON.parse(stored)); } catch {}
  }, []);

  const handlePostJob = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.budget) {
      setError('Title and budget are required');
      return;
    }
    setPosting(true);
    try {
      await api.post('/jobs', {
        title: form.title,
        description: form.description,
        budget: parseFloat(form.budget),
        category: form.category || null,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()) : [],
        duration_days: form.duration_days ? parseInt(form.duration_days) : null,
      });
      setForm({ title: '', description: '', budget: '', category: '', skills: '', duration_days: '' });
      setShowPostForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post job');
    }
    setPosting(false);
  };

  const handleAcceptProposal = async (proposalId) => {
    try {
      await api.put(`/proposals/${proposalId}`, { status: 'accepted' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to accept proposal');
    }
  };

  const handleRejectProposal = async (proposalId) => {
    try {
      await api.put(`/proposals/${proposalId}`, { status: 'rejected' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject proposal');
    }
  };

  const profilePct = user?.bio ? 80 : 40;
  const skillPct = user?.skills?.length > 0 ? 80 : 20;
  const matchRate = Math.min(profilePct + skillPct / 2, 100);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Client Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your projects and job postings</p>
        </div>
        <button onClick={() => setShowPostForm(!showPostForm)} className="btn btn-primary">
          {showPostForm ? 'Cancel' : '+ Post a Job'}
        </button>
      </div>

      {showPostForm && (
        <div className="dashboard-section">
          <div className="contract-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Post a New Job</h3>
            <form onSubmit={handlePostJob} className="contract-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Job Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full Stack Developer Needed" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the project scope and requirements..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Budget (ETH) *</label>
                  <input type="number" step="0.01" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="5.0" />
                </div>
                <div className="form-group">
                  <label>Duration (days)</label>
                  <input type="number" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} placeholder="30" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Skills (comma-separated)</label>
                  <input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, Solidity, Python" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={posting}>
                {posting ? 'Posting...' : 'Post Job'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">Active Projects</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.spent.toFixed(2)} ETH</span>
          <span className="stat-label">Total Spent</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.proposals}</span>
          <span className="stat-label">Pending Proposals</span>
        </div>
      </div>

      <div className="dashboard-section">
        <h3>My Job Postings</h3>
        {myJobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <p>You haven't posted any jobs yet.</p>
            <button onClick={() => setShowPostForm(true)} className="btn btn-primary btn-sm">Post Your First Job</button>
          </div>
        ) : (
          <div className="contracts-list">
            {myJobs.slice(0, 5).map(job => (
              <div key={job.id} className="contract-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Link to={`/jobs/${job.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{job.title}</Link>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{job.budget} ETH</span>
                </div>
                <div className="contract-meta">
                  {job.category && <span className="job-category">{job.category}</span>}
                  {job.duration_days && <span>{job.duration_days} days</span>}
                  <span style={{ color: 'var(--primary)' }}>{job.proposal_count || 0} proposals</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Active Projects</h3>
        {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <p>No active projects yet. Post a job to attract freelancers.</p>
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
                  <span>{c.freelancer_id?.slice(0, 12)}...</span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Proposals Received</h3>
        {proposals.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <p>No pending proposals for your jobs.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {proposals.slice(0, 5).map(p => (
              <div key={p.id} className="contract-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Job {p.job_id?.slice(0, 12)}...</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{p.bid_amount} ETH</span>
                </div>
                <div className="contract-meta">
                  <span>Freelancer: {p.freelancer_id?.slice(0, 12)}...</span>
                  <span>{p.estimated_days ? `${p.estimated_days} days` : ''}</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                {p.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => handleAcceptProposal(p.id)} className="btn btn-sm btn-success">
                      Accept
                    </button>
                    <button onClick={() => handleRejectProposal(p.id)} className="btn btn-sm btn-danger">
                      Reject
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  <em>{p.cover_letter}</em>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Profile & Business Match</h3>
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
                <span style={{ color: 'var(--text-muted)' }}>Hiring Activity</span>
                <span style={{ fontWeight: 600 }}>{stats.active + stats.completed} contracts</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((stats.active + stats.completed) * 20, 100)}%`, height: '100%', background: 'var(--success)', borderRadius: 3 }} />
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
          <div onClick={() => setShowPostForm(true)} className="action-card" style={{ cursor: 'pointer' }}>
            <span className="action-icon">📝</span>
            <span>Post a Job</span>
          </div>
          <Link to="/jobs" className="action-card">
            <span className="action-icon">🔍</span>
            <span>Explore Jobs</span>
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
