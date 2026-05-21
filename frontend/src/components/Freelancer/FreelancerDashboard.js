import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../App';

const FreelancerDashboard = () => {
  const navigate = useNavigate();
  const { user, account, API_URL, disconnectWallet } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    contracts: 0,
    applied: 0,
    earned: 0,
    profileComplete: 0
  });
  const [activeContracts, setActiveContracts] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      fetchDashboardData();
    }
  }, [account, API_URL]);

  const fetchDashboardData = async () => {
    try {
      const [contractsRes, jobsRes] = await Promise.all([
        axios.get(`${API_URL}/contracts?wallet_address=${account}`),
        axios.get(`${API_URL}/jobs?status=open&limit=5`)
      ]);
      
      const contracts = contractsRes.data || [];
      const jobs = jobsRes.data?.jobs || [];
      
      setActiveContracts(contracts.filter(c => c.status === 'in_progress').slice(0, 3));
      setRecommendedJobs(jobs.slice(0, 3));
      
      const earned = contracts
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0);
      
      setStats({
        contracts: contracts.filter(c => c.status === 'in_progress').length,
        applied: 0,
        earned: earned,
        profileComplete: user ? (user.username ? 100 : 30) : 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  const getGreeting = () => {
    if (user?.username) return user.username;
    return 'Freelancer';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <nav className="dash-nav" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div className="dash-nav-left">
          <a className="nav-logo" onClick={() => navigate('/')}>
            <div className="nav-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            FreeLedger
          </a>
          <div className="portal-tag">FREELANCER PORTAL</div>
          <div className="nav-links">
            <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</a>
            <a className={activeTab === 'jobs' ? 'active' : ''} onClick={() => setActiveTab('jobs')}>Find Jobs</a>
            <a className={activeTab === 'contracts' ? 'active' : ''} onClick={() => setActiveTab('contracts')}>My Contracts</a>
            <a className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>My Profile</a>
            <a className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>Messages</a>
          </div>
        </div>
        <div className="dash-nav-right">
          <div className="session-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Session Active
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/profile')}>Edit Profile</button>
          <button className="btn btn-outline btn-sm" onClick={() => { disconnectWallet(); navigate('/'); }}>Logout</button>
          <div className="user-chip">
            <div className="user-info">
              <div className="uname">{user?.username || 'User'}</div>
              <div className="urole">Freelancer</div>
            </div>
            <div className="user-avatar">{user?.username?.charAt(0) || '?'}</div>
          </div>
        </div>
      </nav>

      <div className="page-body">
        {activeTab === 'dashboard' && (
          <>
            <div className="page-header">
              <div>
                <h1>Welcome back, {getGreeting()} 👋</h1>
                <p>Here's your freelancing activity and latest opportunities.</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('jobs')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Browse Jobs
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card accent-card">
                <div className="s-top">
                  <span className="s-label">Status</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val" style={{ fontSize: '20px' }}>Available</div>
                <div className="s-sub" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>Update in profile →</div>
              </div>
              <div className="stat-card">
                <div className="s-top">
                  <span className="s-label">Active Contracts</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val">{stats.contracts}</div>
                <div className="s-badge">In progress</div>
              </div>
              <div className="stat-card">
                <div className="s-top">
                  <span className="s-label">Jobs Applied</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val">{stats.applied}</div>
                <div className="s-sub">This session</div>
              </div>
              <div className="stat-card">
                <div className="s-top">
                  <span className="s-label">Total Earned</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val">${stats.earned.toFixed(2)}</div>
                <div style={{ fontSize: '12px', color: 'var(--blue)', marginTop: '4px', fontWeight: '600' }}>Via Escrow</div>
              </div>
            </div>

            <div className="two-col">
              <div>
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div className="card-header">
                    <h3>Active Contracts</h3>
                    <a className="view-all" onClick={() => setActiveTab('contracts')}>View All</a>
                  </div>
                  <div className="card-body">
                    {activeContracts.length === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-3)' }}>
                        No active contracts yet. <a onClick={() => setActiveTab('jobs')} style={{ color: 'var(--blue)', fontWeight: '600' }}>Browse jobs →</a>
                      </div>
                    ) : (
                      activeContracts.map((contract, idx) => (
                        <div key={idx} className="project-row">
                          <div className="project-row-top">
                            <span className="project-name">{contract.title}</span>
                            <span className="project-pct">In Progress</span>
                          </div>
                          <div className="milestone-label">Working with client</div>
                          <div className="prog-bar">
                            <div className="prog-fill" style={{ width: '50%' }}></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header" style={{ marginBottom: '0' }}>
                    <h3>Profile & Skill Match</h3>
                    <a className="view-all" onClick={() => setActiveTab('profile')}>Edit</a>
                  </div>
                  <div style={{ padding: '16px 20px 20px' }}>
                    <div className="sm-row">
                      <span className="sm-label">Profile Complete</span>
                      <div className="sm-bar"><div className="sm-fill" style={{ width: `${stats.profileComplete}%` }}></div></div>
                      <span className="sm-pct">{stats.profileComplete}%</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Skills Listed</span>
                      <div className="sm-bar"><div className="sm-fill" style={{ width: `${user?.skills ? 80 : 0}%` }}></div></div>
                      <span className="sm-pct">{user?.skills ? '80%' : '0%'}</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Job Match Rate</span>
                      <div className="sm-bar"><div className="sm-fill" style={{ width: '45%' }}></div></div>
                      <span className="sm-pct">45%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="card" style={{ marginBottom: '14px' }}>
                  <div className="card-header">
                    <h3>Recommended Jobs</h3>
                    <a className="view-all" onClick={() => setActiveTab('jobs')}>See All</a>
                  </div>
                  <div className="card-body">
                    {recommendedJobs.length === 0 ? (
                      <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-3)' }}>
                        Add skills to your profile to get matched.
                      </div>
                    ) : (
                      recommendedJobs.map((job, idx) => (
                        <div key={idx} className="project-row">
                          <div className="project-row-top">
                            <span className="project-name">{job.title}</span>
                            <span className="project-pct">${job.budget_min}-{job.budget_max}</span>
                          </div>
                          <div className="milestone-label">{job.category}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rep-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>On-Chain Reputation</div>
                      <div className="rep-score">{user?.rating || 'New'}</div>
                    </div>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                  </div>
                  <p>Complete contracts to build your verifiable on-chain reputation score.</p>
                  <button className="btn-rep" onClick={() => setActiveTab('profile')}>View Full Profile →</button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'jobs' && (
          <div>
            <div className="page-header">
              <h1>Find Jobs</h1>
              <p>Browse available projects and apply.</p>
            </div>
            <div className="empty-state">
              <div className="empty-icon">💼</div>
              <h3>Job Listings</h3>
              <p>Job listings will appear here. Connect with MetaMask to apply.</p>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            <div className="page-header">
              <h1>My Contracts</h1>
              <p>Track your active and past contracts.</p>
            </div>
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No Contracts Yet</h3>
              <p>Your contracts will appear here once you start working on projects.</p>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <div className="page-header">
              <h1>My Profile</h1>
              <p>Manage your freelancer profile.</p>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="profile-header" style={{ marginBottom: '24px' }}>
                  <div className="profile-cover" style={{ height: '120px', background: 'linear-gradient(135deg, var(--blue) 0%, var(--blue-light) 100%)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}></div>
                  <div className="profile-info" style={{ display: 'flex', gap: '20px', padding: '0 24px 24px', background: 'var(--white)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                    <div className="profile-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', marginTop: '-40px', background: 'linear-gradient(135deg, var(--blue), var(--blue-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: '#fff', border: '4px solid var(--white)', flexShrink: 0 }}>
                      {user?.username?.charAt(0) || '?'}
                    </div>
                    <div className="profile-details" style={{ flex: 1, paddingTop: '12px' }}>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>{user?.username || 'Freelancer'}</h2>
                      <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '12px' }}>{user?.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <div className="page-header">
              <h1>Messages</h1>
              <p>Chat with clients and freelancers.</p>
            </div>
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>No Messages Yet</h3>
              <p>Your conversations will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreelancerDashboard;
