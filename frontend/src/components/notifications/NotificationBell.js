import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchNotifications, markNotificationRead, fetchUnreadCount } from '../../services/notifications';
import './NotificationBell.css';

const TYPE_LABELS = {
  proposal: 'Proposal',
  contract: 'Contract',
  milestone: 'Milestone',
  dispute: 'Dispute',
};

export default function NotificationBell() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (state.isAuthenticated) {
      fetchUnreadCount()
        .then((data) => dispatch({ type: 'SET_UNREAD_COUNT', payload: data.unread_count }))
        .catch(() => console.warn('Failed to fetch unread count'));
    }
  }, [state.isAuthenticated, dispatch]);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = async () => {
    if (!open) {
      setLoading(true);
      try {
        const data = await fetchNotifications({ limit: 20 });
        dispatch({ type: 'SET_BELL_NOTIFICATIONS', payload: data.notifications || [] });
      } catch {
        console.warn('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      dispatch({
        type: 'SET_BELL_NOTIFICATIONS',
        payload: (state.bellNotifications || []).map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
      });
      const newCount = Math.max(0, state.unreadCount - 1);
      dispatch({ type: 'SET_UNREAD_COUNT', payload: newCount });
    } catch {
      console.warn('Failed to mark notification as read');
    }
  };

  const unread = (state.bellNotifications || []).filter((n) => !n.is_read).length;

  return (
    <div className="notification-bell-container" ref={menuRef}>
      <button className="notification-bell-btn" onClick={handleToggle} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {((state.unreadCount || 0) > 0) && <span className="notification-badge">{(state.unreadCount || 0) > 99 ? '99+' : state.unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">Notifications</div>
          {loading ? (
            <div className="notification-loading">Loading...</div>
          ) : (state.bellNotifications || []).length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            <div className="notification-list">
              {(state.bellNotifications || []).map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="notification-item-type">{TYPE_LABELS[n.type] || n.type}</div>
                  <div className="notification-item-title">{n.title}</div>
                  <div className="notification-item-body">{n.body}</div>
                  <div className="notification-item-time">
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
