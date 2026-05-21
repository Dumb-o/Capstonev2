import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loading from '../components/shared/Loading';
import { useContracts } from '../hooks/useContracts';

export default function MyContracts() {
  const { contracts, loading } = useContracts({ limit: 50 });

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
          <div className="page-header">
            <h2>My Contracts</h2>
          </div>

          {loading ? (
            <Loading />
          ) : contracts.length === 0 ? (
            <div className="empty-state">
              <p>No contracts yet.</p>
              <Link to="/create-contract" className="btn btn-primary">Create One</Link>
            </div>
          ) : (
            <div className="contracts-list">
              {contracts.map((c) => (
                <Link to={`/contracts/${c.id}`} key={c.id} className="contract-card">
                  <div className="contract-main">
                    <h3>{c.title}</h3>
                    <span
                      className="status-badge"
                      style={{ background: statusColors[c.status] || '#6b7280' }}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="contract-meta">
                    <span>{c.total_amount} ETH</span>
                    <span>{c.client_id.slice(0, 12)}...</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
