import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  const canAccess = (module) => {
    if (user.role === 'admin') return true;
    return user.allowedModules.includes(module);
  };

  // Define modules with added icons and Tailwind color themes
  const modules = [
    { 
      name: 'Inventory', 
      id: 'INVENTORY', 
      path: '/inventory', 
      theme: 'cyan',
      description: 'Stock levels, batches & suppliers',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      name: 'POS', 
      id: 'POS', 
      path: '/pos', 
      theme: 'emerald',
      description: 'Billing & customer checkout',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      name: 'Finance', 
      id: 'FINANCE', 
      path: '/finance', 
      theme: 'amber',
      description: 'Ledgers, expenses & profits',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      name: 'Reporting', 
      id: 'REPORTING', 
      path: '/reporting', 
      theme: 'indigo',
      description: 'Analytics & performance insights',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
  ];

  // Helper to get color classes dynamically based on the module theme
  const getThemeClasses = (theme, isLocked) => {
    if (isLocked) return 'bg-gray-100 border-gray-200 text-gray-400';
    
    const themes = {
      cyan: 'bg-white border-cyan-100 hover:border-cyan-300 hover:shadow-cyan-100 text-cyan-600',
      emerald: 'bg-white border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100 text-emerald-600',
      amber: 'bg-white border-amber-100 hover:border-amber-300 hover:shadow-amber-100 text-amber-600',
      indigo: 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-100 text-indigo-600',
    };
    return themes[theme] || themes.cyan;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="mt-1 text-gray-500">Welcome back, <span className="font-semibold text-gray-800">{user.name}</span></p>
          </div>
          <div className="mt-4 md:mt-0">
             <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {user.role === 'admin' ? 'Administrator' : 'Staff Account'}
             </span>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod) => {
            const hasAccess = canAccess(mod.id);
            const themeClasses = getThemeClasses(mod.theme, !hasAccess);

            return (
              <div 
                key={mod.id} 
                className={`
                  relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ease-in-out
                  ${themeClasses}
                  ${hasAccess ? 'shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer' : 'cursor-not-allowed opacity-75'}
                `}
              >
                {/* Icon Container */}
                <div className={`p-3 rounded-xl w-fit mb-4 ${hasAccess ? `bg-${mod.theme}-50` : 'bg-gray-200'}`}>
                  {mod.icon}
                </div>

                {/* Text Content */}
                <h3 className={`text-xl font-bold mb-2 ${hasAccess ? 'text-gray-900' : 'text-gray-500'}`}>
                  {mod.name}
                </h3>
                <p className="text-sm text-gray-500 mb-6 flex-grow">
                  {mod.description}
                </p>

                {/* Action Area */}
                <div className="mt-auto">
                  {hasAccess ? (
                    <Link 
                      to={mod.path} 
                      className={`
                        inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
                        bg-${mod.theme}-600 hover:bg-${mod.theme}-700
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${mod.theme}-500
                      `}
                    >
                      Access Module &rarr;
                    </Link>
                  ) : (
                    <div className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg border border-gray-200">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Access Locked
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;