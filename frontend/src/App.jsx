import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import RegisterUser from './pages/RegisterUser';
import UserManagement from './pages/admin/UserManagement';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
               <Route path="/" element={<Dashboard />} />
            </Route>

            <Route element={<ProtectedRoute />}>
               <Route path="/register-user" element={<RegisterUser />} />
               <Route path="/admin/users" element={<UserManagement />} />
            </Route>

            <Route element={<ProtectedRoute requiredModule="INVENTORY" />}>
              <Route path="/inventory" element={<ModulePage name="Inventory Module" endpoint="/api/auth/inventory" />} />
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
