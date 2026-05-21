import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
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
        <Sidebar />
        <main className="main-content messages-page">
          <div className="messages-container">
            <div className="conversations-list">
              <h3>Conversations</h3>
              {conversations.map((conv) => (
                <div
                  key={conv.user.id}
                  className={`conversation-item ${activeChat?.id === conv.user.id ? 'active' : ''}`}
                  onClick={() => setActiveChat(conv.user)}
                >
                  <div className="conv-name">
                    {conv.user.username || conv.user.id.slice(0, 8)}
                    {conv.unread > 0 && <span className="unread-badge">{conv.unread}</span>}
                  </div>
                  <div className="conv-preview">{conv.last_message?.content?.slice(0, 50)}</div>
                </div>
              ))}
              {conversations.length === 0 && !loading && (
                <p className="empty-text">No conversations</p>
              )}
            </div>

            <div className="chat-area">
              {activeChat ? (
                <>
                  <div className="chat-header">
                    {activeChat.username || activeChat.id.slice(0, 8)}
                  </div>
                  <div className="chat-messages">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message ${msg.sender_id === state.user?.id ? 'sent' : 'received'}`}
                      >
                        <div className="message-bubble">{msg.content}</div>
                        <div className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEnd} />
                  </div>
                  <div className="chat-input">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                    />
                    <button onClick={sendMessage} className="btn btn-primary btn-sm">Send</button>
                  </div>
                </>
              ) : (
                <div className="chat-empty">
                  <p>Select a conversation to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
