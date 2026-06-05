import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchContracts } from '../../services/contracts';
import api from '../../services/api';

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
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Dashboard</h1>
          <p className="page-sub">Manage your projects and job postings</p>
        </div>
        <button onClick={() => setShowPostForm(!showPostForm)} className="btn btn-primary">
          {showPostForm ? 'Cancel' : '+ Post a Job'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent-card">
          <div className="s-top">
            <span className="s-label">Active Projects</span>
            <div className="s-icon">▦</div>
          </div>
          <div className="s-val">{stats.active}</div>
          <div className="s-sub">Currently in progress</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Completed</span>
            <div className="s-icon">✓</div>
          </div>
          <div className="s-val">{stats.completed}</div>
          <div className="s-sub">Successfully delivered</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Total Spent</span>
            <div className="s-icon">◈</div>
          </div>
          <div className="s-val">{stats.spent.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>ETH</span></div>
          <div className="s-sub">Across all projects</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Pending Proposals</span>
            <div className="s-icon">✉</div>
          </div>
          <div className="s-val">{stats.proposals}</div>
          <span className="s-badge">Awaiting review</span>
        </div>
      </div>

      <div className="two-col">
        <div>
          {showPostForm && (
            <div className="card" style={{ marginBottom: 20, padding: 0 }}>
              <div className="card-header">
                <h3>Post a New Job</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handlePostJob}>
                  {error && <div className="error-message">{error}</div>}
                  <div className="form-group">
                    <label className="form-label">Job Title *</label>
                    <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full Stack Developer Needed" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the project scope and requirements..." />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Budget (ETH) *</label>
                      <input className="form-input" type="number" step="0.01" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="5.0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Duration (days)</label>
                      <input className="form-input" type="number" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} placeholder="30" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option value="">Select category</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Skills (comma-separated)</label>
                      <input className="form-input" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, Solidity, Python" />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={posting}>
                    {posting ? 'Posting...' : 'Post Job'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3>My Job Postings</h3>
              {myJobs.length > 0 && <Link to="/jobs" className="view-all">View All</Link>}
            </div>
            <div className="card-body">
              {myJobs.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', border: 'none', background: 'transparent' }}>
                  <p>You haven't posted any jobs yet.</p>
                  <button onClick={() => setShowPostForm(true)} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Post Your First Job</button>
                </div>
              ) : (
                myJobs.slice(0, 5).map(job => (
                  <div key={job.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/jobs/${job.id}`} className="project-name">{job.title}</Link>
                      <span className="project-pct">{job.budget} ETH</span>
                    </div>
                    <div className="milestone-label">
                      {job.category && <span className={`cat-${job.category.replace(/-/g, '')}`} style={{ marginRight: 12 }}>{job.category}</span>}
                      {job.duration_days && <span>{job.duration_days} days</span>}
                      <span style={{ marginLeft: 12, color: 'var(--blue)' }}>{job.proposal_count || 0} proposals</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Active Projects</h3>
              {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length > 0 && <Link to="/contracts" className="view-all">View All</Link>}
            </div>
            <div className="card-body">
              {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', border: 'none', background: 'transparent' }}>
                  <p>No active projects yet. Post a job to attract freelancers.</p>
                </div>
              ) : (
                contracts.filter(c => c.status === 'active' || c.status === 'in_progress').slice(0, 5).map(c => (
                  <div key={c.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/contracts/${c.id}`} className="project-name">{c.title}</Link>
                      <span className={`badge badge-${c.status === 'active' ? 'active' : c.status === 'in_progress' ? 'active' : 'pending'}`}>{c.status}</span>
                    </div>
                    <div className="milestone-label">
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.total_amount} ETH</span>
                      <span style={{ marginLeft: 16 }}>{c.freelancer_id?.slice(0, 12)}...</span>
                      <span style={{ marginLeft: 16 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3>Proposals Received</h3>
              {proposals.length > 0 && <span className="view-all">{proposals.length} new</span>}
            </div>
            <div className="card-body">
              {proposals.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', border: 'none', background: 'transparent' }}>
                  <p>No pending proposals for your jobs.</p>
                </div>
              ) : (
                proposals.slice(0, 5).map(p => (
                  <div key={p.id} className="project-row">
                    <div className="project-row-top">
                      <span className="project-name">Job {p.job_id?.slice(0, 12)}...</span>
                      <span className="project-pct">{p.bid_amount} ETH</span>
                    </div>
                    <div className="milestone-label" style={{ marginBottom: 6 }}>
                      <span>Freelancer: {p.freelancer_id?.slice(0, 12)}...</span>
                      <span style={{ marginLeft: 12 }}>{p.estimated_days ? `${p.estimated_days} days` : ''}</span>
                    </div>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleAcceptProposal(p.id)} className="btn btn-sm btn-success">Accept</button>
                        <button onClick={() => handleRejectProposal(p.id)} className="btn btn-sm btn-danger">Reject</button>
                      </div>
                    )}
                    {p.cover_letter && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
                        "{p.cover_letter.slice(0, 120)}{p.cover_letter.length > 120 ? '...' : ''}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3>Profile & Business Match</h3>
            </div>
            <div className="card-body">
              <div className="prog-bar" style={{ marginBottom: 16 }}>
                <div className="prog-fill" style={{ width: `${profilePct}%` }}></div>
              </div>
              <div className="project-row" style={{ border: 'none', paddingTop: 0 }}>
                <div className="project-row-top">
                  <span className="milestone-label">Profile Complete</span>
                  <span className="project-pct">{profilePct}%</span>
                </div>
              </div>
              <div className="prog-bar" style={{ marginBottom: 16 }}>
                <div className="prog-fill" style={{ width: `${Math.min((stats.active + stats.completed) * 20, 100)}%`, background: 'linear-gradient(90deg, var(--green), var(--green))' }}></div>
              </div>
              <div className="project-row" style={{ border: 'none', paddingTop: 0 }}>
                <div className="project-row-top">
                  <span className="milestone-label">Hiring Activity</span>
                  <span className="project-pct" style={{ color: 'var(--green)' }}>{stats.active + stats.completed} contracts</span>
                </div>
              </div>
              <Link to="/profile" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Update Profile</Link>
            </div>
          </div>

          <div className="hire-card">
            <div className="hc-icon" style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
            <h4>Need talent?</h4>
            <p>Browse freelancer profiles or post a new job to attract the best talent.</p>
            <button onClick={() => setShowPostForm(true)} className="btn-hire">Post a Job</button>
          </div>
        </div>
      </div>
    </div>
  );
}
