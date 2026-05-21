import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../App';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user, disconnectWallet, account, API_URL } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    activeProjects: 0,
    freelancersApplied: 0,
    budgetLocked: 0
  });

  const freelancers = [
    { name: 'Alex Rivera', role: 'UI/UX Designer', initials: 'AR', color: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    { name: 'Sarah Chen', role: 'Full Stack Dev', initials: 'SC', color: 'linear-gradient(135deg, #10b981, #059669)' },
    { name: 'Jordan Smith', role: 'Marketing', initials: 'JS', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { name: 'Maya Patel', role: 'Graphic Designer', initials: 'MP', color: 'linear-gradient(135deg, #ef4444, #dc2626)' }
  ];

  const projects = [
    { name: 'E-commerce UI Redesign', pct: 0, status: 'Milestone 3: High-Fidelity Wireframes' },
    { name: 'Mobile App Development (React Native)', pct: 0, status: 'Milestone 1: Backend Integration' },
    { name: 'Brand Guidelines & Assets', pct: 0, status: 'Reviewing Initial Concepts' }
  ];

  const contracts = [
    { status: 'Signed', count: 0, color: 'green' },
    { status: 'Pending Signature', count: 0, color: 'amber' },
    { status: 'Drafts', count: 0, color: 'gray' }
  ];

  const userInitials = user?.username 
    ? user.username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

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
          <div className="portal-tag">CLIENT PORTAL</div>
          <div className="nav-links">
            <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</a>
            <a className={activeTab === 'jobs' ? 'active' : ''} onClick={() => setActiveTab('jobs')}>Explore Jobs</a>
            <a className={activeTab === 'contracts' ? 'active' : ''} onClick={() => setActiveTab('contracts')}>My Contracts</a>
            <a className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>Messages</a>
          </div>
        </div>
        <div className="dash-nav-right">
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('jobs')}>
            + Post New Project
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { disconnectWallet(); navigate('/'); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
          <div className="user-chip">
            <div className="user-info">
              <div className="uname">{user?.username?.split(' ')[0] || '—'}</div>
              <div className="urole">Client</div>
            </div>
            <div className="user-avatar">{userInitials}</div>
          </div>
        </div>
      </nav>

      <div className="page-body">
        {activeTab === 'dashboard' && (
          <>
            <div className="page-header">
              <div>
                <h1>Welcome back, {user?.username?.split(' ')[0] || '—'} 👋</h1>
                <p>Manage your active projects and talent pool.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="session-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Session Active
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card accent-card">
                <div className="s-top">
                  <span className="s-label">New</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2">
                      <path d="M12 5v14M5 12l7-7 7 7"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val">New</div>
                <div className="s-sub">Post a project</div>
              </div>
              <div className="stat-card">
                <div className="s-top">
                  <span className="s-label">Active Projects</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val">{stats.activeProjects}</div>
                <div className="s-badge">+0 New</div>
              </div>
              <div className="stat-card">
                <div className="s-top">
                  <span className="s-label">Freelancers Applied</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                      <path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val">{stats.freelancersApplied}</div>
                <div className="s-sub">4.8 Avg Rating</div>
              </div>
              <div className="stat-card">
                <div className="s-top">
                  <span className="s-label">Total Budget Locked</span>
                  <div className="s-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </div>
                </div>
                <div className="s-val">${stats.budgetLocked}</div>
                <div className="s-sub" style={{ color: 'var(--green)', fontWeight: '600' }}>Escrow Active</div>
              </div>
            </div>

            <div className="two-col">
              <div>
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div className="card-header">
                    <h3>Active Project Progress</h3>
                    <a className="view-all" onClick={() => setActiveTab('contracts')}>View All</a>
                  </div>
                  <div className="card-body">
                    {projects.map((project, index) => (
                      <div className="project-row" key={index}>
                        <div className="project-row-top">
                          <span className="project-name">{project.name}</span>
                          <span className="project-pct">{project.pct}%</span>
                        </div>
                        <div className="milestone-label">{project.status}</div>
                        <div className="prog-bar">
                          <div className="prog-fill" style={{ width: project.pct + '%' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header" style={{ marginBottom: '0' }}>
                    <h3>Contract Status Summary</h3>
                  </div>
                  <div className="cs-grid">
                    {contracts.map((contract, index) => (
                      <div key={index} className={`cs-box ${contract.color}`}>
                        <div className="cs-val">{contract.count}</div>
                        <div className="cs-lbl">{contract.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="card">
                  <div className="card-header">
                    <h3>Applied Freelancers</h3>
                  </div>
                  <div className="card-body">
                    {freelancers.map((freelancer, index) => (
                      <div className="fl-item" key={index}>
                        <div className="fl-left">
                          <div className="fl-avatar" style={{ background: freelancer.color }}>{freelancer.initials}</div>
                          <div>
                            <div className="fl-name">{freelancer.name}</div>
                            <div className="fl-role">{freelancer.role}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="fl-rating">⭐ 4.9/5</span>
                          <span className="fl-arrow">›</span>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-outline btn-full btn-sm" style={{ marginTop: '12px' }} onClick={() => setActiveTab('jobs')}>
                      View Talent Marketplace
                    </button>
                  </div>
                </div>

                <div className="hire-card">
                  <h4>Hire Smarter</h4>
                  <p>Clients who use our Escrow feature report 40% higher satisfaction on first-time hires.</p>
                  <button className="btn-hire">Read Guide →</button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'jobs' && (
          <div>
            <div className="page-header">
              <h1>Post New Project</h1>
              <p>Find talented freelancers for your projects.</p>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>Post a Project</h3>
                  <p>Create a new job posting to attract freelancers.</p>
                  <button className="btn btn-primary">Create Job Post</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            <div className="page-header">
              <h1>My Contracts</h1>
              <p>Manage your active contracts and milestones.</p>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <h3>No Contracts Yet</h3>
                  <p>Your contracts will appear here once you hire freelancers.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <div className="page-header">
              <h1>Messages</h1>
              <p>Chat with freelancers.</p>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>No Messages Yet</h3>
                  <p>Your conversations will appear here.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
