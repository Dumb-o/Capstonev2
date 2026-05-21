import React from 'react';

export const Toast = ({ message, show }) => {
  if (!show) return null;
  
  return (
    <div className="toast show">
      <span className="toast-icon">✓</span>
      {message}
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children, wide = false }) => {
  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div 
        className={`modal-box ${wide ? 'modal-box-wide' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>×</button>
        {title && <h2 style={{ marginBottom: '20px' }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export const Badge = ({ type, children }) => {
  const typeMap = {
    active: 'badge-active',
    pending: 'badge-pending',
    draft: 'badge-draft',
    completed: 'badge-completed'
  };
  
  return <span className={`badge ${typeMap[type] || 'badge-draft'}`}>{children}</span>;
};

export const Avatar = ({ name, size = 36 }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];
  
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  
  return (
    <div 
      className="fl-avatar" 
      style={{ 
        width: size, 
        height: size, 
        background: colors[colorIndex],
        fontSize: size * 0.36
      }}
    >
      {getInitials(name)}
    </div>
  );
};

export const StatCard = ({ label, value, sub, icon, accent = false }) => (
  <div className={`stat-card ${accent ? 'accent-card' : ''}`}>
    <div className="s-top">
      <span className="s-label">{label}</span>
      {icon && <div className="s-icon">{icon}</div>}
    </div>
    <div className="s-val">{value}</div>
    {sub && <div className="s-sub">{sub}</div>}
  </div>
);

export const ProgressBar = ({ value, label }) => (
  <div>
    {label && <div className="milestone-label">{label}</div>}
    <div className="prog-bar">
      <div className="prog-fill" style={{ width: `${value}%` }}></div>
    </div>
  </div>
);
