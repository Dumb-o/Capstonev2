import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchContracts } from '../../services/contracts';
import api from '../../services/api';

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
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Freelancer Dashboard</h1>
          <p className="page-sub">Track your contracts, proposals, and earnings</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent-card">
          <div className="s-top">
            <span className="s-label">Active Contracts</span>
            <div className="s-icon">▦</div>
          </div>
          <div className="s-val">{stats.active}</div>
          <div className="s-sub">Currently working on</div>
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
            <span className="s-label">Total Earned</span>
            <div className="s-icon">◈</div>
          </div>
          <div className="s-val">{stats.earned.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>ETH</span></div>
          <div className="s-sub">Lifetime earnings</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Proposals Sent</span>
            <div className="s-icon">✉</div>
          </div>
          <div className="s-val">{myProposals.length}</div>
          <span className="s-badge">{myProposals.filter(p => p.status === 'pending').length} pending</span>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3>Active Contracts</h3>
              {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length > 0 && <Link to="/contracts" className="view-all">View All</Link>}
            </div>
            <div className="card-body">
              {contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', border: 'none', background: 'transparent' }}>
                  <p>No active contracts yet.</p>
                  <Link to="/jobs" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Browse Jobs</Link>
                </div>
              ) : (
                contracts.filter(c => c.status === 'active' || c.status === 'in_progress').slice(0, 5).map(c => (
                  <div key={c.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/contracts/${c.id}`} className="project-name">{c.title}</Link>
                      <span className={`badge badge-${c.status === 'active' ? 'active' : 'pending'}`}>{c.status}</span>
                    </div>
                    <div className="milestone-label">
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.total_amount} ETH</span>
                      <span style={{ marginLeft: 16 }}>{c.client_id?.slice(0, 12)}...</span>
                      <span style={{ marginLeft: 16 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>My Proposals</h3>
              {myProposals.length > 0 && <span className="view-all">{myProposals.filter(p => p.status === 'pending').length} pending</span>}
            </div>
            <div className="card-body">
              {myProposals.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', border: 'none', background: 'transparent' }}>
                  <p>You haven't submitted any proposals yet.</p>
                  <Link to="/jobs" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Browse Open Jobs</Link>
                </div>
              ) : (
                myProposals.slice(0, 5).map(p => (
                  <div key={p.id} className="project-row">
                    <div className="project-row-top">
                      <span className="project-name">{p.job_title || `Job ${p.job_id}`}</span>
                      <span className={`badge ${p.status === 'accepted' ? 'badge-active' : p.status === 'pending' ? 'badge-pending' : 'badge-draft'}`}>{p.status}</span>
                    </div>
                    <div className="milestone-label">
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.bid_amount} ETH</span>
                      <span style={{ marginLeft: 16 }}>{new Date(p.created_at).toLocaleDateString()}</span>
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
              <h3>Recommended Jobs</h3>
              {jobs.length > 0 && <Link to="/jobs" className="view-all">View All</Link>}
            </div>
            <div className="card-body">
              {jobs.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', border: 'none', background: 'transparent' }}>
                  <p>No open jobs right now.</p>
                </div>
              ) : (
                jobs.map(job => (
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

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3>Profile & Skill Match</h3>
            </div>
            <div className="card-body">
              <div className="prog-bar" style={{ marginBottom: 6 }}>
                <div className="prog-fill" style={{ width: `${profilePct}%` }}></div>
              </div>
              <div className="project-row" style={{ border: 'none', paddingTop: 0 }}>
                <div className="project-row-top">
                  <span className="milestone-label">Profile Complete</span>
                  <span className="project-pct">{profilePct}%</span>
                </div>
              </div>
              <div className="prog-bar" style={{ marginBottom: 6 }}>
                <div className="prog-fill" style={{ width: `${skillPct}%`, background: 'linear-gradient(90deg, var(--green), var(--green))' }}></div>
              </div>
              <div className="project-row" style={{ border: 'none', paddingTop: 0 }}>
                <div className="project-row-top">
                  <span className="milestone-label">Skills Listed</span>
                  <span className="project-pct" style={{ color: 'var(--green)' }}>{skillPct}%</span>
                </div>
              </div>
              <div className="prog-bar" style={{ marginBottom: 6 }}>
                <div className="prog-fill" style={{ width: `${matchRate}%`, background: 'linear-gradient(90deg, var(--amber), var(--amber))' }}></div>
              </div>
              <div className="project-row" style={{ border: 'none', paddingTop: 0 }}>
                <div className="project-row-top">
                  <span className="milestone-label">Job Match Rate</span>
                  <span className="project-pct" style={{ color: 'var(--amber)' }}>{matchRate}%</span>
                </div>
              </div>
              <Link to="/profile" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Update Profile</Link>
            </div>
          </div>

          <div className="hire-card">
            <div className="hc-icon" style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
            <h4>Find work today</h4>
            <p>Browse open jobs and submit proposals to start earning.</p>
            <Link to="/jobs" className="btn-hire" style={{ textDecoration: 'none' }}>Browse Jobs</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
