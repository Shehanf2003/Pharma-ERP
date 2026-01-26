import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Added Outlet here
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import RegisterUser from './pages/RegisterUser';
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import POSPage from './pages/pos/POSPage';
import SalesHistory from './pages/pos/SalesHistory';
import BillView from './pages/BillView';
import { ProtectedRoute } from './components/ProtectedRoute';

import Navbar from './components/Navbar';

// This layout wraps pages that need the Navbar
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />
            <Route path="/bill/:id" element={<BillView />} />

            {/* Protected Routes Wrapper (Apply Layout & Auth Check) */}
            <Route element={<AppLayout />}>
              
              <Route element={<ProtectedRoute />}>
                 <Route path="/" element={<Dashboard />} />
                 <Route path="/register-user" element={<RegisterUser />} />
              </Route>

              <Route element={<ProtectedRoute requiredModule="INVENTORY" />}>
                <Route path="/inventory" element={<InventoryDashboard />} />
              </Route>

              <Route element={<ProtectedRoute requiredModule="POS" />}>
                <Route path="/pos" element={<POSPage />} />
                <Route path="/pos/history" element={<SalesHistory />} />
              </Route>

              <Route element={<ProtectedRoute requiredModule="FINANCE" />}>
                <Route path="/finance" element={<ModulePage name="Finance Module" endpoint="/api/auth/finance" />} />
              </Route>

              <Route element={<ProtectedRoute requiredModule="REPORTING" />}>
                <Route path="/reporting" element={<ModulePage name="Reporting Module" endpoint="/api/auth/reporting" />} />
              </Route>

            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;