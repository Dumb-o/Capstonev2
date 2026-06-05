import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/shared/Navbar';
import Loading from '../components/shared/Loading';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function MessagesPage() {
  const { state } = useApp();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/messages/conversations');
        setConversations(data || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const { data } = await api.post('/messages/send', {
        receiver_id: activeChat.id,
        content: newMessage,
      });
      setMessages([...messages, data]);
      setNewMessage('');
    } catch {}
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body" style={{ maxWidth: '100%', padding: 0 }}>
            <div className="messages-layout" style={{ margin: 32, borderRadius: 'var(--radius-lg)' }}>
              <div className="conv-sidebar">
                <div className="conv-header">
                  <h2>Messages</h2>
                  <div className="conv-search-wrap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input className="conv-search" placeholder="Search conversations..." />
                  </div>
                </div>
                <div className="conv-list">
                  {loading ? (
                    <Loading />
                  ) : conversations.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                      No conversations yet
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
                              {conv.last_message?.created_at ? new Date(conv.last_message.created_at).toLocaleDateString() : ''}
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
                        <button className="back-btn" onClick={() => setMobileOpen(false)} style={{ display: 'none' }}>←</button>
                        <div className="chat-avatar" style={{ background: 'linear-gradient(135deg, var(--blue), var(--blue-light))' }}>
                          {(activeChat.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="chat-name">{activeChat.username || activeChat.id.slice(0, 8)}</div>
                          <div className="chat-status">Online</div>
                        </div>
                      </div>
                    </div>
                    <div className="chat-messages">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`msg ${msg.sender_id === state.user?.id ? 'outgoing' : 'incoming'}`}>
                          <div className="msg-bubble">{msg.content}</div>
                          <div className="msg-time">{new Date(msg.created_at).toLocaleTimeString()}</div>
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
