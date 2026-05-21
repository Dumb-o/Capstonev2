import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import BlockchainCanvas from './BlockchainCanvas';
import ContractForm from './ContractForm';
import NodeDetail from './NodeDetail';

const generateHash = () => {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

const initialContracts = [
  {
    id: 1,
    blockNumber: 10234,
    hash: '0x7a3f8b2c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    prevHash: '0x0000000000000000000000000000000000000000',
    title: 'DeFi Staking Platform',
    client: '0xa20a773b296C4bCd55a2f9194Aa51A09301c0Ee6',
    freelancer: '0x1234567890abcdef1234567890abcdef12345678',
    totalAmount: 2.5,
    duration: 60,
    milestones: 3,
    amountPerMilestone: 0.833,
    milestoneDescriptions: [
      'Smart Contract Development',
      'Frontend Integration',
      'Testing & Deployment'
    ],
    status: 'completed',
    timestamp: '2024-01-15T10:30:00Z',
    gasUsed: 234567
  },
  {
    id: 2,
    blockNumber: 10235,
    hash: '0x2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c',
    prevHash: '0x7a3f8b2c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    title: 'NFT Marketplace Frontend',
    client: '0xa20a773b296C4bCd55a2f9194Aa51A09301c0Ee6',
    freelancer: '0xabcdef1234567890abcdef1234567890abcdef12',
    totalAmount: 1.2,
    duration: 30,
    milestones: 2,
    amountPerMilestone: 0.6,
    milestoneDescriptions: [
      'UI Component Library',
      'Marketplace Integration'
    ],
    status: 'in_progress',
    timestamp: '2024-02-01T14:00:00Z',
    gasUsed: 189432
  },
  {
    id: 3,
    blockNumber: 10236,
    hash: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d',
    prevHash: '0x2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c',
    title: 'Smart Contract Audit',
    client: '0x1111222233334444555566667777888899990000',
    freelancer: '0x1234567890abcdef1234567890abcdef12345678',
    totalAmount: 0.8,
    duration: 14,
    milestones: 1,
    amountPerMilestone: 0.8,
    milestoneDescriptions: [
      'Full Security Audit Report'
    ],
    status: 'completed',
    timestamp: '2024-02-20T09:15:00Z',
    gasUsed: 156789
  },
  {
    id: 4,
    blockNumber: 10237,
    hash: '0x5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e',
    prevHash: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d',
    title: 'DApp UI/UX Design',
    client: '0xa20a773b296C4bCd55a2f9194Aa51A09301c0Ee6',
    freelancer: '0xabcdef1234567890abcdef1234567890abcdef12',
    totalAmount: 0.5,
    duration: 21,
    milestones: 3,
    amountPerMilestone: 0.167,
    milestoneDescriptions: [
      'Wireframes & Mockups',
      'Interactive Prototype',
      'Final Design System'
    ],
    status: 'created',
    timestamp: '2024-03-05T16:45:00Z',
    gasUsed: 143210
  }
];

const BlockchainViz = () => {
  const [contracts, setContracts] = useState(initialContracts);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeployContract = useCallback((formData) => {
    setIsDeploying(true);

    setTimeout(() => {
      const lastContract = contracts[contracts.length - 1];
      const newContract = {
        id: Date.now(),
        blockNumber: lastContract.blockNumber + 1,
        hash: generateHash(),
        prevHash: lastContract.hash,
        title: formData.title,
        client: formData.client,
        freelancer: formData.freelancer,
        totalAmount: formData.totalAmount,
        duration: formData.duration,
        milestones: formData.milestones,
        amountPerMilestone: formData.amountPerMilestone,
        milestoneDescriptions: formData.milestoneDescriptions,
        status: 'created',
        timestamp: new Date().toISOString(),
        gasUsed: Math.floor(Math.random() * 200000) + 100000
      };

      setContracts(prev => [...prev, newContract]);
      setIsDeploying(false);
    }, 1500);
  }, [contracts]);

  const handleSelectNode = useCallback((contract) => {
    setSelectedNode(contract);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="blockchain-viz-section" id="blockchain-viz">
      <div className="blockchain-viz-header">
        <div className="section-label">Live Demo</div>
        <h2 className="section-title">Blockchain Visualization</h2>
        <p className="section-sub">
          Create smart contracts and watch them get added to the blockchain in real-time. 
          Click any block to explore contract metadata.
        </p>
      </div>

      <div className="blockchain-viz-container">
        <div className="blockchain-canvas-wrapper">
          <BlockchainCanvas
            contracts={contracts}
            onSelectNode={handleSelectNode}
          />
        </div>

        <div className="blockchain-form-wrapper">
          <ContractForm
            onDeploy={handleDeployContract}
            isDeploying={isDeploying}
          />
        </div>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <NodeDetail
            contract={selectedNode}
            onClose={handleCloseDetail}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlockchainViz;
