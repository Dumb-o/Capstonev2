import { BrowserProvider } from 'ethers';
import api from './api';

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  return { address: accounts[0], provider };
}

export async function getChallenge(address) {
  const { data } = await api.post('/auth/challenge', { address });
  return data.nonce;
}

export async function signMessage(provider, message) {
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
}

export async function login(address, signature) {
  const { data } = await api.post('/auth/login', { address, signature });
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
  } catch {}
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
