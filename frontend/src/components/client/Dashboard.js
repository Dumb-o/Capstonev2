import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchContracts } from '../../services/contracts';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

const categories = [
  'web-dev', 'blockchain', 'mobile', 'design', 'writing',
  'marketing', 'data-science', 'devops', 'other',
];

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [contracts, setContracts] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [recommendedFreelancers, setRecommendedFreelancers] = useState([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, spent: 0, pendingProposals: 0, openJobs: 0 });
  const [showPostForm, setShowPostForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', budget: '', category: '', skills: '', duration_days: '',
  });

  const user = state.user;

  const profilePct = user?.bio ? 80 : 40;
  const hiringActivity = Math.min((stats.active + stats.completed) * 20, 100);

  const loadData = useCallback(async () => {
    try {
      const [contractData, jobsData, proposalData, recData] = await Promise.all([
        fetchContracts({ role: 'client', limit: 50 }),
        api.get('/jobs', { params: { status: 'open' } }).catch(() => ({ data: { jobs: [] } })),
        api.get('/proposals/received').catch(() => ({ data: [] })),
        api.get('/recommendations/freelancers', { params: { limit: 4 } }).catch(() => ({ data: [] })),
      ]);
      const list = contractData.contracts || [];
      setContracts(list);
      const active = list.filter(c => c.status === 'active' || c.status === 'in_progress');
      const completed = list.filter(c => c.status === 'completed');
      setStats({
        active: active.length,
        completed: completed.length,
        spent: list.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0),
        pendingProposals: proposalData.data?.filter(p => p.status === 'pending').length || 0,
        openJobs: jobsData.data?.jobs?.filter(j => j.status === 'open').length || 0,
      });
      setMyJobs(jobsData.data?.jobs?.filter(j => j.status === 'open') || []);
      setProposals(proposalData.data || []);
      setRecommendedFreelancers(recData.data || []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

  const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'in_progress');
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const contractSummary = {
    signed: contracts.filter(c => c.status === 'active' || c.status === 'completed').length,
    pending: contracts.filter(c => c.status === 'pending_signatures' || c.status === 'pending_funding').length,
    drafts: contracts.filter(c => c.status === 'draft' || c.status === 'pending_review').length,
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>
            Welcome back, {user?.username || 'Client'} 👋
          </h1>
          <p className="page-sub">Manage your active projects and talent pool.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowPostForm(!showPostForm)} className="btn btn-primary">
            {showPostForm ? 'Cancel' : '+ Post New Project'}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent-card">
          <div className="s-top">
            <span className="s-label">{stats.openJobs > 0 ? 'Open Jobs' : 'New'}</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
            </div>
          </div>
          <div className="s-val">{stats.openJobs > 0 ? stats.openJobs : 'New'}</div>
          <div className="s-sub" style={{ cursor: 'pointer' }} onClick={() => setShowPostForm(true)}>
            {stats.openJobs > 0 ? 'Open positions' : 'Post a project →'}
          </div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Active Projects</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
          </div>
          <div className="s-val">{stats.active}</div>
          <div className="s-badge">{stats.pendingProposals > 0 ? `${stats.pendingProposals} pending` : 'In progress'}</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Proposals Received</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
          </div>
          <div className="s-val">{proposals.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{pendingProposals.length} awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Total Budget</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
          </div>
          <div className="s-val">{stats.spent.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>ETH</span></div>
          <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4, fontWeight: 600 }}>Total budgeted</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          {showPostForm && (
            <div className="card" style={{ marginBottom: 20, padding: 0 }}>
              <div className="card-header"><h3>Post a New Job</h3></div>
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

          {activeContracts.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3>Active Project Progress</h3>
                <Link to="/contracts" className="view-all">View All</Link>
              </div>
              <div className="card-body">
                {activeContracts.slice(0, 5).map(c => (
                  <div key={c.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/contracts/${c.id}`} className="project-name">{c.title}</Link>
                      <span className="project-pct">{c.total_amount} ETH</span>
                    </div>
                    <div className="milestone-label">
                      <span>{c.freelancer_name || c.freelancer_id?.slice(0, 12)}</span>
                      <span style={{ marginLeft: 16 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header" style={{ marginBottom: 0 }}>
              <h3>Contract Status Summary</h3>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: '#ecfdf5' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{contractSummary.signed}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>Signed</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: '#fffbeb' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{contractSummary.pending}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>Pending</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: '#f1f5f9' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-3)' }}>{contractSummary.drafts}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>Drafts</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>Open Jobs</h3>
              {myJobs.length > 0 && <Link to="/jobs" className="view-all">View All</Link>}
            </div>
            <div className="card-body">
              {myJobs.length === 0 ? (
                <div className="empty-state" style={{ padding: '16px 0', border: 'none', background: 'transparent' }}>
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {recommendedFreelancers.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3>Recommended Freelancers</h3>
              </div>
              <div className="card-body">
                {recommendedFreelancers.slice(0, 4).map(r => (
                  <div key={r.freelancer.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/profile/${r.freelancer.id}`} className="project-name">
                        {r.freelancer.username || r.freelancer.id?.slice(0, 12)}
                      </Link>
                      <span className="project-pct" style={{ fontSize: 13 }}>
                        {r.freelancer.experience_level}
                      </span>
                    </div>
                    <div className="milestone-label">
                      {r.freelancer.headline && <span>{r.freelancer.headline.slice(0, 60)}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span className="badge badge-active" style={{ fontSize: 11 }}>
                        {Math.round(r.match_score * 100)}% match
                      </span>
                      {r.match_reasons?.slice(0, 2).map((reason, i) => (
                        <span key={i} style={{ fontSize: 11, color: 'var(--text-3)' }}>{reason}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>Proposals Received</h3>
              {pendingProposals.length > 0 && <span className="view-all">{pendingProposals.length} new</span>}
            </div>
            <div className="card-body">
              {pendingProposals.length === 0 ? (
                <div className="empty-state" style={{ padding: '16px 0', border: 'none', background: 'transparent' }}>
                  <p>No pending proposals for your jobs.</p>
                </div>
              ) : (
                pendingProposals.slice(0, 5).map(p => (
                  <div key={p.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/jobs/${p.job_id}`} className="project-name">{p.job_title || `Job ${p.job_id.slice(0, 12)}`}</Link>
                      <span className="project-pct">{p.bid_amount} ETH</span>
                    </div>
                    <div className="milestone-label" style={{ marginBottom: 4 }}>
                      <span>From: {p.freelancer_name || p.freelancer_id?.slice(0, 12)}</span>
                      {p.estimated_days && <span style={{ marginLeft: 12 }}>{p.estimated_days} days</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button onClick={() => handleAcceptProposal(p.id)} className="btn btn-sm btn-success">Accept</button>
                      <button onClick={() => handleRejectProposal(p.id)} className="btn btn-sm btn-danger">Reject</button>
                      {p.cover_letter && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4, fontStyle: 'italic', alignSelf: 'center' }}>
                          "{p.cover_letter.slice(0, 60)}..."
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>Profile & Activity</h3>
              <Link to="/profile" className="view-all">Edit</Link>
            </div>
            <div className="card-body">
              <div className="project-row" style={{ border: 'none', padding: '6px 0' }}>
                <div className="project-row-top">
                  <span className="milestone-label">Profile Complete</span>
                  <span className="project-pct" style={{ fontSize: 13 }}>{profilePct}%</span>
                </div>
                <div className="prog-bar" style={{ marginTop: 6 }}>
                  <div className="prog-fill" style={{ width: `${profilePct}%` }}></div>
                </div>
              </div>
              <div className="project-row" style={{ border: 'none', padding: '6px 0' }}>
                <div className="project-row-top">
                  <span className="milestone-label">Hiring Activity</span>
                  <span className="project-pct" style={{ fontSize: 13, color: 'var(--green)' }}>{stats.active + stats.completed} contracts</span>
                </div>
                <div className="prog-bar" style={{ marginTop: 6 }}>
                  <div className="prog-fill" style={{ width: `${hiringActivity}%`, background: 'linear-gradient(90deg, var(--green), var(--green))' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="hire-card">
            <div className="hc-icon" style={{ fontSize: 22, marginBottom: 8 }}>💡</div>
            <h4>Hire Smarter</h4>
            <p>Clients who use our Escrow feature report higher satisfaction on first-time hires.</p>
            <button onClick={() => setShowPostForm(true)} className="btn-hire">Post a Job →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
