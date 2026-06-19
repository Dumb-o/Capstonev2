import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { createContract } from '../services/contracts';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';

export default function CreateContract() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [form, setForm] = useState({
    freelancer_id: '',
    title: '',
    description: '',
    total_amount: '',
    deadline: '',
    milestones: [{ description: '', amount: '', due_date: '' }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [freelancers, setFreelancers] = useState([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    api.get('/users', { params: { role: 'freelancer', limit: 100 } })
      .then(({ data }) => setFreelancers(data.users || []))
      .catch(() => console.warn('Failed to load freelancers'));
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredFreelancers = freelancers.filter((f) =>
    (f.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectFreelancer = (f) => {
    setForm({ ...form, freelancer_id: f.id });
    setSearch(f.username || f.id);
    setShowDropdown(false);
  };

  const addMilestone = () => {
    setForm({ ...form, milestones: [...form.milestones, { description: '', amount: '', due_date: '' }] });
  };

  const removeMilestone = (i) => {
    setForm({ ...form, milestones: form.milestones.filter((_, idx) => idx !== i) });
  };

  const updateMilestone = (i, field, value) => {
    const ms = [...form.milestones];
    ms[i][field] = value;
    setForm({ ...form, milestones: ms });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        freelancer_id: form.freelancer_id || null,
        title: form.title,
        description: form.description,
        total_amount: parseFloat(form.total_amount),
        deadline: form.deadline || null,
        milestones: form.milestones.map((m) => ({
          description: m.description,
          amount: parseFloat(m.amount),
          due_date: m.due_date || null,
        })),
      };
      const contract = await createContract(data);
      navigate(`/contracts/${contract.id}`);
    } catch (err) {
      showToast(dispatch, err.response?.data?.detail || 'Failed to create contract', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            <div className="page-header">
              <div>
                <h1 className="page-title">Create Contract</h1>
                <p className="page-sub">Set up a new <span>milestone-based contract</span></p>
              </div>
            </div>

            <div className="card" style={{ padding: 24, maxWidth: 700 }}>
              <form onSubmit={handleSubmit}>
                <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
                  <label className="form-label">Freelancer <span className="text-muted">(optional)</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setForm({ ...form, freelancer_id: '' }); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search freelancers by name or ID..."
                  />
                  {showDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 8, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}>
                      {filteredFreelancers.length === 0 ? (
                        <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13 }}>No freelancers found</div>
                      ) : (
                        filteredFreelancers.map((f) => (
                          <div key={f.id} onClick={() => selectFreelancer(f)}
                            style={{
                              padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                              borderBottom: '1px solid var(--border)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 500 }}>{f.username || 'Unnamed'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.id}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contract title" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe the work..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Total Amount (ETH)</label>
                    <input className="form-input" type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input className="form-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                </div>

                <div className="milestones-section">
                  <h3>Milestones</h3>
                  {form.milestones.map((ms, i) => (
                    <div key={i} className="milestone-card">
                      <div className="milestone-header">
                        <span>Milestone {i + 1}</span>
                        {form.milestones.length > 1 && (
                          <button type="button" onClick={() => removeMilestone(i)} className="btn btn-sm btn-danger">Remove</button>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input className="form-input" type="text" value={ms.description} onChange={(e) => updateMilestone(i, 'description', e.target.value)} required />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Amount (ETH)</label>
                          <input className="form-input" type="number" step="0.01" value={ms.amount} onChange={(e) => updateMilestone(i, 'amount', e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Due Date</label>
                          <input className="form-input" type="date" value={ms.due_date} onChange={(e) => updateMilestone(i, 'due_date', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addMilestone} className="btn btn-outline btn-sm">+ Add Milestone</button>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 16 }}>
                  {submitting ? 'Creating...' : 'Create Contract'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
