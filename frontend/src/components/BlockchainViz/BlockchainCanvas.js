import React, { useRef, useState, useCallback, useEffect } from 'react';
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

const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const BlockchainNode = ({ contract, index, total, onSelect, isLatest }) => {
  const statusColor = statusColors[contract.status] || statusColors.created;

  return (
    <motion.div
      className={`blockchain-node ${isLatest ? 'latest' : ''}`}
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.03, y: -4 }}
      onClick={() => onSelect(contract)}
    >
      <div className="node-header">
        <span className="node-block-number">Block #{contract.blockNumber}</span>
        <span className="node-status" style={{ background: statusColor + '20', color: statusColor }}>
          {statusLabels[contract.status]}
        </span>
      </div>

      <div className="node-body">
        <h4 className="node-title">{contract.title}</h4>
        <div className="node-meta">
          <div className="node-meta-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/>
            </svg>
            <span>Client: {shortenAddress(contract.client)}</span>
          </div>
          <div className="node-meta-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Freelancer: {shortenAddress(contract.freelancer)}</span>
          </div>
        </div>
        <div className="node-amount">{contract.totalAmount} ETH</div>
        <div className="node-milestones">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>{contract.milestones} milestone{contract.milestones !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="node-footer">
        <span className="node-hash">{contract.hash.slice(0, 18)}...</span>
      </div>

      {isLatest && (
        <motion.div
          className="node-pulse"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

const ChainLine = ({ isLatest }) => (
  <div className={`chain-connector ${isLatest ? 'latest' : ''}`}>
    <div className="chain-line"></div>
    <div className="chain-arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    </div>
    {isLatest && (
      <motion.div
        className="chain-pulse"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    )}
  </div>
);

const BlockchainCanvas = ({ contracts, onSelectNode }) => {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLatestAnimating, setIsLatestAnimating] = useState(false);

  useEffect(() => {
    if (contracts.length > 0) {
      setIsLatestAnimating(true);
      const timer = setTimeout(() => setIsLatestAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [contracts.length]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.3, Math.min(2, prev.scale + delta))
    }));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div
      ref={containerRef}
      className={`blockchain-canvas ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="canvas-controls">
        <button className="canvas-control-btn" onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(2, prev.scale + 0.1) }))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button className="canvas-control-btn" onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.3, prev.scale - 0.1) }))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button className="canvas-control-btn" onClick={handleResetView}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
        </button>
        <span className="canvas-zoom-level">{Math.round(transform.scale * 100)}%</span>
      </div>

      <div
        className="canvas-content"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'center top'
        }}
      >
        <div className="blockchain-chain">
          <div className="chain-genesis">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
            <span>Genesis</span>
          </div>

          {contracts.map((contract, index) => (
            <React.Fragment key={contract.id}>
              <ChainLine isLatest={index === contracts.length - 1 && isLatestAnimating} />
              <BlockchainNode
                contract={contract}
                index={index}
                total={contracts.length}
                onSelect={onSelectNode}
                isLatest={index === contracts.length - 1 && isLatestAnimating}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="canvas-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 9l4-4 4 4M5 15l4 4 4-4M19 9l-4-4-4 4M19 15l-4 4-4-4"/>
        </svg>
        <span>Drag to pan • Scroll to zoom • Click blocks for details</span>
      </div>
    </div>
  );
};

export default BlockchainCanvas;
