import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getStoredUser, isConnected, fetchCurrentUser, logout as authLogout } from '../services/auth';
import { fetchUnreadCount } from '../services/notifications';

const AppContext = createContext();

const initialState = {
  user: getStoredUser(),
  isAuthenticated: isConnected(),
  loading: true,
  walletAddress: null,
  contracts: [],
  toastNotifications: [],
  bellNotifications: [],
  unreadCount: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false };
    case 'CLEAR_USER':
      return { ...state, user: null, isAuthenticated: false, loading: false, bellNotifications: [], unreadCount: 0 };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_WALLET':
      return { ...state, walletAddress: action.payload };
    case 'SET_CONTRACTS':
      return { ...state, contracts: action.payload };
    case 'ADD_TOAST':
      return { ...state, toastNotifications: [...state.toastNotifications, action.payload] };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toastNotifications: state.toastNotifications.filter((_, i) => i !== action.payload),
      };
    case 'SET_BELL_NOTIFICATIONS':
      return { ...state, bellNotifications: action.payload };
    case 'ADD_BELL_NOTIFICATION':
      return { ...state, bellNotifications: [action.payload, ...state.bellNotifications] };
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    case 'CLEAR_BELL':
      return { ...state, bellNotifications: [], unreadCount: 0 };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    async function init() {
      if (isConnected()) {
        try {
          const user = await fetchCurrentUser();
          dispatch({ type: 'SET_USER', payload: user });
        } catch {
          dispatch({ type: 'CLEAR_USER' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    init();
  }, []);

  const logout = async () => {
    await authLogout();
    dispatch({ type: 'CLEAR_USER' });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
