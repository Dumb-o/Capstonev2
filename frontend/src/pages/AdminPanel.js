import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loading from '../components/shared/Loading';
import api from '../services/api';

export default function AdminPanel() {
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [disputesRes, statsRes] = await Promise.all([
          api.get('/admin/disputes'),
          api.get('/admin/stats'),
        ]);
        setDisputes(disputesRes.data.disputes || []);
        setStats(statsRes.data);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const resolveDispute = async (id, decision) => {
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { decision });
      setDisputes(disputes.map((d) =>
        d.id === id ? { ...d, status: 'resolved', decision } : d
      ));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          <div className="page-header">
            <h2>Admin Panel</h2>
          </div>

          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.total_users}</span>
                <span className="stat-label">Users</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.total_contracts}</span>
                <span className="stat-label">Contracts</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.total_volume_eth?.toFixed(2)} ETH</span>
                <span className="stat-label">Volume</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.active_disputes}</span>
                <span className="stat-label">Active Disputes</span>
              </div>
            </div>
          )}

          <div className="admin-section">
            <h3>Disputes</h3>
            {disputes.length === 0 ? (
              <p className="empty-text">No disputes</p>
            ) : (
              <div className="disputes-list">
                {disputes.map((d) => (
                  <div key={d.id} className="dispute-card">
                    <div className="dispute-header">
                      <span>Contract: {d.contract_id?.slice(0, 12)}...</span>
                      <span className={`status-badge status-${d.status}`}>{d.status}</span>
                    </div>
                    <p><strong>Raised by:</strong> {d.raised_by}</p>
                    <p><strong>Reason:</strong> {d.reason}</p>
                    {d.status === 'open' && (
                      <div className="dispute-actions">
                        <button onClick={() => resolveDispute(d.id, 'release')} className="btn btn-sm btn-success">
                          Release to Freelancer
                        </button>
                        <button onClick={() => resolveDispute(d.id, 'refund')} className="btn btn-sm btn-danger">
                          Refund Client
                        </button>
                      </div>
                    )}
                    {d.status === 'resolved' && (
                      <p><strong>Decision:</strong> {d.decision}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
