import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Loading from '../components/shared/Loading';
import { useContracts } from '../hooks/useContracts';

export default function MyContracts() {
  const { contracts, loading } = useContracts({ limit: 50 });

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            <div className="page-header">
              <div>
                <h1 className="page-title">My Contracts</h1>
                <p className="page-sub">Manage all your <span>active and past contracts</span></p>
              </div>
            </div>

            {loading ? (
              <Loading />
            ) : contracts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No contracts yet</h3>
                <p>Create a contract or accept a proposal to get started.</p>
                <Link to="/create-contract" className="btn btn-primary">Create One</Link>
              </div>
            ) : (
              <div className="contracts-list">
                {contracts.map((c) => (
                  <Link to={`/contracts/${c.id}`} key={c.id} className="contract-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="contract-header" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{c.title}</h3>
                        <span className={`status-badge status-${c.status === 'active' ? 'active' : c.status === 'pending_signatures' ? 'pending' : c.status === 'completed' ? 'completed' : c.status === 'disputed' ? 'disputed' : 'draft'}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="contract-meta">
                        <span>{c.total_amount} ETH</span>
                        <span>{c.client_id?.slice(0, 12)}...</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>{c.total_amount} ETH</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Total Value</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
