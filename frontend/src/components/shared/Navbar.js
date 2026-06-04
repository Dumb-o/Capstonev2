import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { state, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">◈</span>
          FreeLedger
        </Link>

        <div className="navbar-links">
          {state.isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/contracts" className="nav-link">Contracts</Link>
              <Link to="/jobs" className="nav-link">{state.user?.role === 'client' ? 'Jobs' : 'Find Jobs'}</Link>
              <Link to="/messages" className="nav-link">Messages</Link>
              {state.user?.role === 'admin' && <Link to="/admin" className="nav-link">Admin</Link>}
              <Link to="/profile" className="nav-link">Profile</Link>
              <div className="nav-user">
                <span className="nav-address">
                  {state.user?.username || state.walletAddress?.slice(0, 6)}
                </span>
                <span className="nav-badge" style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 8,
                  background: state.user?.role === 'admin' ? '#ef4444' : state.user?.role === 'client' ? '#3b82f6' : '#10b981',
                  color: '#fff', marginLeft: 6,
                }}>
                  {state.user?.role}
                </span>
                <button onClick={handleLogout} className="btn btn-sm btn-outline">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/login" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
