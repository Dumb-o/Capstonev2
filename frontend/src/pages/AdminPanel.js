import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import Toast from '../components/shared/Toast';
import UserSearchSelect from '../components/admin/UserSearchSelect';

const tabs = ['dashboard', 'users', 'jobs', 'proposals', 'contracts', 'disputes', 'messages'];
const LIMIT = 20;

export default function AdminPanel() {
  const { state, logout } = useApp();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [page, setPage] = useState({ users: 1, jobs: 1, proposals: 1, contracts: 1, disputes: 1, messages: 1 });
  const [totalPages, setTotalPages] = useState({ users: 1, jobs: 1, proposals: 1, contracts: 1, disputes: 1, messages: 1 });
  const [filters, setFilters] = useState({ users: '', jobs: '', proposals: '', contracts: '', disputes: '' });
  const [createModal, setCreateModal] = useState({ open: false, type: '' });
  const [createForm, setCreateForm] = useState({});
  const [editModal, setEditModal] = useState({ open: false, type: '', item: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: null });
  const [editForm, setEditForm] = useState({});
  const [userCache, setUserCache] = useState({});
  const userCacheRef = useRef({});

  const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);

  const resolveUserNames = useCallback(async (msgs) => {
    const ids = new Set();
    msgs.forEach(m => { if (m.sender_id) ids.add(m.sender_id); if (m.receiver_id) ids.add(m.receiver_id); });
    const missing = [...ids].filter(id => !userCacheRef.current[id]);
    if (missing.length === 0) return;
    try {
      const { data } = await api.get(`/admin/users?limit=${Math.min(missing.length + 5, 100)}`);
      const map = { ...userCacheRef.current };
      (data.users || []).forEach(u => { map[u.id] = u; });
      userCacheRef.current = map;
      setUserCache(map);
    } catch {}
  }, []);

  const loadTabData = useCallback(async (t, pageNum = 1, filterVal = '') => {
    const params = new URLSearchParams({ page: String(pageNum), limit: String(LIMIT) });
    if (filterVal) params.set('status', filterVal);
    if (t === 'users' && filterVal) params.set('role', filterVal);

    try {
      const { data } = await api.get(`/admin/${t}?${params}`);
      return data;
    } catch (err) {
      showToast(err.response?.data?.detail || `Failed to load ${t}`, 'error');
      return null;
    }
  }, [showToast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statsRes, msgsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => null),
        api.get('/admin/messages?page=1&limit=20').catch(() => null),
      ]);
      setStats(statsRes?.data);
      if (msgsRes?.data?.messages) {
        setMessages(msgsRes.data.messages);
        setTotalPages(prev => ({ ...prev, messages: msgsRes.data.pages || 1 }));
        resolveUserNames(msgsRes.data.messages);
      }
    } catch {}
    setLoading(false);
  }, [resolveUserNames]);

  const loadEntities = useCallback(async (t) => {
    const p = page[t] || 1;
    const f = filters[t] || '';
    const data = await loadTabData(t, p, f);
    if (!data) return;
    const key = t === 'users' ? 'users' : t;
    const setter = { users: setUsers, jobs: setJobs, proposals: setProposals, contracts: setContracts, disputes: setDisputes, messages: setMessages };
    if (setter[t]) setter[t](data[key] || []);
    if (t === 'messages') resolveUserNames(data[key] || []);
    setTotalPages(prev => ({ ...prev, [t]: data.pages || 1 }));
  }, [page, filters, loadTabData]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab !== 'dashboard') loadEntities(tab);
  }, [tab, page, filters, loadEntities]);

  const resolveDispute = async (id, decision) => {
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { decision });
      showToast('Dispute resolved', 'success');
      loadEntities('disputes');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to resolve', 'error');
    }
  };

  const [confirmAction, setConfirmAction] = useState({ open: false, message: '', onConfirm: null });

  const updateContract = async (id, status) => {
    try {
      await api.put(`/admin/contracts/${id}`, { status });
      showToast('Contract updated', 'success');
      loadEntities('contracts');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update contract', 'error');
    }
  };

  const updateJob = async (id, data) => {
    try {
      await api.put(`/admin/jobs/${id}`, data);
      showToast('Job updated', 'success');
      loadEntities('jobs');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update job', 'error');
    }
  };

  const withConfirm = (message, fn) => {
    setConfirmAction({ open: true, message, onConfirm: () => { setConfirmAction({ open: false, message: '', onConfirm: null }); fn(); } });
  };

  const toggleUserActive = async (id, is_active) => {
    try {
      await api.put(`/admin/users/${id}`, { is_active });
      showToast(`User ${is_active ? 'activated' : 'suspended'}`, 'success');
      loadEntities('users');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update user', 'error');
    }
  };

  const openCreate = (type) => {
    const form = {};
    if (type === 'users') { form.email = ''; form.password = ''; form.username = ''; form.role = 'freelancer'; form.hourly_rate = 0; }
    if (type === 'jobs') { form.client_id = ''; form.title = ''; form.budget = ''; form.category = ''; form.description = ''; }
    if (type === 'proposals') { form.job_id = ''; form.freelancer_id = ''; form.bid_amount = ''; form.cover_letter = ''; }
    if (type === 'contracts') { form.client_id = ''; form.freelancer_id = ''; form.title = ''; form.total_amount = ''; form.description = ''; }
    if (type === 'disputes') { form.contract_id = ''; form.raised_by = ''; form.reason = ''; }
    setCreateForm(form);
    setCreateModal({ open: true, type });
  };

  const handleCreate = async () => {
    const { type } = createModal;
    try {
      const endpoint = `/admin/${type}`;
      const payload = { ...createForm };
      if (payload.budget) payload.budget = parseFloat(payload.budget);
      if (payload.bid_amount) payload.bid_amount = parseFloat(payload.bid_amount);
      if (payload.total_amount) payload.total_amount = parseFloat(payload.total_amount);
      if (payload.hourly_rate) payload.hourly_rate = parseFloat(payload.hourly_rate);
      await api.post(endpoint, payload);
      showToast(`${type.slice(0, -1)} created`, 'success');
      setCreateModal({ open: false, type: '' });
      loadEntities(tab);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create', 'error');
    }
  };

  const openEdit = (type, item) => {
    const form = {};
    if (type === 'user') {
      form.username = item.username || '';
      form.email = item.email || '';
      form.role = item.role || '';
      form.is_active = item.is_active ?? true;
      form.is_available = item.is_available ?? true;
      form.headline = item.headline || '';
      form.bio = item.bio || '';
      form.hourly_rate = item.hourly_rate || 0;
    }
    if (type === 'job') {
      form.title = item.title || '';
      form.description = item.description || '';
      form.budget = item.budget || '';
      form.category = item.category || '';
      form.status = item.status || '';
      form.duration_days = item.duration_days || '';
    }
    if (type === 'proposal') {
      form.status = item.status || '';
      form.bid_amount = item.bid_amount || '';
      form.cover_letter = item.cover_letter || '';
      form.estimated_days = item.estimated_days || '';
    }
    if (type === 'contract') {
      form.title = item.title || '';
      form.description = item.description || '';
      form.total_amount = item.total_amount || '';
      form.status = item.status || '';
    }
    if (type === 'dispute') { form.reason = item.reason || ''; form.status = item.status || ''; form.decision = item.decision || ''; }
    setEditForm(form);
    setEditModal({ open: true, type, item });
  };

  const handleEditSave = async () => {
    const { type, item } = editModal;
    if (!item) return;
    try {
      const eType = type === 'user' ? 'users' : `${type}s`;
      const endpoint = `/admin/${eType}/${item.id}`;
      const payload = { ...editForm };
      if (payload.budget) payload.budget = parseFloat(payload.budget);
      if (payload.bid_amount) payload.bid_amount = parseFloat(payload.bid_amount);
      if (payload.total_amount) payload.total_amount = parseFloat(payload.total_amount);
      if (payload.hourly_rate) payload.hourly_rate = parseFloat(payload.hourly_rate);
      await api.put(endpoint, payload);
      setEditModal({ open: false, type: '', item: null });
      showToast(`${type} updated`, 'success');
      loadEntities(tab);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update', 'error');
    }
  };

  const confirmDelete = (type, id) => {
    setDeleteModal({ open: true, type, id });
  };

  const handleDelete = async () => {
    const { type, id } = deleteModal;
    if (!id) return;
    try {
      const eType = type === 'user' ? 'users' : `${type}s`;
      const endpoint = `/admin/${eType}/${id}`;
      await api.delete(endpoint);
      setDeleteModal({ open: false, type: '', id: null });
      showToast(`${type} deleted`, 'success');
      loadEntities(tab);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete', 'error');
    }
  };

  const filtered = (items, fields) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item => fields.some(f => (item[f] || '').toString().toLowerCase().includes(q)));
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div className="admin-spinner" style={{ margin: '0 auto 16px' }} />
      <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading admin panel...</div>
    </div>
  );

  return (
    <div className="admin-panel-layout">
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="nav-logo-icon" style={{ marginRight: 8, fontSize: 18 }}>◈</span>
          <strong>FreeLedger</strong>
          <span className="admin-badge">Admin</span>
        </div>
        <div className="admin-topbar-right">
          <span style={{ fontSize: 12, opacity: 0.7 }}>{state.user?.username || state.walletAddress?.slice(0, 8) || 'Admin'}</span>
          <button className="btn btn-outline btn-sm" onClick={async () => { await logout(); window.location.href = '/login'; }}>Logout</button>
        </div>
      </div>
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>Admin Panel</h1>
          <p className="page-sub">Manage platform users, jobs, contracts, and disputes</p>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card accent-card">
            <div className="s-top"><span className="s-label">Users</span><div className="s-icon">👥</div></div>
            <div className="s-val">{stats.total_users}</div>
            <div className="s-sub">Registered</div>
          </div>
          <div className="stat-card">
            <div className="s-top"><span className="s-label">Jobs</span><div className="s-icon">📋</div></div>
            <div className="s-val">{stats.total_jobs}</div>
            <div className="s-sub">Total created</div>
          </div>
          <div className="stat-card">
            <div className="s-top"><span className="s-label">Contracts</span><div className="s-icon">📄</div></div>
            <div className="s-val">{stats.total_contracts}</div>
            <div className="s-sub">{stats.total_volume_eth?.toFixed(2)} ETH volume</div>
          </div>
          <div className="stat-card">
            <div className="s-top"><span className="s-label">Disputes</span><div className="s-icon">⚖️</div></div>
            <div className="s-val">{stats.active_disputes}</div>
            <span className="s-badge" style={stats.active_disputes > 0 ? { background: '#fef2f2', color: '#dc2626' } : {}}>
              {stats.active_disputes > 0 ? 'Active' : 'All clear'}
            </span>
          </div>
        </div>
      )}

      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`admin-tab ${tab === t ? 'active' : ''}`}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="Search current tab..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      {tab !== 'dashboard' && tab !== 'messages' && (
        <div className="admin-filter-row">
          <select value={filters[tab] || ''} onChange={e => {
            setFilters(prev => ({ ...prev, [tab]: e.target.value }));
            setPage(prev => ({ ...prev, [tab]: 1 }));
          }}>
            <option value="">All {tab}</option>
            {tab === 'users' && ['admin', 'client', 'freelancer'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
            {['jobs', 'proposals', 'contracts', 'disputes'].includes(tab) && (
              ['open', 'pending', 'active', 'completed', 'cancelled', 'disputed', 'resolved', 'rejected'].filter(s =>
                (tab === 'jobs' && ['open', 'closed', 'cancelled', 'filled'].includes(s)) ||
                (tab === 'proposals' && ['pending', 'accepted', 'rejected', 'withdrawn'].includes(s)) ||
                (tab === 'contracts' && ['draft', 'pending_review', 'pending_signatures', 'pending_funding', 'active', 'delivered', 'revision_requested', 'completed', 'cancelled', 'disputed'].includes(s)) ||
                (tab === 'disputes' && ['open', 'resolved'].includes(s))
              ).map(s => <option key={s} value={s}>{s}</option>)
            )}
          </select>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="admin-section">
          <div className="two-col">
            <div className="card">
              <div className="card-header"><h3>Platform Fees</h3></div>
              <div className="card-body">
                <div className="cs-val" style={{ fontSize: 32 }}>{stats?.platform_fees_accumulated?.toFixed(4)} ETH</div>
                <div className="cs-lbl">Accumulated (2.5% fee)</div>
              </div>
            </div>
              <div className="card">
              <div className="card-header"><h3>Role Distribution</h3></div>
              <div className="card-body">
                {(stats?.role_counts ? ['admin', 'client', 'freelancer'] : []).map(r => (
                  <div key={r} className="project-row" style={{ border: 'none' }}>
                    <div className="project-row-top">
                      <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{r}s</span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{stats?.role_counts?.[r] || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3>Users ({users.length})</h3>
            <button className="btn btn-sm btn-primary" onClick={() => openCreate('users')}>+ Add User</button>
          </div>
          {filtered(users, ['username', 'email', 'role']).map(u => (
            <div key={u.id} className="project-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                  {(u.username?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username || 'Unnamed'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.email || 'no email'} <span className={`role-badge ${u.role}`} style={{ marginLeft: 6 }}>{u.role}</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: u.is_active ? 'var(--green)' : 'var(--text-3)' }} title={u.is_active ? 'User can log in and use the platform' : 'User cannot log in or perform actions'}>
                  {u.is_active ? 'Active' : 'Suspended'}
                </span>
                <button className="btn btn-sm btn-outline" onClick={() => toggleUserActive(u.id, !u.is_active)}>
                  {u.is_active ? 'Suspend' : 'Activate'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit('user', u)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => confirmDelete('user', u.id)}>Del</button>
              </div>
            </div>
          ))}
          <div className="admin-pagination">
            <button disabled={page.users <= 1} onClick={() => setPage(p => ({ ...p, users: p.users - 1 }))}>←</button>
            {Array.from({ length: Math.min(totalPages.users, 10) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page.users === n ? 'active' : ''} onClick={() => setPage(p => ({ ...p, users: n }))}>{n}</button>
            ))}
            <button disabled={page.users >= totalPages.users} onClick={() => setPage(p => ({ ...p, users: p.users + 1 }))}>→</button>
          </div>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3>Jobs ({jobs.length})</h3>
            <button className="btn btn-sm btn-primary" onClick={() => openCreate('jobs')}>+ Add Job</button>
          </div>
          {filtered(jobs, ['title', 'status', 'category']).map(j => (
            <div key={j.id} className="project-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{j.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {j.budget} ETH | {j.category || 'uncategorized'} | <span className={`role-badge ${j.status}`}>{j.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                  {j.status === 'open' && (
                    <button className="btn btn-sm btn-outline" onClick={() => withConfirm(`Close job "${j.title}"?`, () => updateJob(j.id, { status: 'closed' }))}>Close</button>
                  )}
                  {j.status === 'closed' && (
                    <button className="btn btn-sm btn-outline" onClick={() => withConfirm(`Reopen job "${j.title}"?`, () => updateJob(j.id, { status: 'open' }))}>Reopen</button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit('job', j)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => confirmDelete('job', j.id)}>Del</button>
              </div>
            </div>
          ))}
          <div className="admin-pagination">
            <button disabled={page.jobs <= 1} onClick={() => setPage(p => ({ ...p, jobs: p.jobs - 1 }))}>←</button>
            {Array.from({ length: Math.min(totalPages.jobs, 10) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page.jobs === n ? 'active' : ''} onClick={() => setPage(p => ({ ...p, jobs: n }))}>{n}</button>
            ))}
            <button disabled={page.jobs >= totalPages.jobs} onClick={() => setPage(p => ({ ...p, jobs: p.jobs + 1 }))}>→</button>
          </div>
        </div>
      )}

      {tab === 'proposals' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3>Proposals ({proposals.length})</h3>
            <button className="btn btn-sm btn-primary" onClick={() => openCreate('proposals')}>+ Add Proposal</button>
          </div>
          {filtered(proposals, ['job_title', 'freelancer_name', 'status', 'bid_amount']).map(p => (
            <div key={p.id} className="project-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.job_title || 'Unknown Job'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {p.freelancer_name || p.freelancer_id?.slice(0, 12)} | {p.bid_amount} ETH | {p.estimated_days ? `${p.estimated_days} days` : ''} | <span className={`role-badge ${p.status}`}>{p.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit('proposal', p)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => confirmDelete('proposal', p.id)}>Del</button>
              </div>
            </div>
          ))}
          <div className="admin-pagination">
            <button disabled={page.proposals <= 1} onClick={() => setPage(p => ({ ...p, proposals: p.proposals - 1 }))}>←</button>
            {Array.from({ length: Math.min(totalPages.proposals, 10) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page.proposals === n ? 'active' : ''} onClick={() => setPage(p => ({ ...p, proposals: n }))}>{n}</button>
            ))}
            <button disabled={page.proposals >= totalPages.proposals} onClick={() => setPage(p => ({ ...p, proposals: p.proposals + 1 }))}>→</button>
          </div>
        </div>
      )}

      {tab === 'contracts' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3>Contracts ({contracts.length})</h3>
            <button className="btn btn-sm btn-primary" onClick={() => openCreate('contracts')}>+ Add Contract</button>
          </div>
          {filtered(contracts, ['title', 'client_name', 'freelancer_name', 'status']).map(c => (
            <div key={c.id} className="project-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.title || c.id?.slice(0, 16)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {c.client_name} → {c.freelancer_name} | {c.total_amount} ETH | <span className={`role-badge ${c.status}`}>{c.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {c.status !== 'completed' && c.status !== 'cancelled' && (
                  <>
                    <button className="btn btn-sm btn-success" onClick={() => withConfirm(`Mark contract "${c.title}" as completed?`, () => updateContract(c.id, 'completed'))}>Complete</button>
                    <button className="btn btn-sm btn-danger" onClick={() => withConfirm(`Cancel contract "${c.title}"? This cannot be undone.`, () => updateContract(c.id, 'cancelled'))}>Cancel</button>
                  </>
                )}
                <button className="btn btn-sm btn-outline" onClick={() => openEdit('contract', c)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => confirmDelete('contract', c.id)}>Del</button>
              </div>
            </div>
          ))}
          <div className="admin-pagination">
            <button disabled={page.contracts <= 1} onClick={() => setPage(p => ({ ...p, contracts: p.contracts - 1 }))}>←</button>
            {Array.from({ length: Math.min(totalPages.contracts, 10) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page.contracts === n ? 'active' : ''} onClick={() => setPage(p => ({ ...p, contracts: n }))}>{n}</button>
            ))}
            <button disabled={page.contracts >= totalPages.contracts} onClick={() => setPage(p => ({ ...p, contracts: p.contracts + 1 }))}>→</button>
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="admin-section">
          <h3>Disputes ({disputes.length})</h3>
          {disputes.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✅</div><h3>No disputes</h3><p>All clear.</p></div>
          ) : (
            filtered(disputes, ['reason', 'status', 'raised_by']).map(d => (
              <div key={d.id} className="dispute-card">
                <div className="dispute-header">
                  <span style={{ fontWeight: 600 }}>Contract: {d.contract_id?.slice(0, 12)}...</span>
                  <span className={`status-badge status-${d.status === 'open' ? 'pending' : 'completed'}`}>{d.status}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)' }}><strong>Raised by:</strong> {d.raised_by} — <strong>Reason:</strong> {d.reason}</p>
                {d.status === 'open' && (
                  <div className="dispute-actions">
                    <button onClick={() => resolveDispute(d.id, 'release')} className="btn btn-sm btn-success">Release to Freelancer</button>
                    <button onClick={() => resolveDispute(d.id, 'refund')} className="btn btn-sm btn-danger">Refund Client</button>
                  </div>
                )}
                {d.status === 'resolved' && <span className="badge badge-completed">Decision: {d.decision}</span>}
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit('dispute', d)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => confirmDelete('dispute', d.id)}>Del</button>
                </div>
              </div>
            ))
          )}
          <div className="admin-pagination">
            <button disabled={page.disputes <= 1} onClick={() => setPage(p => ({ ...p, disputes: p.disputes - 1 }))}>←</button>
            {Array.from({ length: Math.min(totalPages.disputes, 10) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page.disputes === n ? 'active' : ''} onClick={() => setPage(p => ({ ...p, disputes: n }))}>{n}</button>
            ))}
            <button disabled={page.disputes >= totalPages.disputes} onClick={() => setPage(p => ({ ...p, disputes: p.disputes + 1 }))}>→</button>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="admin-section">
          <h3>Messages ({messages.length})</h3>
          {filtered(messages, ['content', 'sender_id', 'receiver_id']).map(m => {
            const sender = userCache[m.sender_id];
            const receiver = userCache[m.receiver_id];
            return (
            <div key={m.id} className="project-row" style={{ border: 'none', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  <strong>{sender?.username || m.sender_id?.slice(0, 12)}</strong> → <strong>{receiver?.username || m.receiver_id?.slice(0, 12)}</strong>
                  <span style={{ marginLeft: 8 }} className={`role-badge ${sender?.role || ''}`}>{sender?.role || ''}</span>
                  <span style={{ marginLeft: 8, color: 'var(--text-3)' }}>{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 2 }}>{m.content}</div>
              </div>
              <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => confirmDelete('message', m.id)}>Del</button>
            </div>
            );
          })}
          <div className="admin-pagination">
            <button disabled={page.messages <= 1} onClick={() => setPage(p => ({ ...p, messages: p.messages - 1 }))}>←</button>
            {Array.from({ length: Math.min(totalPages.messages, 10) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page.messages === n ? 'active' : ''} onClick={() => setPage(p => ({ ...p, messages: n }))}>{n}</button>
            ))}
            <button disabled={page.messages >= totalPages.messages} onClick={() => setPage(p => ({ ...p, messages: p.messages + 1 }))}>→</button>
          </div>
        </div>
      )}
      {createModal.open && (
        <div className="modal-overlay open" onClick={() => setCreateModal({ open: false, type: '' })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>New {createModal.type.slice(0, -1)}</h3>
              <button className="modal-close" onClick={() => setCreateModal({ open: false, type: '' })}>×</button>
            </div>
            <div className="modal-body">
              {createModal.type === 'users' && (
                <>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Username</label><input className="form-input" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Role</label>
                    <select className="form-input" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                      <option value="freelancer">Freelancer</option>
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Hourly Rate (ETH)</label><input className="form-input" type="number" step="0.01" value={createForm.hourly_rate} onChange={e => setCreateForm({ ...createForm, hourly_rate: e.target.value })} /></div>
                </>
              )}
              {createModal.type === 'jobs' && (
                <>
                  <UserSearchSelect label="Client" value={createForm.client_id} onChange={v => setCreateForm({ ...createForm, client_id: v })} role="client" placeholder="Search client by name or email..." />
                  <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Budget (ETH)</label><input className="form-input" type="number" step="0.01" value={createForm.budget} onChange={e => setCreateForm({ ...createForm, budget: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} /></div>
                </>
              )}
              {createModal.type === 'proposals' && (
                <>
                  <div className="form-group"><label className="form-label">Job ID</label><input className="form-input" value={createForm.job_id} onChange={e => setCreateForm({ ...createForm, job_id: e.target.value })} /></div>
                  <UserSearchSelect label="Freelancer" value={createForm.freelancer_id} onChange={v => setCreateForm({ ...createForm, freelancer_id: v })} role="freelancer" placeholder="Search freelancer by name or email..." />
                  <div className="form-group"><label className="form-label">Bid Amount (ETH)</label><input className="form-input" type="number" step="0.01" value={createForm.bid_amount} onChange={e => setCreateForm({ ...createForm, bid_amount: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Cover Letter</label><textarea className="form-input" rows={3} value={createForm.cover_letter} onChange={e => setCreateForm({ ...createForm, cover_letter: e.target.value })} /></div>
                </>
              )}
              {createModal.type === 'contracts' && (
                <>
                  <UserSearchSelect label="Client" value={createForm.client_id} onChange={v => setCreateForm({ ...createForm, client_id: v })} role="client" placeholder="Search client by name or email..." />
                  <UserSearchSelect label="Freelancer (optional)" value={createForm.freelancer_id} onChange={v => setCreateForm({ ...createForm, freelancer_id: v })} role="freelancer" placeholder="Search freelancer by name or email..." />
                  <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Total Amount (ETH)</label><input className="form-input" type="number" step="0.01" value={createForm.total_amount} onChange={e => setCreateForm({ ...createForm, total_amount: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} /></div>
                </>
              )}
              {createModal.type === 'disputes' && (
                <>
                  <div className="form-group"><label className="form-label">Contract ID</label><input className="form-input" value={createForm.contract_id} onChange={e => setCreateForm({ ...createForm, contract_id: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Raised By</label><input className="form-input" value={createForm.raised_by} onChange={e => setCreateForm({ ...createForm, raised_by: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Reason</label><textarea className="form-input" rows={3} value={createForm.reason} onChange={e => setCreateForm({ ...createForm, reason: e.target.value })} /></div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCreateModal({ open: false, type: '' })}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
      {editModal.open && (
        <div className="modal-overlay open" onClick={() => setEditModal({ open: false, type: '', item: null })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Edit {editModal.type}</h3>
              <button className="modal-close" onClick={() => setEditModal({ open: false, type: '', item: null })}>×</button>
            </div>
            <div className="modal-body">
              {Object.keys(editForm).map(key => {
                const isEnum = ['role', 'status', 'decision', 'experience_level'].includes(key);
                const isLongText = ['bio', 'description', 'cover_letter', 'reason'].includes(key);
                const isNumber = ['budget', 'bid_amount', 'total_amount', 'hourly_rate', 'estimated_days', 'duration_days'].includes(key);
                const isBool = typeof editForm[key] === 'boolean';

                let enumOptions = null;
                if (key === 'role') enumOptions = ['admin', 'client', 'freelancer'];
                if (key === 'status' && editModal.type === 'dispute') enumOptions = ['open', 'under_review', 'resolved'];
                if (key === 'status' && editModal.type === 'contract') enumOptions = ['draft', 'pending_review', 'pending_signatures', 'pending_funding', 'active', 'delivered', 'revision_requested', 'completed', 'cancelled', 'disputed'];
                if (key === 'decision') enumOptions = ['refund', 'release'];

                return (
                  <div key={key} className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label" style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</label>
                    {isBool ? (
                      <select className="form-input" value={editForm[key] ? 'true' : 'false'}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value === 'true' })}>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : enumOptions ? (
                      <select className="form-input" value={editForm[key] || ''}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}>
                        {enumOptions.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                      </select>
                    ) : isLongText ? (
                      <textarea className="form-input" rows={4} value={editForm[key] || ''}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
                    ) : isNumber ? (
                      <input className="form-input" type="number" step="0.01" value={editForm[key] || ''}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
                    ) : (
                      <input className="form-input" value={editForm[key] || ''}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditModal({ open: false, type: '', item: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {confirmAction.open && (
        <div className="modal-overlay open" onClick={() => setConfirmAction({ open: false, message: '', onConfirm: null })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Confirm Action</h3>
              <button className="modal-close" onClick={() => setConfirmAction({ open: false, message: '', onConfirm: null })}>×</button>
            </div>
            <div className="modal-body">
              <p>{confirmAction.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmAction({ open: false, message: '', onConfirm: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmAction.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {deleteModal.open && (
        <div className="modal-overlay open" onClick={() => setDeleteModal({ open: false, type: '', id: null })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={() => setDeleteModal({ open: false, type: '', id: null })}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this {deleteModal.type}? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteModal({ open: false, type: '', id: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
    </div>
  );
}
