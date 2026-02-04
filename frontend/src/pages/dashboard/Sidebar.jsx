import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  PieChart,
  Users,
  Settings,
  LogOut,
  UserPlus
} from 'lucide-react';

const Sidebar = ({ activeModule }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, id: 'DASHBOARD' },
    { name: 'Inventory', path: '/inventory', icon: Package, id: 'INVENTORY' },
    { name: 'POS', path: '/pos', icon: ShoppingCart, id: 'POS' },
    { name: 'Finance', path: '/finance', icon: PieChart, id: 'FINANCE' },
    { name: 'Reporting', path: '/reporting', icon: FileText, id: 'REPORTING' },
  ];

  const adminItems = [
    { name: 'Users', path: '/admin/users', icon: Users, id: 'ADMIN_USERS' },
    { name: 'Register', path: '/register-user', icon: UserPlus, id: 'ADMIN_REGISTER' },
  ];

  const canAccess = (moduleId) => {
    if (moduleId === 'DASHBOARD') return true;
    if (user.role === 'admin') return true;
    return user.allowedModules?.includes(moduleId);
  };

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full min-h-screen fixed left-0 top-16 z-10 border-r border-slate-800">
      <div className="p-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Workspace</h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Management Console</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <div className="mb-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Main</p>
            {menuItems.map((item) => {
              const hasAccess = canAccess(item.id);
              return (
                <Link
                  key={item.id}
                  to={hasAccess ? item.path : '#'}
                  className={`
                    flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${hasAccess
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                        : 'text-slate-600 cursor-not-allowed opacity-60'}
                    ${activeModule === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : ''}
                  `}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${hasAccess ? '' : 'text-slate-600'}`} />
                  {item.name}
                  {!hasAccess && <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">Locked</span>}
                </Link>
              );
            })}
        </div>

        {user.role === 'admin' && (
          <div className="mt-8">
             <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Admin</p>
             {adminItems.map((item) => (
               <Link
                 key={item.id}
                 to={item.path}
                 className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200 hover:translate-x-1"
               >
                 <item.icon className="w-5 h-5 mr-3" />
                 {item.name}
               </Link>
             ))}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
         <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
         </div>
         <button
           onClick={logout}
           className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors"
         >
           <LogOut className="w-4 h-4 mr-2" />
           Sign Out
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
