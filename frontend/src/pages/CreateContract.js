import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { createContract } from '../services/contracts';

export default function CreateContract() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    freelancer_id: '',
    title: '',
    description: '',
    total_amount: '',
    deadline: '',
    milestones: [{ description: '', amount: '', due_date: '' }],
  });
  const [submitting, setSubmitting] = useState(false);

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
        freelancer_id: form.freelancer_id,
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
      alert(err.response?.data?.detail || 'Failed to create contract');
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
                <div className="form-group">
                  <label className="form-label">Freelancer ID</label>
                  <input className="form-input" type="text" value={form.freelancer_id} onChange={(e) => setForm({ ...form, freelancer_id: e.target.value })} placeholder="usr_..." required />
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
