import { BrowserProvider } from 'ethers';
import api from './api';

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install the MetaMask browser extension.');
  }
  let accounts;
  try {
    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  } catch (metaErr) {
    if (metaErr.code === 4001) {
      throw new Error('Connection rejected. Please approve the MetaMask connection request.');
    }
    if (metaErr.code === -32002) {
      throw new Error('MetaMask is already processing a request. Please check your browser extension.');
    }
    throw new Error(metaErr.message || 'MetaMask connection failed');
  }
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found in MetaMask. Please unlock your wallet.');
  }
  const provider = new BrowserProvider(window.ethereum);
  return { address: accounts[0], provider };
}

export async function checkWalletStatus(address) {
  const { data } = await api.get(`/auth/wallet-status?address=${address}`);
  return data.exists;
}

export async function getChallenge(address) {
  const { data } = await api.post('/auth/challenge', { address });
  return data.nonce;
}

export async function signMessage(provider, message) {
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
}

export async function login(address, signature, role) {
  const { data } = await api.post('/auth/login', { address, signature, role });
  storeAuth(data);
  return data.user;
}

export async function emailRegister(email, password, username, role) {
  const { data } = await api.post('/auth/email/register', { email, password, username, role });
  storeAuth(data);
  return data.user;
}

export async function emailLogin(email, password) {
  const { data } = await api.post('/auth/email/login', { email, password });
  storeAuth(data);
  return data.user;
}

function storeAuth(data) {
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.user));
}

export async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  return data.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    console.warn('Logout API call failed');
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export function getStoredUser() {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
}

export function isConnected() {
  return !!localStorage.getItem('access_token');
}
