import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ContractForm = ({ onDeploy, isDeploying }) => {
  const [formData, setFormData] = useState({
    title: '',
    client: '0xa20a773b296C4bCd55a2f9194Aa51A09301c0Ee6',
    freelancer: '0x1234567890abcdef1234567890abcdef12345678',
    totalAmount: '',
    duration: '',
    milestones: 1,
    milestoneDescriptions: ['']
  });

  const amountPerMilestone = useMemo(() => {
    const total = parseFloat(formData.totalAmount) || 0;
    const count = parseInt(formData.milestones) || 1;
    return count > 0 ? (total / count).toFixed(3) : '0.000';
  }, [formData.totalAmount, formData.milestones]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMilestonesChange = useCallback((value) => {
    const count = Math.max(1, Math.min(10, parseInt(value) || 1));
    const descriptions = Array(count).fill('').map((_, i) => 
      formData.milestoneDescriptions[i] || `Milestone ${i + 1}`
    );
    setFormData(prev => ({
      ...prev,
      milestones: count,
      milestoneDescriptions: descriptions
    }));
  }, [formData.milestoneDescriptions]);

  const handleMilestoneDescChange = useCallback((index, value) => {
    setFormData(prev => {
      const newDescs = [...prev.milestoneDescriptions];
      newDescs[index] = value;
      return { ...prev, milestoneDescriptions: newDescs };
    });
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.totalAmount || !formData.duration) {
      return;
    }

    onDeploy({
      ...formData,
      totalAmount: parseFloat(formData.totalAmount),
      duration: parseInt(formData.duration),
      amountPerMilestone: parseFloat(amountPerMilestone)
    });

    setFormData({
      title: '',
      client: '0xa20a773b296C4bCd55a2f9194Aa51A09301c0Ee6',
      freelancer: '0x1234567890abcdef1234567890abcdef12345678',
      totalAmount: '',
      duration: '',
      milestones: 1,
      milestoneDescriptions: ['']
    });
  }, [formData, amountPerMilestone, onDeploy]);

  return (
    <div className="contract-form">
      <div className="form-header">
        <div className="form-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div>
          <h3>Deploy Smart Contract</h3>
          <p>Configure and deploy to the blockchain</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        <div className="form-group">
          <label className="form-label">Contract Title</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., DeFi Dashboard Development"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Client Address</label>
            <input
              type="text"
              className="form-input form-input-mono"
              placeholder="0x..."
              value={formData.client}
              onChange={(e) => handleChange('client', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Freelancer Address</label>
            <input
              type="text"
              className="form-input form-input-mono"
              placeholder="0x..."
              value={formData.freelancer}
              onChange={(e) => handleChange('freelancer', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Total Amount (ETH)</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              className="form-input"
              placeholder="0.00"
              value={formData.totalAmount}
              onChange={(e) => handleChange('totalAmount', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Duration (Days)</label>
            <input
              type="number"
              min="1"
              className="form-input"
              placeholder="30"
              value={formData.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Number of Milestones
            <span className="form-hint">1-10 milestones</span>
          </label>
          <input
            type="number"
            min="1"
            max="10"
            className="form-input"
            value={formData.milestones}
            onChange={(e) => handleMilestonesChange(e.target.value)}
          />
        </div>

        <div className="milestone-summary">
          <div className="milestone-summary-item">
            <span>Amount per Milestone</span>
            <span className="milestone-summary-value">{amountPerMilestone} ETH</span>
          </div>
          <div className="milestone-summary-item">
            <span>Platform Fee (2.5%)</span>
            <span className="milestone-summary-value">{(parseFloat(formData.totalAmount || 0) * 0.025).toFixed(3)} ETH</span>
          </div>
          <div className="milestone-summary-item milestone-summary-total">
            <span>Total Escrow</span>
            <span className="milestone-summary-value">{formData.totalAmount || '0'} ETH</span>
          </div>
        </div>

        <AnimatePresence>
          {formData.milestoneDescriptions.map((desc, index) => (
            <motion.div
              key={index}
              className="form-group milestone-desc-group"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <label className="form-label">Milestone {index + 1}</label>
              <input
                type="text"
                className="form-input"
                placeholder={`Description for milestone ${index + 1}`}
                value={desc}
                onChange={(e) => handleMilestoneDescChange(index, e.target.value)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          type="submit"
          className="btn-deploy"
          disabled={isDeploying || !formData.title || !formData.totalAmount || !formData.duration}
        >
          {isDeploying ? (
            <>
              <div className="deploy-spinner"></div>
              <span>Deploying to Blockchain...</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Deploy Smart Contract</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ContractForm;
