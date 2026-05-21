import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Loading from './components/shared/Loading';
import Home from './pages/Home';
import Login from './components/auth/Login';
import DashboardPage from './pages/DashboardPage';
import CreateContract from './pages/CreateContract';
import ContractDetailPage from './pages/ContractDetailPage';
import MyContracts from './pages/MyContracts';
import ExploreJobs from './pages/ExploreJobs';
import JobDetail from './pages/JobDetail';
import MessagesPage from './pages/Messages';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import './css/styles.css';

function ProtectedRoute({ children }) {
  const { state } = useApp();
  if (state.loading) return <Loading />;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function ClientRoute({ children }) {
  const { state } = useApp();
  if (state.loading) return <Loading />;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  if (state.user?.role !== 'client') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { state } = useApp();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
      />
      <Route
        path="/create-contract"
        element={<ClientRoute><CreateContract /></ClientRoute>}
      />
      <Route
        path="/contracts"
        element={<ProtectedRoute><MyContracts /></ProtectedRoute>}
      />
      <Route
        path="/contracts/:id"
        element={<ProtectedRoute><ContractDetailPage /></ProtectedRoute>}
      />
      <Route
        path="/jobs/:id"
        element={<ProtectedRoute><JobDetail /></ProtectedRoute>}
      />
      <Route
        path="/jobs"
        element={<ProtectedRoute><ExploreJobs /></ProtectedRoute>}
      />
      <Route
        path="/messages"
        element={<ProtectedRoute><MessagesPage /></ProtectedRoute>}
      />
      <Route
        path="/profile"
        element={<ProtectedRoute><Profile /></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ClientRoute><AdminPanel /></ClientRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
