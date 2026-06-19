import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import NotificationBell from '../notifications/NotificationBell';

export default function Navbar() {
  const { state, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminMode = process.env.REACT_APP_ADMIN_MODE === 'true';
  const isLanding = !isAdminMode && location.pathname === '/';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (isLanding) {
    return (
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon">◈</span>
          FreeLedger
        </Link>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/login" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>
    );
  }

  const isClient = state.user?.role === 'client';
  const isAdmin = state.user?.role === 'admin';
  const portalLabel = isAdmin ? 'ADMIN PORTAL' : isClient ? 'CLIENT PORTAL' : 'FREELANCER PORTAL';

  return (
    <nav className="dash-nav">
      <div className="dash-nav-left">
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon">◈</span>
          FreeLedger
        </Link>
        <span className="portal-tag">{portalLabel}</span>
        <div className="dash-links">
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
          {isClient && <Link to="/create-contract" className={location.pathname === '/create-contract' ? 'active' : ''}>Post a Job</Link>}
          {isClient && <Link to="/freelancers" className={location.pathname === '/freelancers' ? 'active' : ''}>Browse Freelancers</Link>}
          <Link to="/jobs" className={location.pathname.startsWith('/jobs') ? 'active' : ''}>{isClient ? 'Explore Jobs' : 'Find Jobs'}</Link>
          <Link to="/contracts" className={location.pathname.startsWith('/contracts') ? 'active' : ''}>Contracts</Link>
          <Link to="/messages" className={location.pathname === '/messages' ? 'active' : ''}>Messages</Link>
        </div>
      </div>
      <div className="dash-nav-right">
        {state.isAuthenticated && (
          <>
            <NotificationBell />
            <Link to="/profile" className="user-chip" style={{ textDecoration: 'none' }}>
              <div className="user-info">
                <div className="uname">{state.user?.username || state.walletAddress?.slice(0, 6)}</div>
                <div className="urole">{state.user?.role}</div>
              </div>
              <div className="user-avatar">
                {(state.user?.username?.[0] || '?').toUpperCase()}
              </div>
            </Link>
            <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ marginLeft: 4 }}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
