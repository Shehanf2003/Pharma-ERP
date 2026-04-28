import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CreditCard, FileText, Plus, Download, Filter, CheckCircle, Clock, Trash2
} from 'lucide-react';
import {
  getPayables, recordPayment, getExpenses, addExpense, getFinancialReport
} from '../../lib/financeApi';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { socket } from '../../lib/socket';
import ProfitOptimizer from '../../../../ml_service/ProfitOptimizer';
import axiosInstance from '../../lib/axios';

const FinancePage = () => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [stats, setStats] = useState(null);
  const [payables, setPayables] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Other', status: 'PAID', paymentMethod: 'CASH' });

  const [showUpdateExpenseModal, setShowUpdateExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [updateExpenseData, setUpdateExpenseData] = useState({ status: 'PAID', paymentMethod: 'CASH' });

  // Reports
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });
  const [chartTab, setChartTab] = useState('MONTH');
  const [previewModal, setPreviewModal] = useState({ isOpen: false, type: null, data: [] });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'OVERVIEW') {
        const dashboardData = await axiosInstance.get('/dashboard/stats');
        setStats({
           totalRevenue: dashboardData.data.finance?.revenue || 0,
           totalCOGS: dashboardData.data.finance?.cogs || 0,
           totalExpenses: dashboardData.data.finance?.expenses || 0,
           netProfit: dashboardData.data.finance?.profit || 0,
           totalPendingExpenses: dashboardData.data.finance?.pendingExpenses || 0,
           prevMonthRevenue: dashboardData.data.finance?.prevMonthRevenue || 0,
           prevMonthCOGS: dashboardData.data.finance?.prevMonthCOGS || 0,
           prevMonthExpenses: dashboardData.data.finance?.prevMonthExpenses || 0,
           prevMonthProfit: dashboardData.data.finance?.prevMonthProfit || 0,
           
           todayRevenue: dashboardData.data.finance?.todayRevenue || 0,
           todayCOGS: dashboardData.data.finance?.todayCOGS || 0,
           todayExpenses: dashboardData.data.finance?.todayExpenses || 0,
           todayProfit: dashboardData.data.finance?.todayProfit || 0,
           prevDayRevenue: dashboardData.data.finance?.prevDayRevenue || 0,
           prevDayCOGS: dashboardData.data.finance?.prevDayCOGS || 0,
           prevDayExpenses: dashboardData.data.finance?.prevDayExpenses || 0,
           prevDayProfit: dashboardData.data.finance?.prevDayProfit || 0,
        });
      } else if (activeTab === 'PAYABLES') {
        const data = await getPayables();
        setPayables(data);
      } else if (activeTab === 'EXPENSES') {
        const data = await getExpenses();
        setExpenses(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [activeTab, loadData]);

  // Handle Socket Events separately
  useEffect(() => {
      // Attach listeners
      socket.on('FINANCE_UPDATE', loadData);
      socket.on('STATS_UPDATE', loadData);

      // Cleanup listeners on unmount
      return () => {
          socket.off('FINANCE_UPDATE', loadData);
          socket.off('STATS_UPDATE', loadData);
      };
  }, [loadData]); // Only re-bind if loadData changes

  const handlePaySupplier = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;
    try {
      await recordPayment({
        purchaseOrderId: selectedPO._id,
        amount: Number(paymentAmount),
        paymentMethod
      });
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      loadData(); // Refresh
    } catch (error) {
        toast.error(error.response?.data?.message || "Payment failed");
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await addExpense(newExpense);
      toast.success("Expense added");
      setShowExpenseModal(false);
      setNewExpense({ description: '', amount: '', category: 'Other', status: 'PAID', paymentMethod: 'CASH' });
      loadData();
    } catch (error) {
      toast.error("Failed to add expense");
    }
  };

  const handleOpenUpdateExpense = (exp) => {
      setSelectedExpense(exp);
      setUpdateExpenseData({ status: exp.status, paymentMethod: exp.paymentMethod || 'CASH' });
      setShowUpdateExpenseModal(true);
  };

  const handleUpdateExpenseSubmit = async (e) => {
      e.preventDefault();
      try {
          await axiosInstance.put(`/finance/expenses/${selectedExpense._id}`, updateExpenseData);
          toast.success("Expense updated");
          setShowUpdateExpenseModal(false);
          loadData();
      } catch (error) {
          toast.error("Failed to update expense");
      }
  };

  const handleDeleteExpense = async (id) => {
      if (!window.confirm("Are you sure you want to delete this expense?")) return;
      try {
          await axiosInstance.delete(`/finance/expenses/${id}`);
          toast.success("Expense deleted");
          loadData();
      } catch (error) {
          toast.error("Failed to delete expense");
      }
  };

  const handlePreview = async (type) => {
    try {
        const data = await getFinancialReport(type, reportDateRange.start, reportDateRange.end);
        if (!data || data.length === 0) {
            return toast.error("No data to preview");
        }
        
        let flattened = [];
        if (type === 'SALES') {
            flattened = data.map(s => ({
                Receipt: s.receiptNumber,
                Date: new Date(s.createdAt).toLocaleDateString(),
                'Total Amount': s.totalAmount,
                Method: s.paymentMethod
            }));
        } else if (type === 'EXPENSES') {
            flattened = data.map(e => ({
                Description: e.description,
                Category: e.category,
                Amount: e.amount,
                Date: new Date(e.date).toLocaleDateString()
            }));
        } else if (type === 'ITEM_SALES') {
            flattened = data.map(i => ({
                Item: i.name,
                Category: i.category || 'N/A',
                'Quantity Sold': i.totalQuantity,
                Revenue: i.totalRevenue
            }));
        }
        setPreviewModal({ isOpen: true, type, data: flattened });
    } catch (error) {
        toast.error("Preview failed");
    }
  };

  const handleExport = async (type, format, preloadedData = null) => {
    try {
        let flattened = preloadedData;
        if (!flattened) {
            const data = await getFinancialReport(type, reportDateRange.start, reportDateRange.end);
            if (!data || data.length === 0) {
                return toast.error("No data to export");
            }
            if (type === 'SALES') {
                flattened = data.map(s => ({
                    Receipt: s.receiptNumber,
                    Date: new Date(s.createdAt).toLocaleDateString(),
                    'Total Amount': s.totalAmount,
                    Method: s.paymentMethod
                }));
            } else if (type === 'EXPENSES') {
                flattened = data.map(e => ({
                    Description: e.description,
                    Category: e.category,
                    Amount: e.amount,
                    Date: new Date(e.date).toLocaleDateString()
                }));
            } else if (type === 'ITEM_SALES') {
                flattened = data.map(i => ({
                    Item: i.name,
                    Category: i.category || 'N/A',
                    'Quantity Sold': i.totalQuantity,
                    Revenue: i.totalRevenue
                }));
            }
        }

        const fileName = `${type}_Report_${new Date().toISOString().split('T')[0]}`;

        if (format === 'PDF') {
            const headers = Object.keys(flattened[0]);
            exportToPDF(`${type.replace('_', ' ')} Report`, headers, flattened, `${fileName}.pdf`);
        } else {
            exportToExcel(flattened, `${fileName}.xlsx`);
        }

        toast.success("Export successful");
    } catch (error) {
        toast.error("Export failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 p-8 pt-20">
        <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
            <p className="text-gray-500">Track revenue, expenses, and supplier payments.</p>
        </header>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 mb-6 w-fit">
            {['OVERVIEW', 'PAYABLES', 'EXPENSES', 'REPORTS', 'OPTIMIZER'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    {tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
            ))}
        </div>

        {loading && (
             <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
             </div>
        )}

        {!loading && activeTab === 'OVERVIEW' && stats && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Profit & Loss Overview</h3>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setChartTab('MONTH')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                chartTab === 'MONTH' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setChartTab('TODAY')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                chartTab === 'TODAY' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Today
                        </button>
                    </div>
                </div>

                {stats.totalPendingExpenses > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-yellow-600" />
                            <div>
                                <p className="text-sm font-medium">You have outstanding pending expenses.</p>
                            </div>
                        </div>
                        <div className="text-lg font-bold">
                            Rs. {stats.totalPendingExpenses.toLocaleString()}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard 
                        title="Revenue" 
                        value={chartTab === 'MONTH' ? stats.totalRevenue : stats.todayRevenue} 
                        prevValue={chartTab === 'MONTH' ? stats.prevMonthRevenue : stats.prevDayRevenue}
                        periodLabel={chartTab === 'MONTH' ? 'month' : 'day'}
                        icon={DollarSign} color="emerald" 
                    />
                    <StatCard 
                        title="COGS" 
                        value={chartTab === 'MONTH' ? stats.totalCOGS : stats.todayCOGS} 
                        prevValue={chartTab === 'MONTH' ? stats.prevMonthCOGS : stats.prevDayCOGS}
                        periodLabel={chartTab === 'MONTH' ? 'month' : 'day'}
                        icon={TrendingUp} color="blue" 
                    />
                    <StatCard 
                        title="Expenses" 
                        value={chartTab === 'MONTH' ? stats.totalExpenses : stats.todayExpenses} 
                        prevValue={chartTab === 'MONTH' ? stats.prevMonthExpenses : stats.prevDayExpenses}
                        periodLabel={chartTab === 'MONTH' ? 'month' : 'day'}
                        icon={CreditCard} color="rose" 
                    />
                    <StatCard 
                        title="Net Profit" 
                        value={chartTab === 'MONTH' ? stats.netProfit : stats.todayProfit} 
                        prevValue={chartTab === 'MONTH' ? stats.prevMonthProfit : stats.prevDayProfit}
                        periodLabel={chartTab === 'MONTH' ? 'month' : 'day'}
                        icon={FileText} color="amber" 
                    />
                </div>

                {/* Simple P&L Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartTab === 'MONTH' ? [
                                { name: 'Revenue', amount: stats.totalRevenue || 0, fill: '#10b981' },
                                { name: 'COGS', amount: stats.totalCOGS || 0, fill: '#3b82f6' },
                                { name: 'Expenses', amount: stats.totalExpenses || 0, fill: '#f43f5e' },
                                { name: 'Net Profit', amount: stats.netProfit || 0, fill: '#f59e0b' },
                            ] : [
                                { name: 'Revenue', amount: stats.todayRevenue || 0, fill: '#10b981' },
                                { name: 'COGS', amount: stats.todayCOGS || 0, fill: '#3b82f6' },
                                { name: 'Expenses', amount: stats.todayExpenses || 0, fill: '#f43f5e' },
                                { name: 'Net Profit', amount: stats.todayProfit || 0, fill: '#f59e0b' },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(val) => `Rs. ${val.toLocaleString()}`} />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                    {(chartTab === 'MONTH' ? [
                                        { name: 'Revenue', amount: stats.totalRevenue || 0, fill: '#10b981' },
                                        { name: 'COGS', amount: stats.totalCOGS || 0, fill: '#3b82f6' },
                                        { name: 'Expenses', amount: stats.totalExpenses || 0, fill: '#f43f5e' },
                                        { name: 'Net Profit', amount: stats.netProfit || 0, fill: '#f59e0b' },
                                    ] : [
                                        { name: 'Revenue', amount: stats.todayRevenue || 0, fill: '#10b981' },
                                        { name: 'COGS', amount: stats.todayCOGS || 0, fill: '#3b82f6' },
                                        { name: 'Expenses', amount: stats.todayExpenses || 0, fill: '#f43f5e' },
                                        { name: 'Net Profit', amount: stats.todayProfit || 0, fill: '#f59e0b' },
                                    ]).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {!loading && activeTab === 'PAYABLES' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">PO Number</th>
                            <th className="px-6 py-3">Supplier</th>
                            <th className="px-6 py-3">Total Cost</th>
                            <th className="px-6 py-3">Paid</th>
                            <th className="px-6 py-3">Balance</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {payables.length === 0 ? (
                             <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No outstanding payables.</td></tr>
                        ) : payables.map(po => {
                            const balance = po.totalCost - (po.paidAmount || 0);
                            return (
                                <tr key={po._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{po.poNumber}</td>
                                    <td className="px-6 py-4">{po.supplier?.name}</td>
                                    <td className="px-6 py-4">Rs. {po.totalCost.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-emerald-600">Rs. {(po.paidAmount||0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-red-600 font-medium">Rs. {balance.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            po.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {po.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => { setSelectedPO(po); setPaymentAmount(balance); setShowPaymentModal(true); }}
                                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                                        >
                                            Pay
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {!loading && activeTab === 'EXPENSES' && (
            <div className="space-y-4">
                 <div className="flex justify-end">
                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                    </button>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Payment Method</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {expenses.map(exp => (
                                <tr key={exp._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{exp.description}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            {exp.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900">Rs. {exp.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {exp.status === 'PENDING' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                <Clock className="w-3 h-3 mr-1" /> Pending
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Paid
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{(exp.status === 'PAID' && exp.paymentMethod) ? exp.paymentMethod : '-'}</td>
                                <td className="px-6 py-4 flex space-x-3 items-center">
                                        <button
                                            onClick={() => handleOpenUpdateExpense(exp)}
                                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                                        >
                                            Update
                                        </button>
                                    <button
                                        onClick={() => handleDeleteExpense(exp._id)}
                                        className="text-red-600 hover:text-red-900 font-medium"
                                        title="Delete Expense"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    </td>
                                </tr>
                             ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {!loading && activeTab === 'REPORTS' && (
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Generate Reports</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            onChange={e => setReportDateRange({...reportDateRange, start: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            onChange={e => setReportDateRange({...reportDateRange, end: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-900">Sales Report</h4>
                            <p className="text-sm text-gray-500">Detailed list of all completed sales.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handlePreview('SALES')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200">Preview</button>
                            <button onClick={() => handleExport('SALES', 'PDF')} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">PDF</button>
                            <button onClick={() => handleExport('SALES', 'EXCEL')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">Excel</button>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-900">Item Sales Report</h4>
                            <p className="text-sm text-gray-500">Quantity and revenue of each item sold.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handlePreview('ITEM_SALES')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200">Preview</button>
                            <button onClick={() => handleExport('ITEM_SALES', 'PDF')} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">PDF</button>
                            <button onClick={() => handleExport('ITEM_SALES', 'EXCEL')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">Excel</button>
                        </div>
                    </div>

                     <div className="p-4 border border-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-900">Expense Report</h4>
                            <p className="text-sm text-gray-500">Breakdown of operational expenses.</p>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => handlePreview('EXPENSES')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200">Preview</button>
                             <button onClick={() => handleExport('EXPENSES', 'PDF')} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">PDF</button>
                            <button onClick={() => handleExport('EXPENSES', 'EXCEL')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">Excel</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {!loading && activeTab === 'OPTIMIZER' && (
            <ProfitOptimizer />
        )}

      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Record Supplier Payment</h3>
                <p className="text-sm text-gray-500 mb-4">PO: {selectedPO?.poNumber} | Total Due: Rs. {(selectedPO?.totalCost - (selectedPO?.paidAmount||0)).toLocaleString()}</p>
                <form onSubmit={handlePaySupplier}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount</label>
                            <input type="number" required max={selectedPO?.totalCost - (selectedPO?.paidAmount||0)} className="w-full border-gray-300 rounded-lg" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Method</label>
                            <select className="w-full border-gray-300 rounded-lg" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="ONLINE">Online</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-6 gap-3">
                        <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Confirm Payment</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Add New Expense</h3>
                    <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>
                <form onSubmit={handleAddExpense}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input type="text" required placeholder="E.g., Office Supplies" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
                                <input type="number" required min="0" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                                    <option value="Rent">Rent</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Salaries">Salaries</option>
                                    <option value="Supplies">Supplies</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white" value={newExpense.status} onChange={e => setNewExpense({...newExpense, status: e.target.value})}>
                                    <option value="PAID">Paid</option>
                                    <option value="PENDING">Pending</option>
                                </select>
                            </div>
                            {newExpense.status === 'PAID' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white" value={newExpense.paymentMethod} onChange={e => setNewExpense({...newExpense, paymentMethod: e.target.value})}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="ONLINE">Online</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end mt-8 gap-3">
                        <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</button>
                        <button type="submit" className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Save Expense</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Update Expense Modal */}
      {showUpdateExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Update Expense</h3>
                    <button onClick={() => setShowUpdateExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>
                <form onSubmit={handleUpdateExpenseSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={updateExpenseData.status} onChange={e => setUpdateExpenseData({...updateExpenseData, status: e.target.value})}>
                                <option value="PENDING">Pending</option>
                                <option value="PAID">Paid</option>
                            </select>
                        </div>
                        {updateExpenseData.status === 'PAID' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={updateExpenseData.paymentMethod} onChange={e => setUpdateExpenseData({...updateExpenseData, paymentMethod: e.target.value})}>
                                    <option value="CASH">Cash</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="ONLINE">Online</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-6 gap-3">
                        <button type="button" onClick={() => setShowUpdateExpenseModal(false)} className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Update</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold capitalize">{previewModal.type.replace('_', ' ').toLowerCase()} Preview</h3>
                    <button onClick={() => setPreviewModal({ isOpen: false, type: null, data: [] })} className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none">
                        &times;
                    </button>
                </div>
                
                <div className="overflow-auto flex-1 border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 shadow-sm">
                            <tr>
                                {previewModal.data.length > 0 && Object.keys(previewModal.data[0]).map(key => (
                                    <th key={key} className="px-4 py-3">{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {previewModal.data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    {Object.values(row).map((val, i) => (
                                        <td key={i} className="px-4 py-3">{typeof val === 'number' ? val.toLocaleString() : val}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mt-6 gap-3">
                    <button onClick={() => handleExport(previewModal.type, 'PDF', previewModal.data)} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">Download PDF</button>
                    <button onClick={() => handleExport(previewModal.type, 'EXCEL', previewModal.data)} className="px-4 py-2 text-sm font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">Download Excel</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
        rose: 'bg-rose-100 text-rose-600',
        amber: 'bg-amber-100 text-amber-600',
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center">
            <div className={`p-3 rounded-lg ${colorClasses[color] || 'bg-gray-100'}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">Rs. {value?.toLocaleString() || 0}</p>
            </div>
        </div>
    );
};

export default FinancePage;