import React, { useEffect } from 'react';

const COLORS = {
  success: { bg: '#059669', icon: '✓' },
  error: { bg: '#dc2626', icon: '✕' },
  info: { bg: '#2563eb', icon: 'ℹ' },
};

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;

  const c = COLORS[type] || COLORS.info;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, color: '#fff', padding: '12px 20px',
      borderRadius: 8, fontSize: 14, fontWeight: 500,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'slideUp 0.25s ease',
    }}>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{c.icon}</span>
      {message}
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
        fontSize: 16, marginLeft: 8, opacity: 0.7, padding: 0,
      }}>×</button>
    </div>
  );
}
