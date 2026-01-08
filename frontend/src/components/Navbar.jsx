import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Prevent Navbar from rendering if no user is logged in (optional safety check)
  if (!user) return null; 

  return (
    <nav className="bg-slate-900 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Side: Logo & Navigation */}
          <div className="flex items-center">
            {/* Logo Brand */}
            <Link to="/" className="flex items-center flex-shrink-0 group">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:bg-blue-500 transition-colors duration-200">
                 {/* Simple Pill/Pharma Icon */}
                 <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
              </div>
              <span className="ml-3 text-xl font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                Pharma ERP
              </span>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  to="/" 
                  className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                
                {user.role === 'admin' && (
                  <Link 
                    to="/register-user" 
                    className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Register User
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: User Profile & Actions */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              
              {/* User Info Block */}
              <div className="flex flex-col items-end mr-4">
                <span className="text-sm font-medium text-white leading-none mb-1">
                  {user.name}
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  {user.role}
                </span>
              </div>

              {/* User Avatar (Initials) */}
              <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-slate-600 shadow-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="ml-5 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Mobile menu button (Hamburger placeholder for small screens) */}
          <div className="-mr-2 flex md:hidden">
            <button className="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-slate-700 focus:outline-none">
              <svg className="block h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
