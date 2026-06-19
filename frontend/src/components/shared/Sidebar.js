import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const clientLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/create-contract', label: 'Post a Job', icon: '⊕' },
  { to: '/jobs', label: 'Explore Jobs', icon: '○' },
  { to: '/contracts', label: 'My Contracts', icon: '◈' },
  { to: '/messages', label: 'Messages', icon: '✉' },
  { to: '/profile', label: 'Profile', icon: '●' },
];

const freelancerLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/jobs', label: 'Find Jobs', icon: '○' },
  { to: '/contracts', label: 'My Contracts', icon: '◈' },
  { to: '/messages', label: 'Messages', icon: '✉' },
  { to: '/profile', label: 'Profile', icon: '●' },
];

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/contracts', label: 'All Contracts', icon: '◈' },
  { to: '/messages', label: 'Messages', icon: '✉' },
  { to: '/profile', label: 'Profile', icon: '●' },
];

export default function Sidebar() {
  const { state } = useApp();
  const location = useLocation();
  const role = state.user?.role;
  const isClient = role === 'client';
  const isAdmin = role === 'admin';
  const links = isAdmin ? adminLinks : isClient ? clientLinks : freelancerLinks;
  const roleLabel = isAdmin ? 'ADMIN' : isClient ? 'CLIENT' : 'FREELANCER';

  return (
    <aside className="sidebar">
      <div className="sidebar-role">{roleLabel}</div>
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
