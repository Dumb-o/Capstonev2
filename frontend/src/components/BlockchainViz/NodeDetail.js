import React from 'react';
import { motion } from 'framer-motion';

const statusColors = {
  created: '#94a3b8',
  in_progress: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  disputed: '#f59e0b'
};

const statusLabels = {
  created: 'Created',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed'
};

const shortenAddress = (addr) => `${addr.slice(0, 10)}...${addr.slice(-8)}`;

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const NodeDetail = ({ contract, onClose }) => {
  const statusColor = statusColors[contract.status] || statusColors.created;

  return (
    <motion.div
      className="node-detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="node-detail-panel"
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-header">
          <div className="detail-title-area">
            <span className="detail-block-badge">Block #{contract.blockNumber}</span>
            <h3 className="detail-title">{contract.title}</h3>
          </div>
          <button className="detail-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="detail-status" style={{ background: statusColor + '15', borderColor: statusColor + '40' }}>
          <span className="detail-status-dot" style={{ background: statusColor }}></span>
          <span style={{ color: statusColor, fontWeight: 600 }}>{statusLabels[contract.status]}</span>
        </div>

        <div className="detail-section">
          <h4 className="detail-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Contract Details
          </h4>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Total Amount</span>
              <span className="detail-value highlight">{contract.totalAmount} ETH</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Duration</span>
              <span className="detail-value">{contract.duration} days</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Milestones</span>
              <span className="detail-value">{contract.milestones}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Per Milestone</span>
              <span className="detail-value">{contract.amountPerMilestone} ETH</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gas Used</span>
              <span className="detail-value">{contract.gasUsed.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">{formatDate(contract.timestamp)}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h4 className="detail-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Participants
          </h4>
          <div className="detail-participants">
            <div className="detail-participant">
              <div className="participant-icon client">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/>
                </svg>
              </div>
              <div className="participant-info">
                <span className="participant-role">Client</span>
                <span className="participant-address">{shortenAddress(contract.client)}</span>
              </div>
            </div>
            <div className="detail-participant">
              <div className="participant-icon freelancer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="participant-info">
                <span className="participant-role">Freelancer</span>
                <span className="participant-address">{shortenAddress(contract.freelancer)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h4 className="detail-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Milestones
          </h4>
          <div className="detail-milestones">
            {contract.milestoneDescriptions.map((desc, index) => (
              <div key={index} className="detail-milestone">
                <div className="milestone-number">{index + 1}</div>
                <div className="milestone-info">
                  <span className="milestone-desc">{desc || `Milestone ${index + 1}`}</span>
                  <span className="milestone-amount">{contract.amountPerMilestone} ETH</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <h4 className="detail-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
            Blockchain Data
          </h4>
          <div className="detail-hashes">
            <div className="detail-hash">
              <span className="hash-label">Block Hash</span>
              <span className="hash-value">{contract.hash}</span>
            </div>
            <div className="detail-hash">
              <span className="hash-label">Previous Hash</span>
              <span className="hash-value">{contract.prevHash}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NodeDetail;
