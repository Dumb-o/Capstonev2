import React from 'react';
import Navbar from '../components/shared/Navbar';
import { useApp } from '../context/AppContext';
import ClientDashboard from '../components/client/Dashboard';
import FreelancerDashboard from '../components/freelancer/Dashboard';

export default function DashboardPage() {
  const { state } = useApp();
  const isClient = state.user?.role === 'client';
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          {isClient ? <ClientDashboard /> : <FreelancerDashboard />}
        </main>
      </div>
    </div>
  );
}
