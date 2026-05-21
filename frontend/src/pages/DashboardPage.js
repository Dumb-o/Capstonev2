import React from 'react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
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
        <Sidebar />
        <main className="main-content">
          <DashboardContent isClient={isClient} />
        </main>
      </div>
    </div>
  );
}

function DashboardContent({ isClient }) {
  return isClient ? <ClientDashboard /> : <FreelancerDashboard />;
}
