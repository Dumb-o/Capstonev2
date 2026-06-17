import api from './api';

export async function fetchNotifications(params = {}) {
  const response = await api.get('/notifications', { params });
  return response.data;
}

export async function fetchUnreadCount() {
  const response = await api.get('/notifications/unread');
  return response.data;
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}
