import React from 'react';
import { useApp } from '../../context/AppContext';
import Toast from './Toast';

export default function ToastContainer() {
  const { state, dispatch } = useApp();
  if (!state.toastNotifications.length) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {state.toastNotifications.map(t => (
        <Toast
          key={t._id}
          message={t.message}
          type={t.type}
          onClose={() => dispatch({ type: 'REMOVE_TOAST', payload: t._id })}
        />
      ))}
    </div>
  );
}