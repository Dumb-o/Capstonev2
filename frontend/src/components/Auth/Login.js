import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useApp } from '../../App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, setAccount, setUser, user } = useApp();
  const [activeTab, setActiveTab] = useState('signin');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: '',
    role: 'freelancer'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const fillDemoCredentials = () => {
    if (activeTab === 'signin') {
      setFormData({ ...formData, email: 'bijeedangol@gmail.com', password: 'bijee123' });
    } else {
      setFormData({
        ...formData,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
    }
  };

  const validateSignIn = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignUp = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!validateSignIn()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      const { user: userData, token } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('sessionToken', token);
      localStorage.setItem('userId', userData.id);
      
      // Set user in context
      setUser(userData);
      setAccount('email-session');
      
      setToastMessage('Sign in successful! Redirecting...');
      setShowToast(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      setToastMessage(errorMsg);
      setShowToast(true);
      setErrors({ password: errorMsg });
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateSignUp()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role
      });

      const { user: userData, token } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('sessionToken', token);
      localStorage.setItem('userId', userData.id);
      
      // Set user in context
      setUser(userData);
      setAccount('email-session');
      
      setToastMessage('Account created! Redirecting...');
      setShowToast(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      setToastMessage(errorMsg);
      setShowToast(true);
      if (errorMsg.includes('email')) {
        setErrors({ email: errorMsg });
      } else {
        setErrors({ password: errorMsg });
      }
    }
    setLoading(false);
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      setToastMessage('Wallet connected successfully!');
      setShowToast(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      setToastMessage('Failed to connect wallet');
      setShowToast(true);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="auth-wrapper">
      <motion.div 
        className="auth-left"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-left-content">
          <a className="nav-logo" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <div className="nav-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            FreeLedger
          </a>
        </div>

        <div className="auth-left-content">
          {activeTab === 'signin' ? (
            <>
              <h2>Welcome back to the future of work</h2>
              <p>Connect your wallet or sign in to access your decentralized freelancing dashboard.</p>
              <div className="auth-feature-list">
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>Secure wallet-based authentication</span>
                </div>
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>Milestone-based smart contract escrow</span>
                </div>
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>IPFS-powered decentralized storage</span>
                </div>
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>Global talent marketplace</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2>Join the decentralized economy</h2>
              <p>Create your FreeLedger account and start earning in the new digital workforce.</p>
              <div className="auth-feature-list">
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>Own your professional identity on-chain</span>
                </div>
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>Zero platform fees, only gas costs</span>
                </div>
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>Instant payments via blockchain</span>
                </div>
                <div className="auth-feature">
                  <div className="dot">✓</div>
                  <span>Build verifiable reputation</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="auth-left-bottom">
          <p>© 2024 FreeLedger DAO. All rights reserved.</p>
        </div>
      </motion.div>

      <motion.div 
        className="auth-right"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-form-wrap">
          <a className="back-link" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to home
          </a>

          <div className="tab-switcher">
            <button 
              className={`tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => setActiveTab('signin')}
            >
              Sign In
            </button>
            <button 
              className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              Create Account
            </button>
          </div>

          {activeTab === 'signin' ? (
            <div className="form-panel active">
              <form onSubmit={handleSignIn}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                  {errors.email && <div className="error-msg visible">{errors.email}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  {errors.password && <div className="error-msg visible">{errors.password}</div>}
                </div>

                <div className="demo-hint" onClick={fillDemoCredentials}>
                  <span className="demo-label">Demo</span>
                  <span className="demo-cred">bijeedangol@gmail.com / bijee123</span>
                  <span className="demo-fill">Fill</span>
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="form-divider">
                  <span>or continue with</span>
                </div>

                <button type="button" className="btn btn-outline btn-full" onClick={handleWalletConnect}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12V7H5a2 2 0 010-4h14v4"/>
                    <path d="M3 5v14a2 2 0 002 2h16v-5"/>
                    <path d="M18 12a2 2 0 100 4 2 2 0 000-4z"/>
                  </svg>
                  Connect Wallet
                </button>
              </form>
            </div>
          ) : (
            <div className="form-panel active">
              <form onSubmit={handleSignUp}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                    {errors.firstName && <div className="error-msg visible">{errors.firstName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                    {errors.lastName && <div className="error-msg visible">{errors.lastName}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                  {errors.email && <div className="error-msg visible">{errors.email}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  <div className="form-hint">Must be at least 8 characters</div>
                  {errors.password && <div className="error-msg visible">{errors.password}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  />
                  {errors.confirmPassword && <div className="error-msg visible">{errors.confirmPassword}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">I want to</label>
                  <div className="role-selector">
                    <label className="role-option">
                      <input
                        type="radio"
                        name="role"
                        value="freelancer"
                        checked={formData.role === 'freelancer'}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                      />
                      <div className="role-card">
                        <div className="role-icon">💻</div>
                        <div className="role-name">Freelance</div>
                        <div className="role-desc">Find projects</div>
                      </div>
                    </label>
                    <label className="role-option">
                      <input
                        type="radio"
                        name="role"
                        value="client"
                        checked={formData.role === 'client'}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                      />
                      <div className="role-card">
                        <div className="role-icon">💼</div>
                        <div className="role-name">Hire Talent</div>
                        <div className="role-desc">Post projects</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                <div className="form-divider">
                  <span>or</span>
                </div>

                <button type="button" className="btn btn-outline btn-full" onClick={handleWalletConnect}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12V7H5a2 2 0 010-4h14v4"/>
                    <path d="M3 5v14a2 2 0 002 2h16v-5"/>
                    <path d="M18 12a2 2 0 100 4 2 2 0 000-4z"/>
                  </svg>
                  Sign Up with Wallet
                </button>

                <p className="form-footer-note">
                  By creating an account, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
                </p>
              </form>
            </div>
          )}
        </div>
      </motion.div>

      {showToast && (
        <div className="toast show">
          <span className="toast-icon">✓</span>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Login;
