import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Loading from '../components/shared/Loading';
import { useContractDetail } from '../hooks/useContracts';
import { useApp } from '../context/AppContext';
import { signContract, approveMilestone, rejectMilestone } from '../services/contracts';
import api from '../services/api';

export default function ContractDetailPage() {
  const { id } = useParams();
  const { contract, loading, refresh } = useContractDetail(id);
  const { state } = useApp();
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSending, setDisputeSending] = useState(false);
  const [disputeError, setDisputeError] = useState('');

  if (loading) return <Loading />;
  if (!contract) return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Contract not found</h3>
              <p>The contract you're looking for doesn't exist.</p>
              <Link to="/contracts" className="btn btn-primary">View Contracts</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  const { contract: c, milestones, dispute } = contract;
  const isClient = state.user?.id === c.client_id;
  const isFreelancer = state.user?.id === c.freelancer_id;

  const handleSign = async () => {
    try {
      await signContract(c.id);
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to sign');
    }
  };

  const handleApprove = async (milestoneIndex) => {
    try {
      await approveMilestone(c.id, milestoneIndex);
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async (milestoneIndex) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await rejectMilestone(c.id, milestoneIndex, reason);
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) { setDisputeError('Please provide a reason'); return; }
    setDisputeSending(true);
    setDisputeError('');
    try {
      await api.post(`/contracts/${c.id}/disputes`, {
        raised_by: isClient ? 'client' : 'freelancer',
        reason: disputeReason,
      });
      setShowDisputeModal(false);
      setDisputeReason('');
      refresh();
    } catch (err) {
      setDisputeError(err.response?.data?.detail || 'Failed to raise dispute');
    }
    setDisputeSending(false);
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            <div className="page-header">
              <div>
                <h1 className="page-title">{c.title}</h1>
                <p className="page-sub" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`status-badge status-${c.status === 'active' ? 'active' : c.status === 'pending_signatures' || c.status === 'pending_funding' ? 'pending' : c.status === 'completed' ? 'completed' : c.status === 'disputed' ? 'disputed' : c.status === 'delivered' ? 'active' : 'draft'}`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                  <span>{c.total_amount} ETH</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/contracts" className="btn btn-outline btn-sm">← Back</Link>
                {c.status === 'pending_signatures' && (
                  <button onClick={handleSign} className="btn btn-primary btn-sm">
                    {isClient && !c.client_signed ? 'Sign as Client'
                      : isFreelancer && !c.freelancer_signed ? 'Sign as Freelancer'
                      : 'Signed'}
                  </button>
                )}
                {c.status === 'active' && !dispute && (
                  <button onClick={() => setShowDisputeModal(true)} className="btn btn-sm btn-danger">
                    Raise Dispute
                  </button>
                )}
              </div>
            </div>

            <div className="two-col">
              <div>
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header"><h3>Contract Details</h3></div>
                  <div className="card-body">
                    <div className="detail-meta" style={{ border: 'none', padding: 0, marginBottom: 0, gridTemplateColumns: '1fr 1fr' }}>
                      <div><strong style={{ fontSize: 12, color: 'var(--text-3)' }}>Amount</strong><br /><span style={{ fontWeight: 700, fontSize: 18 }}>{c.total_amount} ETH</span></div>
                      <div><strong style={{ fontSize: 12, color: 'var(--text-3)' }}>Status</strong><br />
                        <span className={`badge ${c.status === 'active' ? 'badge-active' : c.status === 'completed' ? 'badge-completed' : c.status === 'pending_signatures' || c.status === 'pending_funding' ? 'badge-pending' : 'badge-draft'}`}>
                          {c.status}
                        </span>
                      </div>
                      <div><strong style={{ fontSize: 12, color: 'var(--text-3)' }}>Client</strong><br /><span style={{ fontSize: 13 }}>{c.client_name || c.client_id?.slice(0, 16)}</span></div>
                      <div><strong style={{ fontSize: 12, color: 'var(--text-3)' }}>Freelancer</strong><br /><span style={{ fontSize: 13 }}>{c.freelancer_name || c.freelancer_id?.slice(0, 16)}</span></div>
                      {c.job_id && <div><strong style={{ fontSize: 12, color: 'var(--text-3)' }}>Job</strong><br /><Link to={`/jobs/${c.job_id}`} style={{ fontSize: 13 }}>{c.job_title || 'View Job'}</Link></div>}
                      {c.deadline && <div><strong style={{ fontSize: 12, color: 'var(--text-3)' }}>Deadline</strong><br /><span style={{ fontSize: 13 }}>{new Date(c.deadline).toLocaleDateString()}</span></div>}
                      {c.terms_cid && (
                        <div><strong style={{ fontSize: 12, color: 'var(--text-3)' }}>Terms CID</strong><br />
                          <a href={`http://localhost:8080/ipfs/${c.terms_cid}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                            {c.terms_cid.slice(0, 20)}...
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {c.description && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header"><h3>Description</h3></div>
                    <div className="card-body">
                      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{c.description}</p>
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="card-header"><h3>Milestones ({milestones?.length || 0})</h3></div>
                  <div className="card-body">
                    {milestones?.map((ms) => (
                      <div key={ms.id} className="project-row">
                        <div className="project-row-top">
                          <span className="project-name">#{ms.index + 1} {ms.description}</span>
                          <span className={`badge ${ms.status === 'approved' ? 'badge-active' : ms.status === 'submitted' ? 'badge-pending' : ms.status === 'rejected' ? 'badge-draft' : 'badge-pending'}`}>
                            {ms.status}
                          </span>
                        </div>
                        <div className="milestone-label">
                          <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{ms.amount} ETH</span>
                          {ms.due_date && <span style={{ marginLeft: 16 }}>Due: {new Date(ms.due_date).toLocaleDateString()}</span>}
                        </div>
                        {ms.deliverable_cid && (
                          <div style={{ marginTop: 6 }}>
                            <a href={`http://localhost:8080/ipfs/${ms.deliverable_cid}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">View Deliverable</a>
                          </div>
                        )}
                        {isClient && ms.status === 'submitted' && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button onClick={() => handleApprove(ms.index)} className="btn btn-sm btn-success">Approve</button>
                            <button onClick={() => handleReject(ms.index)} className="btn btn-sm btn-danger">Reject</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!milestones || milestones.length === 0) && (
                      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No milestones defined.</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                {dispute && (
                  <div className="card" style={{ marginBottom: 20, borderColor: '#fde68a' }}>
                    <div className="card-header"><h3 style={{ color: '#92400e' }}>⚠ Dispute</h3></div>
                    <div className="card-body">
                      <p style={{ fontSize: 14, marginBottom: 8 }}><strong>Reason:</strong> {dispute.reason}</p>
                      <p style={{ fontSize: 14, marginBottom: 8 }}><strong>Status:</strong> <span className={`badge ${dispute.status === 'resolved' ? 'badge-completed' : 'badge-pending'}`}>{dispute.status}</span></p>
                      {dispute.decision && <p style={{ fontSize: 14 }}><strong>Decision:</strong> {dispute.decision}</p>}
                    </div>
                  </div>
                )}

                <div className="escrow-box">
                  <h4>Escrow</h4>
                  <div className="escrow-amount">{c.total_amount} ETH</div>
                  <div className="escrow-sub">Secured in smart contract</div>
                </div>
              </div>
            </div>
          </div>

          {showDisputeModal && (
            <div className="modal-overlay" onClick={() => { setShowDisputeModal(false); setDisputeError(''); }}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Raise Dispute</h3>
                  <button className="modal-close" onClick={() => { setShowDisputeModal(false); setDisputeError(''); }}>×</button>
                </div>
                <div className="modal-body">
                  <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
                    This will mark the contract as <strong>disputed</strong> and notify the platform admin.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Reason for dispute</label>
                    <textarea className="form-input" rows={4} value={disputeReason}
                      onChange={e => setDisputeReason(e.target.value)}
                      placeholder="Describe the issue clearly..." />
                  </div>
                  {disputeError && <div className="error-message">{disputeError}</div>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => { setShowDisputeModal(false); setDisputeError(''); }}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleRaiseDispute} disabled={disputeSending || !disputeReason.trim()}>
                    {disputeSending ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
