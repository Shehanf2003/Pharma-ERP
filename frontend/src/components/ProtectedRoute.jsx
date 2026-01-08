import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Note: We removed the Navbar import to prevent the "Double Navbar" issue

export const ProtectedRoute = ({ requiredModule }) => {
  const { user, loading } = useAuth();

  // 1. Modern Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-500 font-medium">Authenticating...</p>
      </div>
    );
  }

  // 2. Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Permission Check (Access Denied UI)
  if (requiredModule) {
    if (user.role !== 'admin' && !user.allowedModules.includes(requiredModule)) {
       return (
         <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
           <div className="sm:mx-auto sm:w-full sm:max-w-md">
             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
               <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
             </div>
             <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
               Access Denied
             </h2>
             <p className="mt-2 text-center text-sm text-gray-600">
               You do not have permission to view the <span className="font-semibold text-gray-900">{requiredModule}</span> module.
             </p>
             <div className="mt-6 text-center">
               <Link to="/" className="text-base font-medium text-blue-600 hover:text-blue-500">
                 &larr; Return to Dashboard
               </Link>
             </div>
           </div>
         </div>
       );
    }
  }

  // 4. Render the Child Route
  // We strictly return Outlet only. The Navbar is now handled by AppLayout in App.jsx.
  return <Outlet />;
};
