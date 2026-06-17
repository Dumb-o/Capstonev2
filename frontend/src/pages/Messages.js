import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import WebSocketClient from '../services/websocket';
import config from '../config';
import { timeAgo } from '../utils/timeAgo';

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
  const messagesContainer = useRef(null);
  const prevMessagesLen = useRef(0);
  const isNearBottom = useRef(true);
  const wsRef = useRef(null);
  const pollingRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  const activeChatRef = useRef(activeChat);
  activeChatRef.current = activeChat;
  const allConversationsRef = useRef(allConversations);
  allConversationsRef.current = allConversations;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
    const user = state.user;
    if (!user) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsBase = config.wsUrl || 'ws://localhost:8000';
    const client = new WebSocketClient(user.id, token, { baseUrl: wsBase });

    client.on('connected', () => {
      setWsConnected(true);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    });

    client.on('disconnected', () => {
      setWsConnected(false);
      if (!pollingRef.current) {
        startPollingFallback();
      }
    });

    client.on('NEW_MESSAGE', (event) => {
      const msg = event.message;
      if (!msg) return;
      const active = activeChatRef.current;

      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        if (active && otherUserId === active.id) {
          return [...prev, msg];
        }
        return prev;
      });

      setAllConversations(prev => {
        const existing = prev.find(c => c.user.id === otherUserId);
        if (existing) {
          const isActive = active && otherUserId === active.id;
          const updated = prev.map(c =>
            c.user.id === otherUserId
              ? { ...c, last_message: msg, unread: isActive ? c.unread : (c.unread || 0) + 1 }
              : c
          );
          updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0));
          return updated;
        }
        api.get(`/users/${otherUserId}`).then(({ data: otherUser }) => {
          setAllConversations(prev2 => {
            if (prev2.some(c => c.user.id === otherUserId)) return prev2;
            return [{ user: otherUser, last_message: msg, unread: 1 }, ...prev2];
          });
        }).catch(() => {});
        return prev;
      });
    });

    client.connect();
    wsRef.current = client;

    return () => {
      client.disconnect();
      wsRef.current = null;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [state.user]);

  const startPollingFallback = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.get('/messages/conversations');
        setAllConversations(data || []);
        setConversations(data || []);
        const active = activeChatRef.current;
        if (active) {
          const { data: msgData } = await api.get(`/messages/conversations/${active.id}`);
          setMessages(msgData.messages || []);
        }
      } catch {}
    }, 5000);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setConversations(allConversations.filter(c =>
        (c.user.username || '').toLowerCase().includes(q) ||
        (c.user.headline || '').toLowerCase().includes(q) ||
        (c.last_message?.content || '').toLowerCase().includes(q)
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
    if (messages.length > prevMessagesLen.current && isNearBottom.current) {
      messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (messages.length > 0 && prevMessagesLen.current === 0) {
      messagesEnd.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevMessagesLen.current = messages.length;
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = messagesContainer.current;
    if (!el) return;
    const threshold = 100;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

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
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
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
  }, [newMessage, activeChat]);

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
                className={`conv-item ${activeChat?.id === conv.user.id ? 'active' : ''} ${conv.unread > 0 ? 'unread' : ''}`}
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
                {conv.unread > 1 && <span className="unread-badge">{conv.unread}</span>}
                {conv.unread === 1 && <span className="unread-dot" />}
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
            <div className="chat-messages" ref={messagesContainer} onScroll={handleScroll}>
              {messages.map((msg, idx) => (
                <div key={msg.id} className={`msg ${msg.sender_id === state.user?.id ? 'outgoing' : 'incoming'} ${idx === messages.length - 1 && prevMessagesLen.current > 0 && msg.sender_id !== state.user?.id ? 'msg-new' : ''}`}>
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
              {!wsConnected && (
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                  Connecting to real-time updates...
                </p>
              )}
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
