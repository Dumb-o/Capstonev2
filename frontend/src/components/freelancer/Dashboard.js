import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchContracts } from '../../services/contracts';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function FreelancerDashboard() {
  const { state } = useApp();
  const [contracts, setContracts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, earned: 0, applied: 0 });
  const [earnedFromMilestones, setEarnedFromMilestones] = useState(0);

  const user = state.user;

  const loadData = useCallback(async () => {
    try {
      const [contractData, recData, proposalData] = await Promise.all([
        fetchContracts({ role: 'freelancer', limit: 50 }),
        api.get('/recommendations/jobs', { params: { limit: 5 } }).catch(() => ({ data: [] })),
        api.get('/proposals/mine').catch(() => ({ data: [] })),
      ]);
      const list = contractData.contracts || [];
      setContracts(list);
      setJobs(recData.data?.jobs || []);
      setMyProposals(proposalData.data || []);

      const completed = list.filter(c => c.status === 'completed');
      const active = list.filter(c => c.status === 'active' || c.status === 'in_progress' || c.status === 'pending_signatures');

      let milestoneEarnings = 0;
      for (const c of completed) {
        try {
          const detail = await api.get(`/contracts/${c.id}`);
          const milestones = detail.data?.milestones || [];
          const approved = milestones.filter(m => m.status === 'approved' || m.status === 'paid');
          milestoneEarnings += approved.reduce((s, m) => s + parseFloat(m.amount || 0), 0);
        } catch {
          console.warn('Failed to fetch contract detail for milestone earnings');
        }
      }

      setStats({
        completed: completed.length,
        earned: completed.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0),
        applied: proposalData.data?.length || 0,
      });
      setEarnedFromMilestones(milestoneEarnings || earnedFromMilestones);
    } catch {
      console.warn('Failed to load freelancer dashboard data');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const profilePct = user?.bio ? 80 : 40;
  const skillPct = user?.skills?.length > 0 ? 80 : 20;
  const matchRate = Math.min(profilePct + skillPct / 2, 100);

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>
            Welcome back, {user?.username || 'Freelancer'} 👋
          </h1>
          <p className="page-sub">Here's your freelancing activity and latest opportunities.</p>
        </div>
        <Link to="/jobs" className="btn btn-outline btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Browse Jobs
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent-card">
          <div className="s-top">
            <span className="s-label">Status</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div className="s-val" style={{ fontSize: 20 }}>{stats.active > 0 ? 'Working' : 'Available'}</div>
          <div className="s-sub" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/profile'}>Update in profile →</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Active Contracts</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          </div>
          <div className="s-val">{stats.active}</div>
          <div className="s-badge">In progress</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Jobs Applied</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
          </div>
          <div className="s-val">{stats.applied}</div>
          <div className="s-sub">{myProposals.filter(p => p.status === 'pending').length} pending</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Total Earned</span>
            <div className="s-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
          </div>
          <div className="s-val">{stats.earned.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>ETH</span></div>
          <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 4, fontWeight: 600 }}>Via Escrow</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>Active Contracts</h3>
              {contracts.filter(c => c.status === 'active' || c.status === 'in_progress' || c.status === 'pending_signatures').length > 0 && (
                <Link to="/contracts" className="view-all">View All</Link>
              )}
            </div>
            <div className="card-body">
              {contracts.filter(c => c.status === 'active' || c.status === 'in_progress' || c.status === 'pending_signatures').length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0', border: 'none', background: 'transparent' }}>
                  <p>No active contracts yet.</p>
                  <Link to="/jobs" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Browse Jobs →</Link>
                </div>
              ) : (
                contracts.filter(c => c.status === 'active' || c.status === 'in_progress' || c.status === 'pending_signatures').slice(0, 5).map(c => (
                  <div key={c.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/contracts/${c.id}`} className="project-name">{c.title}</Link>
                      <span className={`badge ${c.status === 'active' ? 'badge-active' : c.status === 'pending_signatures' ? 'badge-pending' : 'badge-active'}`}>{c.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="milestone-label">
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.total_amount} ETH</span>
                      <span style={{ marginLeft: 16 }}>{c.client_name || c.client_id?.slice(0, 12)}</span>
                      <span style={{ marginLeft: 16 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ marginBottom: 0 }}>
              <h3>Profile & Skill Match</h3>
              <Link to="/profile" className="view-all">Edit</Link>
            </div>
            <div style={{ padding: '16px 20px 20px' }}>
              <div className="project-row" style={{ border: 'none', padding: '8px 0' }}>
                <div className="project-row-top">
                  <span className="milestone-label">Profile Complete</span>
                  <span className="project-pct" style={{ fontSize: 13 }}>{profilePct}%</span>
                </div>
                <div className="prog-bar" style={{ marginTop: 6 }}>
                  <div className="prog-fill" style={{ width: `${profilePct}%` }}></div>
                </div>
              </div>
              <div className="project-row" style={{ border: 'none', padding: '8px 0' }}>
                <div className="project-row-top">
                  <span className="milestone-label">Skills Listed</span>
                  <span className="project-pct" style={{ fontSize: 13, color: 'var(--green)' }}>{skillPct}%</span>
                </div>
                <div className="prog-bar" style={{ marginTop: 6 }}>
                  <div className="prog-fill" style={{ width: `${skillPct}%`, background: 'linear-gradient(90deg, var(--green), var(--green))' }}></div>
                </div>
              </div>
              <div className="project-row" style={{ border: 'none', padding: '8px 0' }}>
                <div className="project-row-top">
                  <span className="milestone-label">Job Match Rate</span>
                  <span className="project-pct" style={{ fontSize: 13, color: 'var(--amber)' }}>{matchRate}%</span>
                </div>
                <div className="prog-bar" style={{ marginTop: 6 }}>
                  <div className="prog-fill" style={{ width: `${matchRate}%`, background: 'linear-gradient(90deg, var(--amber), var(--amber))' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header">
              <h3>Recommended Jobs</h3>
              <Link to="/jobs" className="view-all">See All</Link>
            </div>
            <div className="card-body">
              {jobs.length === 0 ? (
                <div className="empty-state" style={{ padding: '16px 0', border: 'none', background: 'transparent' }}>
                  <p>No recommended jobs right now.</p>
                </div>
              ) : (
                jobs.map(r => (
                  <div key={r.job.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/jobs/${r.job.id}`} className="project-name">{r.job.title}</Link>
                      <span className="project-pct">{r.job.budget} ETH</span>
                    </div>
                    <div className="milestone-label">
                      {r.job.category && <span className={`cat-${r.job.category.replace(/-/g, '')}`} style={{ marginRight: 12 }}>{r.job.category}</span>}
                      {r.job.duration_days && <span>{r.job.duration_days} days</span>}
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
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header">
              <h3>My Proposals</h3>
              {myProposals.length > 0 && <span className="view-all">{myProposals.filter(p => p.status === 'pending').length} pending</span>}
            </div>
            <div className="card-body">
              {myProposals.length === 0 ? (
                <div className="empty-state" style={{ padding: '16px 0', border: 'none', background: 'transparent' }}>
                  <p>You haven't submitted any proposals yet.</p>
                  <Link to="/jobs" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Browse Open Jobs</Link>
                </div>
              ) : (
                myProposals.slice(0, 5).map(p => (
                  <div key={p.id} className="project-row">
                    <div className="project-row-top">
                      <Link to={`/jobs/${p.job_id}`} className="project-name">{p.job_title || `Job ${p.job_id.slice(0, 12)}`}</Link>
                      <span className={`badge ${p.status === 'accepted' ? 'badge-active' : p.status === 'pending' ? 'badge-pending' : 'badge-draft'}`}>{p.status}</span>
                    </div>
                    <div className="milestone-label">
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.bid_amount} ETH</span>
                      <span style={{ marginLeft: 16 }}>{new Date(p.created_at).toLocaleDateString()}</span>
                      {p.contract_id && (
                        <Link to={`/contracts/${p.contract_id}`} className="btn btn-sm btn-outline" style={{ marginLeft: 12 }}>
                          View Contract
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1a1a2e)', color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>On-Chain Reputation</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>New</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, marginBottom: 12 }}>
              Complete contracts to build your verifiable on-chain reputation score.
            </p>
            <Link to="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#6ee7b7', textDecoration: 'none' }}>
              View Full Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
