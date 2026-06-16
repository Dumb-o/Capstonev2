import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const panels = {
  signin: {
    title: 'Welcome back to the decentralized economy',
    subtitle: 'Sign in with your wallet to access your projects, contracts, and earnings — no passwords needed.',
    features: [
      'Cryptographic wallet authentication',
      'Zero-knowledge identity verification',
      'Instant smart contract access',
      'Your keys, your data, your work',
    ],
  },
  register: {
    title: 'Start your decentralized journey today',
    subtitle: 'Join thousands of freelancers and clients building the future of work on the blockchain.',
    features: [
      'Free to join, no subscription fees',
      'Verifiable on-chain reputation',
      'Instant IPFS portfolio hosting',
      'Smart contract escrow protection',
    ],
  },
};

export default function Login() {
  const isAdminMode = process.env.REACT_APP_ADMIN_MODE === 'true';
  const { authenticate, registerEmail, loginEmail, loading, error } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(isAdminMode ? 'signin' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('freelancer');

  const panel = panels[tab];

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

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-left-content">
          <Link to="/" className="nav-logo">
            <span className="nav-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </span>
            FreeLedger
          </Link>
          <div className="left-panel-content active">
            <h2>{panel.title}</h2>
            <p>{panel.subtitle}</p>
            <div className="auth-feature-list">
              {panel.features.map((f, i) => (
                <div key={i} className="auth-feature">
                  <span className="dot">✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="auth-left-bottom">
          <p>Protected by blockchain cryptography — no central server can be breached.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          {!isAdminMode && (
          <Link to="/" className="back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to home
          </Link>
          )}

          {!isAdminMode && (
          <div className="tab-switcher">
            <button className={`tab-btn ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign In</button>
            <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Create Account</button>
          </div>
          )}

          {tab === 'signin' ? (
            <div className="form-panel active" style={isAdminMode ? { paddingTop: 40 } : {}}>
              {!isAdminMode && <p className="subtitle">Don't have an account? <a onClick={() => setTab('register')}>Create one →</a></p>}
              <form onSubmit={handleSignIn}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Password
                    {!isAdminMode && <a href="#" style={{ fontWeight: 500, color: 'var(--blue)', fontSize: 12 }} onClick={(e) => e.preventDefault()}>Forgot?</a>}
                  </label>
                  <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginBottom: 14 }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {!isAdminMode && (
                <>
              <div className="form-divider"><span>or continue with</span></div>

              <div className="form-group">
                <label className="form-label">I am joining as</label>
                <div className="role-selector">
                  <label className="role-option">
                    <input type="radio" name="wallet-role" value="freelancer" checked={role === 'freelancer'} onChange={() => setRole('freelancer')} />
                    <div className="role-card">
                      <div className="role-icon">💼</div>
                      <div className="role-name">Freelancer</div>
                      <div className="role-desc">I offer my skills</div>
                    </div>
                  </label>
                  <label className="role-option">
                    <input type="radio" name="wallet-role" value="client" checked={role === 'client'} onChange={() => setRole('client')} />
                    <div className="role-card">
                      <div className="role-icon">🏢</div>
                      <div className="role-name">Client</div>
                      <div className="role-desc">I hire talent</div>
                    </div>
                  </label>
                </div>
              </div>

              <button className="btn btn-outline btn-full" onClick={handleMetaMask} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 35 33" fill="none" style={{ marginRight: 8 }}>
                  <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726" />
                  <path d="M2.04187 1L15.0646 10.8048L12.7336 4.99098L2.04187 1Z" fill="#E27625" />
                </svg>
                Connect with MetaMask
              </button>
              </>)}
              {!isAdminMode && <p className="form-footer-note">By signing in you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>}
            </div>
          ) : (
            <div className="form-panel active">
              {!isAdminMode && <p className="subtitle">Already have an account? <a onClick={() => setTab('signin')}>Sign in →</a></p>}
              <form onSubmit={handleRegister}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                  <div className="form-hint">Use at least 8 characters with letters and numbers.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">I am joining as</label>
                  <div className="role-selector">
                    <label className="role-option">
                      <input type="radio" name="reg-role" value="freelancer" checked={role === 'freelancer'} onChange={() => setRole('freelancer')} />
                      <div className="role-card">
                        <div className="role-icon">💼</div>
                        <div className="role-name">Freelancer</div>
                        <div className="role-desc">I offer my skills</div>
                      </div>
                    </label>
                    <label className="role-option">
                      <input type="radio" name="reg-role" value="client" checked={role === 'client'} onChange={() => setRole('client')} />
                      <div className="role-card">
                        <div className="role-icon">🏢</div>
                        <div className="role-name">Client</div>
                        <div className="role-desc">I hire talent</div>
                    </div>
                    </label>
                  </div>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginBottom: 12 }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              {!isAdminMode && (
              <div className="form-divider"><span>or</span></div>
              )}
              {!isAdminMode && (
              <button className="btn btn-outline btn-full" onClick={handleMetaMask} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 35 33" fill="none" style={{ marginRight: 8 }}>
                  <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726" />
                  <path d="M2.04187 1L15.0646 10.8048L12.7336 4.99098L2.04187 1Z" fill="#E27625" />
                </svg>
                Sign up with MetaMask
              </button>
              )}
              {!isAdminMode && <p className="form-footer-note">By creating an account you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
