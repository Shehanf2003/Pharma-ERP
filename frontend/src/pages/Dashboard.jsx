import React, { useEffect, useState } from 'react';
import Sidebar from './dashboard/Sidebar';
import StatCard from './dashboard/StatCard';
import RevenueChart from './dashboard/RevenueChart';
import axiosInstance from '../lib/axios';
import { Package, ShoppingCart, TrendingUp, AlertCircle, Plus, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Other' });

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get('/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
        await axiosInstance.post('/finance', newExpense);
        toast.success('Expense added!');
        setShowExpenseModal(false);
        setNewExpense({ description: '', amount: '', category: 'Other' });
        fetchStats(); // Update dashboard
    } catch (error) {
        toast.error('Failed to add expense');
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Layout */}
      <Sidebar activeModule="DASHBOARD" />

      {/* Main Content Area - offset by sidebar width */}
      <div className="ml-64 p-8 pt-24"> {/* pt-24 to clear fixed Navbar if it exists, or just spacing */}

        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-500 mt-1">Real-time insights and performance metrics.</p>
            </div>
            <div className="flex gap-3">
                 <button
                   onClick={() => setShowExpenseModal(true)}
                   className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-colors text-sm font-medium"
                 >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                 </button>
                 <button
                   onClick={() => window.location.href='/pos'}
                   className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors text-sm font-medium"
                 >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    New Sale
                 </button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <StatCard
             title="Total Revenue"
             value={`Rs. ${stats?.finance?.revenue?.toLocaleString() || 0}`}
             icon={DollarSign}
             color="emerald"
             trend="up"
             trendValue="+12%"
           />
           <StatCard
             title="Today's Sales"
             value={stats?.pos?.todayCount || 0}
             icon={ShoppingCart}
             color="indigo"
           />
            <StatCard
             title="Low Stock Items"
             value={stats?.inventory?.activeProducts || 0}
             icon={AlertCircle}
             color="rose"
             trend={stats?.inventory?.activeProducts > 0 ? 'down' : 'up'} // 'down' is bad here visually, but contextually 'red' means alert
             trendValue="Needs Action"
           />
           <StatCard
             title="Net Profit (Month)"
             value={`Rs. ${stats?.finance?.profit?.toLocaleString() || 0}`}
             icon={TrendingUp}
             color="amber"
           />
        </div>

        {/* Charts & Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Sales Trend</h3>
                    <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2">
                        <option>Last 7 Days</option>
                        <option>This Month</option>
                    </select>
                </div>
                <RevenueChart data={stats?.chartData || []} />
            </div>

            {/* Side Panel (e.g. Recent Activity or Quick Actions) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Stats</h3>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-gray-500">Inventory Health</span>
                            <span className="text-indigo-600">Good</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                    </div>

                    <div>
                         <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-gray-500">Monthly Target</span>
                            <span className="text-emerald-600">Rs. {stats?.finance?.revenue?.toLocaleString()} / 500k</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min((stats?.finance?.revenue / 500000) * 100, 100)}%` }}></div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 mt-auto">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Expiring Batches (Next 7 Days)</h4>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center text-red-700">
                                <Package className="w-5 h-5 mr-3" />
                                <span className="text-sm font-medium">Warning</span>
                            </div>
                            <span className="text-lg font-bold text-red-700">{stats?.inventory?.expiringBatches || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Add Quick Expense</h3>
                <form onSubmit={handleAddExpense}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                              value={newExpense.description}
                              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs)</label>
                            <input
                              type="number"
                              required
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                              value={newExpense.amount}
                              onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                               value={newExpense.category}
                               onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                            >
                                <option value="Rent">Rent</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Salaries">Salaries</option>
                                <option value="Supplies">Supplies</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowExpenseModal(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                        >
                            Save Expense
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
