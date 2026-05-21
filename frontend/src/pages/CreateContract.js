import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
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
    setForm({
      ...form,
      milestones: [...form.milestones, { description: '', amount: '', due_date: '' }],
    });
  };

  const removeMilestone = (i) => {
    const ms = form.milestones.filter((_, idx) => idx !== i);
    setForm({ ...form, milestones: ms });
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
        <Sidebar />
        <main className="main-content">
          <div className="page-header">
            <h2>Create Contract</h2>
          </div>
          <form onSubmit={handleSubmit} className="contract-form">
            <div className="form-group">
              <label>Freelancer ID</label>
              <input
                type="text"
                value={form.freelancer_id}
                onChange={(e) => setForm({ ...form, freelancer_id: e.target.value })}
                placeholder="usr_..."
                required
              />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Total Amount (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="milestones-section">
              <h3>Milestones</h3>
              {form.milestones.map((ms, i) => (
                <div key={i} className="milestone-card">
                  <div className="milestone-header">
                    <span>Milestone {i + 1}</span>
                    {form.milestones.length > 1 && (
                      <button type="button" onClick={() => removeMilestone(i)} className="btn btn-sm btn-danger">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={ms.description}
                      onChange={(e) => updateMilestone(i, 'description', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Amount (ETH)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ms.amount}
                        onChange={(e) => updateMilestone(i, 'amount', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Due Date</label>
                      <input
                        type="date"
                        value={ms.due_date}
                        onChange={(e) => updateMilestone(i, 'due_date', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addMilestone} className="btn btn-outline btn-sm">
                + Add Milestone
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Contract'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
