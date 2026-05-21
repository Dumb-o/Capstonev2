import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loading from '../components/shared/Loading';
import { useContractDetail } from '../hooks/useContracts';
import { useApp } from '../context/AppContext';
import { signContract, approveMilestone, rejectMilestone } from '../services/contracts';

export default function ContractDetailPage() {
  const { id } = useParams();
  const { contract, loading, refresh } = useContractDetail(id);
  const { state } = useApp();

  if (loading) return <Loading />;
  if (!contract) return <div className="error-state">Contract not found</div>;

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

  const statusColors = {
    draft: '#6b7280',
    pending_signatures: '#f59e0b',
    active: '#10b981',
    completed: '#3b82f6',
    cancelled: '#ef4444',
    disputed: '#f97316',
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          <div className="contract-detail">
            <div className="detail-header">
              <div>
                <h2>{c.title}</h2>
                <span
                  className="status-badge"
                  style={{ background: statusColors[c.status] || '#6b7280' }}
                >
                  {c.status}
                </span>
              </div>
              <div className="detail-actions">
                {c.status === 'pending_signatures' && (
                  <button onClick={handleSign} className="btn btn-primary">
                    {isClient && !c.client_signed
                      ? 'Sign as Client'
                      : isFreelancer && !c.freelancer_signed
                      ? 'Sign as Freelancer'
                      : 'Signed'}
                  </button>
                )}
              </div>
            </div>

            <div className="detail-meta">
              <div><strong>Amount:</strong> {c.total_amount} ETH</div>
              <div><strong>Client:</strong> {c.client_id}</div>
              <div><strong>Freelancer:</strong> {c.freelancer_id}</div>
              {c.deadline && <div><strong>Deadline:</strong> {new Date(c.deadline).toLocaleDateString()}</div>}
              {c.terms_cid && (
                <div>
                  <strong>Terms CID:</strong>{' '}
                  <a href={`http://localhost:8080/ipfs/${c.terms_cid}`} target="_blank" rel="noopener noreferrer">
                    {c.terms_cid.slice(0, 20)}...
                  </a>
                </div>
              )}
            </div>

            {c.description && (
              <div className="detail-description">
                <h3>Description</h3>
                <p>{c.description}</p>
              </div>
            )}

            <div className="milestones-section">
              <h3>Milestones ({milestones?.length || 0})</h3>
              {milestones?.map((ms) => (
                <div key={ms.id} className={`milestone-card milestone-${ms.status}`}>
                  <div className="milestone-header">
                    <span className="milestone-index">#{ms.index + 1}</span>
                    <span className="milestone-status">{ms.status}</span>
                  </div>
                  <p className="milestone-desc">{ms.description}</p>
                  <div className="milestone-meta">
                    <span>{ms.amount} ETH</span>
                    {ms.due_date && <span>Due: {new Date(ms.due_date).toLocaleDateString()}</span>}
                  </div>
                  {ms.deliverable_cid && (
                    <div className="milestone-deliverable">
                      <a href={`http://localhost:8080/ipfs/${ms.deliverable_cid}`} target="_blank" rel="noopener noreferrer">
                        View Deliverable
                      </a>
                    </div>
                  )}
                  {isClient && ms.status === 'submitted' && (
                    <div className="milestone-actions">
                      <button onClick={() => handleApprove(ms.index)} className="btn btn-sm btn-success">
                        Approve
                      </button>
                      <button onClick={() => handleReject(ms.index)} className="btn btn-sm btn-danger">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {dispute && (
              <div className="dispute-section">
                <h3>Dispute</h3>
                <p><strong>Reason:</strong> {dispute.reason}</p>
                <p><strong>Status:</strong> {dispute.status}</p>
                {dispute.decision && <p><strong>Decision:</strong> {dispute.decision}</p>}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
