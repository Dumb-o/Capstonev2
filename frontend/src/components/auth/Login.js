import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const featurePanels = [
  { title: 'Smart Contract Escrow', items: ['Funds held in secure Ethereum smart contracts', 'Milestone-based automatic release', 'Full transparency on-chain'] },
  { title: 'Decentralized & Secure', items: ['No middlemen taking 20% fees', 'Wallet-based authentication', 'IPFS-backed storage'] },
];

export default function Login() {
  const { authenticate, registerEmail, loginEmail, loading, error } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('freelancer');
  const [featureIdx, setFeatureIdx] = useState(0);

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
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-left-content">
          <Link to="/" className="nav-logo">
            <span className="nav-logo-icon">◈</span>
            FreeLedger
          </Link>
          <div className={`left-panel-content ${featureIdx === 0 ? 'active' : ''}`}>
            <h2>Smart Contract Escrow</h2>
            <p>Funds held in secure Ethereum smart contracts, released automatically when milestones are approved.</p>
            <div className="auth-feature-list">
              <div className="auth-feature"><span className="dot">✓</span> No middlemen</div>
              <div className="auth-feature"><span className="dot">✓</span> Milestone-based payments</div>
              <div className="auth-feature"><span className="dot">✓</span> Full on-chain transparency</div>
            </div>
          </div>
          <div className={`left-panel-content ${featureIdx === 1 ? 'active' : ''}`}>
            <h2>Decentralized & Secure</h2>
            <p>Your MetaMask wallet is your identity. No passwords, no third-party risk.</p>
            <div className="auth-feature-list">
              <div className="auth-feature"><span className="dot">✓</span> Wallet authentication</div>
              <div className="auth-feature"><span className="dot">✓</span> IPFS-backed storage</div>
              <div className="auth-feature"><span className="dot">✓</span> Globally accessible</div>
            </div>
          </div>
        </div>
        <div className="auth-left-bottom">
          <p>Trusted by freelancers worldwide &bull; Taylors University 2026</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <Link to="/" className="back-link">← Back to home</Link>

          <div className="tab-switcher">
            <button className={`tab-btn ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign In</button>
            <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Register</button>
          </div>

          {tab === 'signin' ? (
            <div className={`form-panel ${tab === 'signin' ? 'active' : ''}`}>
              <p className="subtitle">Welcome back! Sign in to your account.</p>
              <form onSubmit={handleSignIn}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="demo-hint" onClick={fillDemo} type="button">
                  <span className="demo-label">Demo</span>
                  <span className="demo-cred">bijeedangol@gmail.com / bijee123</span>
                  <span className="demo-fill">click to fill</span>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          ) : (
            <div className={`form-panel ${tab === 'register' ? 'active' : ''}`}>
              <p className="subtitle">Create your free account.</p>
              <form onSubmit={handleRegister}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">I am joining as</label>
                  <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="freelancer">Freelancer — I want to offer services</option>
                    <option value="client">Client — I want to hire talent</option>
                  </select>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}

          <div className="form-divider"><span>or continue with</span></div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">I am joining as</label>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="freelancer">Freelancer</option>
              <option value="client">Client</option>
            </select>
          </div>

          <button className="btn btn-outline btn-full" onClick={handleMetaMask} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 35 33" fill="none" style={{ marginRight: 8 }}>
              <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726"/>
              <path d="M2.04187 1L15.0646 10.8048L12.7336 4.99098L2.04187 1Z" fill="#E27625"/>
              <path d="M28.1341 23.5433L24.6903 28.9135L32.2169 30.9913L34.3577 23.6586L28.1341 23.5433Z" fill="#E27625"/>
              <path d="M0.657715 23.6586L2.78397 30.9913L10.2974 28.9135L6.86665 23.5433L0.657715 23.6586Z" fill="#E27625"/>
            </svg>
            Connect with MetaMask
          </button>

          <p className="form-footer-note">Protected by blockchain cryptography</p>
        </div>
      </div>
    </div>
  );
}
