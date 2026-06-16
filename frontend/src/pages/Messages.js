import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { useApp } from '../context/AppContext';
import api from '../services/api';

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MessagesPage() {
  const { state } = useApp();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [allConversations, setAllConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMsgModal, setShowNewMsgModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/messages/conversations');
        setAllConversations(data || []);
        setConversations(data || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setConversations(allConversations.filter(c =>
        (c.user.username || '').toLowerCase().includes(q) ||
        (c.user.headline || '').toLowerCase().includes(q)
      ));
    } else {
      setConversations(allConversations);
    }
  }, [searchQuery, allConversations]);

  useEffect(() => {
    const userId = searchParams.get('user');
    if (!userId) return;
    const existing = allConversations.find(c => c.user.id === userId);
    if (existing) {
      setActiveChat(existing.user);
      return;
    }
    api.get(`/users/${userId}`).then(({ data }) => setActiveChat(data)).catch(() => {});
  }, [searchParams, allConversations]);

  useEffect(() => {
    if (activeChat) {
      api.get(`/messages/conversations/${activeChat.id}`)
        .then(({ data }) => setMessages(data.messages || []))
        .catch(() => {});
    }
  }, [activeChat]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const searchUsers = async (q) => {
    if (!q.trim()) return;
    setUserSearchLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search: q, limit: 10 } });
      setUserSearchResults(data.users || []);
    } catch {}
    setUserSearchLoading(false);
  };

  useEffect(() => {
    if (userSearchQuery.trim().length >= 2) {
      const t = setTimeout(() => searchUsers(userSearchQuery), 300);
      return () => clearTimeout(t);
    }
    setUserSearchResults([]);
  }, [userSearchQuery]);

  const startNewChat = (user) => {
    setShowNewMsgModal(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setActiveChat(user);
  };

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const { data } = await api.post('/messages/send', {
        receiver_id: activeChat.id,
        content: newMessage,
      });
      setMessages([...messages, data]);
      setNewMessage('');
      setAllConversations(prev => {
        const updated = prev.map(c =>
          c.user.id === activeChat.id
            ? { ...c, last_message: data }
            : c
        );
        updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0));
        return updated;
      });
    } catch {}
  }, [newMessage, activeChat, messages]);

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
    <div className="messages-layout">
      <div className="conv-sidebar">
        <div className="conv-header">
          <h2>Messages</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewMsgModal(true)}
            style={{ whiteSpace: 'nowrap', marginBottom: 8 }}>+ New</button>
          <div className="conv-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input className="conv-search" placeholder="Search conversations..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="conv-list">
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.user.id}
                className={`conv-item ${activeChat?.id === conv.user.id ? 'active' : ''}`}
                onClick={() => { setActiveChat(conv.user); setMobileOpen(true); }}
              >
                <div className="conv-avatar" style={{ background: 'linear-gradient(135deg, var(--blue), var(--blue-light))' }}>
                  {(conv.user.username?.[0] || '?').toUpperCase()}
                </div>
                <div className="conv-body">
                  <div className="conv-row">
                    <span className="conv-name">{conv.user.username || conv.user.id.slice(0, 8)}</span>
                    <span className="conv-time">
                      {conv.last_message?.created_at ? timeAgo(conv.last_message.created_at) : ''}
                    </span>
                  </div>
                  <div className="conv-preview">
                    {conv.last_message?.content?.slice(0, 60) || 'No messages yet'}
                  </div>
                </div>
                {conv.unread > 0 && <span className="unread-badge">{conv.unread}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`chat-panel ${mobileOpen ? 'mobile-open' : ''}`}>
        {activeChat ? (
          <>
            <div className="chat-header">
              <div className="chat-header-left">
                <button className="back-btn" onClick={() => setMobileOpen(false)}>←</button>
                <div className="chat-avatar" style={{ background: 'linear-gradient(135deg, var(--blue), var(--blue-light))' }}>
                  {(activeChat.username?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="chat-name">{activeChat.username || activeChat.id.slice(0, 8)}</div>
                  <div className="chat-status">{activeChat.is_available ? 'Available' : 'Offline'}</div>
                </div>
              </div>
            </div>
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`msg ${msg.sender_id === state.user?.id ? 'outgoing' : 'incoming'}`}>
                  <div className="msg-bubble">
                    {msg.content.startsWith('submitted a proposal') || msg.content.includes('submitted a proposal') ? (
                      <span style={{ fontStyle: 'italic', opacity: 0.85 }}>{msg.content}</span>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <div className="msg-time">{timeAgo(msg.created_at)}</div>
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>
            <div className="chat-input-area">
              <div className="chat-input-wrap">
                <input
                  className="chat-input-field"
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                />
              </div>
              <button className="send-btn" onClick={sendMessage}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3>Your Messages</h3>
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {showNewMsgModal && (
        <div className="modal-overlay" onClick={() => { setShowNewMsgModal(false); setUserSearchQuery(''); setUserSearchResults([]); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>New Message</h3>
              <button className="modal-close" onClick={() => { setShowNewMsgModal(false); setUserSearchQuery(''); setUserSearchResults([]); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Search users</label>
                <input className="form-input" type="text" placeholder="Type a name..."
                  value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} autoFocus />
              </div>
              <div style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
                {userSearchLoading ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)' }}>Searching...</div>
                ) : userSearchResults.length > 0 ? (
                  userSearchResults.filter(u => u.id !== state.user?.id).map(u => (
                    <div key={u.id} className="user-search-item" onClick={() => startNewChat(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer', borderRadius: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--blue-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                        {(u.username?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{u.username || u.id.slice(0, 8)}</div>
                        {u.headline && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.headline}</div>}
                      </div>
                    </div>
                  ))
                ) : userSearchQuery.trim().length >= 2 ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)', fontSize: 13 }}>No users found</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
        </main>
      </div>
    </div>
  );
}
