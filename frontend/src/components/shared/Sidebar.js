import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/jobs', label: 'Explore Jobs', icon: '○' },
  { to: '/contracts', label: 'My Contracts', icon: '◈' },
  { to: '/messages', label: 'Messages', icon: '✉' },
  { to: '/profile', label: 'Profile', icon: '●' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-links">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`sidebar-link ${location.pathname === link.to ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
