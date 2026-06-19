import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((req) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${config.apiUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
