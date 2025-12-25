import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export const ProtectedRoute = ({ requiredModule }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (requiredModule) {
    if (user.role !== 'admin' && !user.allowedModules.includes(requiredModule)) {
       return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Access Denied: You do not have permission to view this module.</div>;
    }
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};
