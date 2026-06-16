import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import api from '../services/api';
import { useApp } from '../context/AppContext';

const experienceLevels = ['junior', 'mid', 'senior', 'lead'];

export default function FreelancerDirectory() {
  const { state } = useApp();
  const [freelancers, setFreelancers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [availFilter, setAvailFilter] = useState(false);
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');

  const [inviteModal, setInviteModal] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const loadFreelancers = useCallback(async (p) => {
    setLoading(true);
    try {
      const params = { role: 'freelancer', page: p, limit: 12 };
      if (search) params.search = search;
      if (skillsFilter) params.skills = skillsFilter;
      if (expFilter) params.experience_level = expFilter;
      if (availFilter) params.is_available = 'true';
      if (minRate) params.min_rate = minRate;
      if (maxRate) params.max_rate = maxRate;
      const { data } = await api.get('/users', { params });
      setFreelancers(data.users || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {}
    setLoading(false);
  }, [search, skillsFilter, expFilter, availFilter, minRate, maxRate]);

  useEffect(() => { loadFreelancers(page); }, [page, loadFreelancers]);

  const openInvite = async (freelancer) => {
    setInviteModal(freelancer);
    setSelectedJob('');
    setInviteMsg('');
    setInviteError('');
    setInviteSuccess('');
    try {
      const { data } = await api.get('/jobs', { params: { status: 'open' } });
      const jobs = (data.jobs || []).filter(j => j.client_id === state.user?.id);
      setMyJobs(jobs);
    } catch {}
  };

  const sendInvite = async () => {
    if (!selectedJob) { setInviteError('Please select a job'); return; }
    setSending(true);
    setInviteError('');
    try {
      const job = myJobs.find(j => j.id === selectedJob);
      const content = inviteMsg
        ? `You've been invited to apply for "${job?.title}": ${inviteMsg}`
        : `You've been invited to apply for "${job?.title}"`;
      await api.post('/messages/send', {
        receiver_id: inviteModal.id,
        content,
      });
      setInviteSuccess('Invitation sent!');
      setTimeout(() => setInviteModal(null), 1500);
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Failed to send invitation');
    }
    setSending(false);
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>Browse Freelancers</h1>
          <p className="page-sub">Find top talent for your projects ({total} available)</p>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <div className="search-wrapper" style={{ flex: 1, position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ position: 'absolute', left: 12, top: 10 }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="form-input" style={{ paddingLeft: 36 }}
            placeholder="Search by name, headline, or bio..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: 1, minWidth: 140 }} placeholder="Skills (comma-separated)"
          value={skillsFilter} onChange={e => { setSkillsFilter(e.target.value); setPage(1); }} />
        <select className="form-input" style={{ flex: 0.5, minWidth: 110 }} value={expFilter}
          onChange={e => { setExpFilter(e.target.value); setPage(1); }}>
          <option value="">Any Level</option>
          {experienceLevels.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
        </select>
        <input className="form-input" style={{ flex: 0.4, minWidth: 80 }} type="number" placeholder="Min rate"
          value={minRate} onChange={e => { setMinRate(e.target.value); setPage(1); }} />
        <input className="form-input" style={{ flex: 0.4, minWidth: 80 }} type="number" placeholder="Max rate"
          value={maxRate} onChange={e => { setMaxRate(e.target.value); setPage(1); }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', minWidth: 80 }}>
          <input type="checkbox" checked={availFilter} onChange={e => { setAvailFilter(e.target.checked); setPage(1); }} />
          Available
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Loading freelancers...</div>
      ) : freelancers.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <p>No freelancers match your criteria</p>
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setSkillsFilter(''); setExpFilter(''); setAvailFilter(false); setMinRate(''); setMaxRate(''); }} style={{ marginTop: 8 }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {freelancers.map(f => (
              <div key={f.id} className="job-card" style={{ padding: 0 }}>
                <div style={{ padding: 20, display: 'flex', gap: 14 }}>
                  <div className="user-avatar" style={{
                    width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), #60a5fa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0
                  }}>
                    {(f.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{f.username || 'Anonymous'}</div>
                        {f.headline && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{f.headline}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>{f.hourly_rate > 0 ? `${f.hourly_rate} ETH/hr` : '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {f.experience_level.charAt(0).toUpperCase() + f.experience_level.slice(1)}
                        </div>
                      </div>
                    </div>
                    {f.skills?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                        {f.skills.slice(0, 4).map(s => <span key={s} className="skill-tag">{s}</span>)}
                        {f.skills.length > 4 && <span className="skill-tag">+{f.skills.length - 4}</span>}
                      </div>
                    )}
                    {f.bio && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.4 }}>{f.bio.slice(0, 100)}{f.bio.length > 100 ? '...' : ''}</div>}
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--amber)' }}>{'★'.repeat(Math.round(f.rating))}{'☆'.repeat(5 - Math.round(f.rating))} {f.rating > 0 ? f.rating.toFixed(1) : ''}</div>
                      {f.is_available ? (
                        <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>● Available</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>○ Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', padding: '10px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Link to={`/messages?user=${f.id}`} className="btn btn-outline btn-sm">Message</Link>
                  <button className="btn btn-primary btn-sm" onClick={() => openInvite(f)}>Invite to Job</button>
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-2)', padding: '0 12px' }}>
                Page {page} of {pages}
              </span>
              <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {inviteModal && (
        <div className="modal-overlay" onClick={() => setInviteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invite {inviteModal.username || 'Freelancer'}</h3>
              <button className="modal-close" onClick={() => setInviteModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {myJobs.length === 0 ? (
                <p style={{ color: 'var(--text-2)', fontSize: 13 }}>You have no open jobs to invite to. <Link to="/create-contract">Post a job</Link> first.</p>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Select Job</label>
                    <select className="form-input" value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
                      <option value="">Choose a job...</option>
                      {myJobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.budget} ETH)</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message (optional)</label>
                    <textarea className="form-input" rows={3} value={inviteMsg}
                      onChange={e => setInviteMsg(e.target.value)} placeholder="I think you'd be a great fit for this project..." />
                  </div>
                  {inviteError && <div className="error-message">{inviteError}</div>}
                  {inviteSuccess && <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>{inviteSuccess}</div>}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setInviteModal(null)}>Cancel</button>
              {myJobs.length > 0 && (
                <button className="btn btn-primary" onClick={sendInvite} disabled={sending || !selectedJob}>
                  {sending ? 'Sending...' : 'Send Invitation'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
        </main>
      </div>
    </div>
  );
}
