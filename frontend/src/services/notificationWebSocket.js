import WebSocketClient from './websocket';
import config from '../config';

let instance = null;

function notificationListener(dispatch) {
  if (instance) return instance;
  instance = { dispatch, ws: null };
  return instance;
}

export function connectNotificationWs(userId, token, dispatch) {
  if (!userId || !token) return null;
  const nw = notificationListener(dispatch);
  if (nw.ws) return nw.ws;
  const wsBase = config.wsUrl || 'ws://localhost:8000';
  const client = new WebSocketClient(userId, token, { baseUrl: wsBase });
  client.on('NOTIFICATION', (event) => {
    if (event.notification) {
      dispatch({ type: 'ADD_BELL_NOTIFICATION', payload: event.notification });
    }
    if (typeof event.unread_count === 'number') {
      dispatch({ type: 'SET_UNREAD_COUNT', payload: event.unread_count });
    }
  });
  client.connect();
  nw.ws = client;
  return client;
}

export function disconnectNotificationWs() {
  if (instance && instance.ws) {
    instance.ws.disconnect();
    instance.ws = null;
  }
  instance = null;
}
