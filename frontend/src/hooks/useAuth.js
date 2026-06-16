import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  connectWallet, getChallenge, signMessage, login,
  emailRegister, emailLogin,
} from '../services/auth';
import { useApp } from '../context/AppContext';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const authenticate = async (role) => {
    setLoading(true);
    setError(null);
    try {
      const { address, provider } = await connectWallet();
      dispatch({ type: 'SET_WALLET', payload: address });

      const nonce = await getChallenge(address);
      const signature = await signMessage(provider, nonce);
      const user = await login(address, signature, role);

      dispatch({ type: 'SET_USER', payload: user });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const registerEmail = async (email, password, username, role) => {
    setLoading(true);
    setError(null);
    try {
      const user = await emailRegister(email, password, username, role);
      dispatch({ type: 'SET_USER', payload: user });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const user = await emailLogin(email, password);
      dispatch({ type: 'SET_USER', payload: user });
      const isAdminMode = process.env.REACT_APP_ADMIN_MODE === 'true';
      navigate(isAdminMode ? '/admin' : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return { authenticate, registerEmail, loginEmail, loading, error };
}
