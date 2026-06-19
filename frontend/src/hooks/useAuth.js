import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  connectWallet, getChallenge, signMessage, login,
  checkWalletStatus,
  emailRegister, emailLogin,
} from '../services/auth';
import { useApp } from '../context/AppContext';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const connectAndCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const { address, provider } = await connectWallet();
      dispatch({ type: 'SET_WALLET', payload: address });
      const exists = await checkWalletStatus(address);
      return { address, provider, exists };
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Connection failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const walletLogin = async (address, provider) => {
    setLoading(true);
    setError(null);
    try {
      const nonce = await getChallenge(address);
      const signature = await signMessage(provider, nonce);
      const user = await login(address, signature, null);
      dispatch({ type: 'SET_USER', payload: user });
      const dashboard = user.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';
      navigate(dashboard);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const walletRegister = async (address, provider, role) => {
    setLoading(true);
    setError(null);
    try {
      const nonce = await getChallenge(address);
      const signature = await signMessage(provider, nonce);
      const user = await login(address, signature, role);
      dispatch({ type: 'SET_USER', payload: user });
      const dashboard = user.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';
      navigate(dashboard);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed';
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
      const dashboard = user.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';
      navigate(dashboard);
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
      if (isAdminMode) {
        navigate('/admin');
      } else {
        const dashboard = user.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';
        navigate(dashboard);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return { connectAndCheck, walletLogin, walletRegister, registerEmail, loginEmail, loading, error };
}
