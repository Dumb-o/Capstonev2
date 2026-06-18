import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';

export default function UserSearchSelect({ label, value, onChange, role, placeholder }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value ? { id: value } : null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, limit: '20' });
      if (role) params.set('role', role);
      const { data } = await api.get(`/admin/users?${params}`);
      setResults(data.users || []);
    } catch { setResults([]); }
    setLoading(false);
  }, [role]);

  const handleInput = (val) => {
    setQuery(val);
    setSelected(null);
    onChange('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
    setOpen(true);
  };

  const handleSelect = (user) => {
    setSelected(user);
    setQuery(`${user.username || ''} (${user.email || user.id})`);
    onChange(user.id);
    setOpen(false);
    setResults([]);
  };

  useEffect(() => {
    if (value && (!selected || selected.id !== value)) {
      setSelected({ id: value });
      setQuery(`Selected: ${value.slice(0, 16)}...`);
    }
  }, [value]);

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        placeholder={placeholder || `Search users${role ? ` (${role})` : ''}...`}
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { if (query.trim()) setOpen(true); }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 8, maxHeight: 200, overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}>
          {loading && <div style={{ padding: 12, fontSize: 13, color: 'var(--text-3)' }}>Searching...</div>}
          {!loading && results.length === 0 && query.trim() && (
            <div style={{ padding: 12, fontSize: 13, color: 'var(--text-3)' }}>No users found</div>
          )}
          {results.map(u => (
            <div key={u.id} onClick={() => handleSelect(u)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-pale)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 10, minWidth: 24 }}>
                {(u.username?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username || 'Unnamed'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {u.email} <span className={`role-badge ${u.role}`} style={{ marginLeft: 4, fontSize: 10 }}>{u.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
