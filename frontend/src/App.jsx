import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import RegisterUser from './pages/RegisterUser';
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import UserManagement from './pages/admin/UserManagement';

// Import Components
import Navbar from './components/Navbar';
import ReloadPrompt from './components/ReloadPrompt';
import OfflineIndicator from './components/OfflineIndicator';

// --- Internal Layout Component ---
// This wraps all authenticated pages to ensure they have the Navbar and consistent background
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ReloadPrompt />
      <OfflineIndicator />
      {/* The Outlet renders the child route (Dashboard, Inventory, etc.) */}
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
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            
            {/* --- Public Routes (No Navbar) --- */}
            <Route path="/login" element={<Login />} />

            {/* --- Protected Routes (Wrapped in Navbar Layout) --- */}
            {/* 1. First, check if user is logged in (ProtectedRoute) */}
            <Route element={<ProtectedRoute />}>
              
              {/* 2. Then, render the Layout (Navbar + Background) */}
              <Route element={<AppLayout />}>
                
                {/* General Access */}
                <Route path="/" element={<Dashboard />} />
                
                {/* Admin Access */}
                <Route path="/register-user" element={<RegisterUser />} />
                <Route path="/admin/users" element={<UserManagement />} />

                {/* Module Specific Access */}
                {/* These routes check for specific permissions before rendering */}
                
                <Route element={<ProtectedRoute requiredModule="INVENTORY" />}>
                 { /*<Route path="/inventory" element={<InventoryList />} />*/}
                  <Route path="/inventory" element={<InventoryDashboard />} />
                </Route>

                <Route element={<ProtectedRoute requiredModule="POS" />}>
                  <Route path="/pos" element={<ModulePage name="POS Module" endpoint="/api/auth/pos" />} />
                </Route>

                <Route element={<ProtectedRoute requiredModule="FINANCE" />}>
                  <Route path="/finance" element={<ModulePage name="Finance Module" endpoint="/api/auth/finance" />} />
                </Route>

                <Route element={<ProtectedRoute requiredModule="REPORTING" />}>
                  <Route path="/reporting" element={<ModulePage name="Reporting Module" endpoint="/api/auth/reporting" />} />
                </Route>

              </Route>
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
            
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;