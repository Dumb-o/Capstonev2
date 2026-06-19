import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Loading from './components/shared/Loading';
import Home from './pages/Home';
import Login from './components/auth/Login';
import NotificationListener from './components/notifications/NotificationListener';
import ToastContainer from './components/shared/ToastContainer';
import DashboardPage from './pages/DashboardPage';
import CreateContract from './pages/CreateContract';
import ContractDetailPage from './pages/ContractDetailPage';
import MyContracts from './pages/MyContracts';
import ExploreJobs from './pages/ExploreJobs';
import JobDetail from './pages/JobDetail';
import FreelancerDirectory from './pages/FreelancerDirectory';
import MessagesPage from './pages/Messages';
import Profile from './pages/Profile';
import './css/styles.css';

const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));

function ProtectedRoute({ children }) {
  const { state } = useApp();
  if (state.loading) return <Loading />;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function FreelancerRoute({ children }) {
  const { state } = useApp();
  if (state.loading) return <Loading />;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  if (state.user?.role !== 'freelancer') return <Navigate to="/client/dashboard" replace />;
  return children;
}

function ClientRoute({ children }) {
  const { state } = useApp();
  if (state.loading) return <Loading />;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  if (state.user?.role !== 'client') return <Navigate to="/freelancer/dashboard" replace />;
  return children;
}

function DashboardRedirect() {
  const { state } = useApp();
  if (state.loading) return <Loading />;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  if (state.user?.role === 'client') return <Navigate to="/client/dashboard" replace />;
  return <Navigate to="/freelancer/dashboard" replace />;
}

function AdminRoute({ children }) {
  const { state } = useApp();
  const isAdminMode = process.env.REACT_APP_ADMIN_MODE === 'true';
  if (state.loading) return <Loading />;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  if (state.user?.role !== 'admin') return <Navigate to={isAdminMode ? "/login" : "/dashboard"} replace />;
  return children;
}

function AppRoutes() {
  const { state } = useApp();
  const isAdminMode = process.env.REACT_APP_ADMIN_MODE === 'true';

  if (isAdminMode) {
    return (
      <React.Suspense fallback={<Loading />}>
        <NotificationListener />
        <Routes>
          <Route path="/login" element={state.isAuthenticated && state.user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Login />} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </React.Suspense>
    );
  }

  return (
    <>
      <NotificationListener />
      <Routes>
        <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={<DashboardRedirect />}
      />
      <Route
        path="/client/dashboard"
        element={<ClientRoute><DashboardPage /></ClientRoute>}
      />
      <Route
        path="/freelancer/dashboard"
        element={<FreelancerRoute><DashboardPage /></FreelancerRoute>}
      />
      <Route
        path="/create-contract"
        element={<ClientRoute><CreateContract /></ClientRoute>}
      />
      <Route
        path="/client/create-contract"
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
        path="/freelancers"
        element={<ClientRoute><FreelancerDirectory /></ClientRoute>}
      />
      <Route
        path="/messages"
        element={<ProtectedRoute><MessagesPage /></ProtectedRoute>}
      />
      <Route
        path="/profile"
        element={<ProtectedRoute><Profile /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
    );
  }

export default function App() {
  return (
    <AppProvider>
      <ToastContainer />
      <AppRoutes />
    </AppProvider>
  );
}
