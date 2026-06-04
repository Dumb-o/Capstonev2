import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { authenticate, registerEmail, loginEmail, loading, error } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('freelancer');

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    await loginEmail(email, password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const username = [firstName, lastName].filter(Boolean).join(' ');
    await registerEmail(email, password, username, role);
  };

  const handleMetaMask = async () => {
    await authenticate(role);
  };

  const fillDemo = () => {
    setEmail('bijeedangol@gmail.com');
    setPassword('bijee123');
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="login-header">
          <div className="brand-icon">⛓️</div>
          <h2>FreeLedger</h2>
          <p>Decentralized freelance protocol</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => setTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
          >
            Register
          </button>
        </div>

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="email-auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="demo-hint" onClick={fillDemo}>
              <span className="demo-label">Demo</span>
              <span className="demo-cred">bijeedangol@gmail.com / bijee123</span>
              <span className="demo-fill">click to fill</span>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="email-auth-form">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>I am joining as</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="freelancer">Freelancer</option>
                <option value="client">Client</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="auth-toggle">or</div>

        <div className="form-group">
          <label>I am joining as</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="freelancer">Freelancer</option>
            <option value="client">Client</option>
          </select>
        </div>

        <button
          className="btn btn-outline btn-block"
          onClick={handleMetaMask}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 35 33" fill="none" style={{ marginRight: 8 }}>
            <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726"/>
            <path d="M2.04187 1L15.0646 10.8048L12.7336 4.99098L2.04187 1Z" fill="#E27625"/>
            <path d="M28.1341 23.5433L24.6903 28.9135L32.2169 30.9913L34.3577 23.6586L28.1341 23.5433Z" fill="#E27625"/>
            <path d="M0.657715 23.6586L2.78397 30.9913L10.2974 28.9135L6.86665 23.5433L0.657715 23.6586Z" fill="#E27625"/>
          </svg>
          Connect with MetaMask
        </button>

        {error && <div className="error-message">{error}</div>}

        <div className="login-info">
          Protected by blockchain cryptography
        </div>
      </motion.div>
    </div>
  );
}
