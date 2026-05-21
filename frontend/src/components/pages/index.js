import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../App';

const DashboardHome = () => {
  const { user, account, API_URL } = useApp();
  const [stats, setStats] = useState({ jobs: [], contracts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [account, API_URL]);

  const fetchDashboardData = async () => {
    try {
      const [jobsRes, contractsRes] = await Promise.all([
        axios.get(`${API_URL}/jobs?status=open&limit=6`),
        axios.get(`${API_URL}/contracts?wallet_address=${account}`)
      ]);
      setStats({
        jobs: jobsRes.data.jobs || [],
        contracts: contractsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <h1>Welcome back{user?.username ? `, ${user.username}` : ''}!</h1>
        <p>Here's what's happening with your freelance work.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Open Jobs</span>
            <div className="s-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
            </div>
          </div>
          <div className="s-val">{stats.jobs.length}</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Active Contracts</span>
            <div className="s-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
          </div>
          <div className="s-val">{stats.contracts.filter(c => c.status === 'in_progress').length}</div>
        </div>
        <div className="stat-card accent-card">
          <div className="s-top">
            <span className="s-label">Completed</span>
            <div className="s-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
          <div className="s-val">{stats.contracts.filter(c => c.status === 'completed').length}</div>
        </div>
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Rating</span>
            <div className="s-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
          </div>
          <div className="s-val">{user?.rating || 'N/A'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Open Jobs</h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : stats.jobs.length === 0 ? (
            <div className="empty-state">No jobs available</div>
          ) : (
            <div className="jobs-grid">
              {stats.jobs.slice(0, 3).map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const JobCard = ({ job }) => {
  return (
    <div className="job-card">
      <div className="job-card-header">
        <h3>{job.title}</h3>
        <span className="job-category">{job.category}</span>
      </div>
      <div className="job-card-body">
        <p className="job-description">{job.description}</p>
        <div className="job-meta">
          <span className="job-meta-item">💰 ${job.budget_min} - ${job.budget_max}</span>
          <span className="job-meta-item">⏱️ {job.duration}</span>
        </div>
        <div className="job-client">
          <span>👤 {job.client_username}</span>
        </div>
      </div>
      <div className="job-card-footer">
        <span className="job-budget">${job.budget_min} - ${job.budget_max}</span>
        <button className="btn btn-primary btn-sm">View</button>
      </div>
    </div>
  );
};

const ExploreJobs = ({ isReadOnly = false }) => {
  const { API_URL } = useApp();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ category: '', search: '', status: 'open' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, [API_URL, filters]);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(`${API_URL}/jobs?${params}`);
      setJobs(response.data.jobs || []);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
    setLoading(false);
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <h1>Explore Jobs</h1>
        <p>Find your next project from hundreds of job listings.</p>
      </div>

      <div className="filters">
        <input
          type="text"
          className="form-input search-input"
          placeholder="Search jobs..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="form-select filter-select"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <p>No jobs found</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
};

const MyContracts = () => {
  const { account, API_URL } = useApp();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [account, API_URL]);

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API_URL}/contracts?wallet_address=${account}`);
      setContracts(response.data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
    setLoading(false);
  };

  const statusColors = {
    created: 'var(--text-3)',
    in_progress: 'var(--blue)',
    completed: 'var(--green)',
    cancelled: 'var(--red)',
    disputed: 'var(--amber)'
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <h1>My Contracts</h1>
        <p>Track your active and past contracts.</p>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : contracts.length === 0 ? (
        <div className="empty-state">
          <p>No contracts yet</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Find Jobs</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            {contracts.map(contract => (
              <div key={contract.id} style={{ 
                padding: '1.5rem', 
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ marginBottom: '0.5rem' }}>{contract.title}</h3>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
                    {contract.status === 'in_progress' 
                      ? `Working with ${contract.client_username}`
                      : `Client: ${contract.client_username}`
                    }
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: 'var(--green)', marginBottom: '4px' }}>
                    ${contract.total_amount} ETH
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: statusColors[contract.status] + '20',
                    color: statusColors[contract.status],
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    {contract.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Messages = () => {
  const { account, API_URL } = useApp();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, [account, API_URL]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/conversations/${account}`);
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
    setLoading(false);
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API_URL}/messages/${conversationId}?walletAddress=${account}`);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const conversation = conversations.find(c => c.conversation_id === selectedConversation);
    const receiver = conversation.participant1 === account ? conversation.participant2 : conversation.participant1;

    try {
      await axios.post(`${API_URL}/messages`, {
        sender_wallet_address: account,
        receiver_wallet_address: receiver,
        message: newMessage
      });
      setNewMessage('');
      fetchMessages(selectedConversation);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setSelectedConversation(id);
    fetchMessages(id);
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <h1>Messages</h1>
        <p>Chat with clients and freelancers.</p>
      </div>

      <div className="card" style={{ display: 'flex', height: 'calc(100vh - 250px)' }}>
        <div style={{ width: '300px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          <div className="message-list">
            {conversations.map(conv => (
              <div 
                key={conv.conversation_id}
                className={`message-item ${selectedConversation === conv.conversation_id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv.conversation_id)}
                style={{ background: selectedConversation === conv.conversation_id ? 'var(--surface)' : 'transparent' }}
              >
                <div className="message-avatar">
                  {conv.other_username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-sender">{conv.other_username || 'Unknown'}</span>
                  </div>
                  <p className="message-preview">{conv.last_message || 'No messages yet'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                {messages.map(msg => (
                  <div 
                    key={msg.id}
                    style={{ 
                      textAlign: msg.sender_wallet_address === account ? 'right' : 'left',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ 
                      display: 'inline-block',
                      padding: '0.75rem 1rem',
                      borderRadius: '1rem',
                      background: msg.sender_wallet_address === account ? 'var(--blue)' : 'var(--surface)',
                      color: msg.sender_wallet_address === account ? 'white' : 'inherit',
                      maxWidth: '70%'
                    }}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button className="btn btn-primary" onClick={sendMessage}>Send</button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Profile = ({ isReadOnly = false }) => {
  const { user, account } = useApp();

  return (
    <div className="page-body">
      <div className="profile-header">
        <div className="profile-cover"></div>
        <div className="profile-info">
          <div className="profile-avatar" style={{ background: 'linear-gradient(135deg, var(--blue), var(--blue-light))' }}>
            {user?.username?.charAt(0).toUpperCase() || account?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="profile-details">
            <h2>{user?.username || 'Set up your profile'}</h2>
            <p>{user?.bio || 'No bio yet'}</p>
            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-value">{user?.total_jobs_completed || 0}</div>
                <div className="profile-stat-label">Jobs Completed</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{user?.rating || 'N/A'}</div>
                <div className="profile-stat-label">Rating</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{user?.total_earned || 0}</div>
                <div className="profile-stat-label">ETH Earned</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Skills</h3>
        </div>
        <div className="card-body">
          {user?.skills ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {JSON.parse(user.skills).map((skill, idx) => (
                <span key={idx} style={{ 
                  padding: '0.25rem 0.75rem', 
                  background: 'var(--blue-pale)', 
                  color: 'var(--blue)',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-3)' }}>No skills added yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const { user, account, createOrUpdateUser } = useApp();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    skills: user?.skills ? (Array.isArray(user.skills) ? user.skills.join(', ') : JSON.parse(user.skills).join(', ')) : '',
    hourly_rate: user?.hourly_rate || '',
    location: user?.location || '',
    user_type: user?.user_type || 'freelancer'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        skills: user.skills ? (Array.isArray(user.skills) ? user.skills.join(', ') : JSON.parse(user.skills).join(', ')) : '',
        hourly_rate: user.hourly_rate || '',
        location: user.location || '',
        user_type: user.user_type || 'freelancer'
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createOrUpdateUser({
        ...formData,
        skills: JSON.stringify(formData.skills.split(',').map(s => s.trim()).filter(Boolean))
      });
    } catch (error) {
      console.error('Error saving:', error);
    }
    setSaving(false);
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your profile and preferences.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Profile Settings</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select
                className="form-input"
                value={formData.user_type}
                onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                <option value="freelancer">Freelancer</option>
                <option value="client">Client</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-input"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Skills (comma separated)</label>
              <input
                type="text"
                className="form-input"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="React, Solidity, Node.js..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hourly Rate (ETH)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="form-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export { DashboardHome, ExploreJobs, MyContracts, Messages, Profile, Settings };
