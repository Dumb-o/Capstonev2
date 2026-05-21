import React, { useState } from 'react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
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
        <Sidebar />
        <main className="main-content">
          <div className="page-header">
            <h2>Profile</h2>
          </div>

          <div className="profile-card">
            <div className="profile-avatar">
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="profile-info">
              <p className="profile-wallet">{user?.wallet_address}</p>
              <p className="profile-id">ID: {user?.id}</p>
              <p className="profile-role">Role: {user?.role}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="profile-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="Solidity, React, Python"
              />
            </div>
            <div className="form-group">
              <label>Hourly Rate (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={form.hourly_rate}
                onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
