import React, { useState } from 'react';
import api from '../../services/api';

const ALREADY_APPLIED_MSG = 'already proposed on this job';

export default function ProposalForm({ jobId, jobTitle, onClose, onSuccess }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError('Bid amount is required and must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/jobs/${jobId}/proposals`, {
        cover_letter: coverLetter || null,
        bid_amount: parseFloat(bidAmount),
        estimated_days: estimatedDays ? parseInt(estimatedDays) : null,
      });
      onSuccess('submitted');
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.toLowerCase().includes(ALREADY_APPLIED_MSG)) {
        onSuccess('already_applied');
      } else {
        setError(detail || 'Failed to submit proposal. Please try again.');
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: 4 }}>Apply for Job</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
          {jobTitle}
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Cover Letter</label>
            <textarea
              className="form-input"
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Introduce yourself and explain why you're a great fit for this project..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bid Amount (ETH) *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="0.5"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Days</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
                placeholder="14"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
