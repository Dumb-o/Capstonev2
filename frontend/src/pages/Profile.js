import React, { useState } from 'react';
import Navbar from '../components/shared/Navbar';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Profile() {
  const { state, dispatch } = useApp();
  const user = state.user;
  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    skills: user?.skills?.join(', ') || '',
    hourly_rate: user?.hourly_rate || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean);
      const { data } = await api.put('/users/me', {
        username: form.username,
        bio: form.bio,
        skills,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
      });
      dispatch({ type: 'SET_USER', payload: data.user });
      alert('Profile updated!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            <div className="page-header">
              <div>
                <h1 className="page-title">Profile</h1>
                <p className="page-sub">Manage your <span>account and preferences</span></p>
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-avatar">
                {user?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{user?.username || 'Unnamed'}</h2>
                <p className="profile-wallet">{user?.wallet_address}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
                  <span className={`role-badge ${user?.role}`}>{user?.role}</span>
                  <span className="profile-id">ID: {user?.id?.slice(0, 12)}...</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="profile-form">
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Profile</h3>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} placeholder="Tell us about yourself..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Skills (comma-separated)</label>
                  <input className="form-input" type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Solidity, React, Python" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hourly Rate (ETH)</label>
                  <input className="form-input" type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
