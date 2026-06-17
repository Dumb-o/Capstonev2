import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { connectNotificationWs, disconnectNotificationWs } from '../../services/notificationWebSocket';

export default function NotificationListener() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    const user = state.user;
    if (!user || !state.isAuthenticated) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const client = connectNotificationWs(user.id, token, dispatch);

    return () => {
      disconnectNotificationWs();
    };
  }, [state.user, state.isAuthenticated, dispatch]);

  return null;
}
