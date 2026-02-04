import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import {
  DollarSign, TrendingUp, CreditCard, FileText, Plus, Download, Filter
} from 'lucide-react';
import {
  getFinancialStats, getPayables, recordPayment, getExpenses, addExpense, getFinancialReport
} from '../../lib/financeApi';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

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
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Other' });

  // Reports
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'OVERVIEW') {
        const data = await getFinancialStats();
        setStats(data);
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
  };

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
      setNewExpense({ description: '', amount: '', category: 'Other' });
      loadData();
    } catch (error) {
      toast.error("Failed to add expense");
    }
  };

  const handleExport = async (type, format) => {
    try {
        const data = await getFinancialReport(type, reportDateRange.start, reportDateRange.end);
        if (!data || data.length === 0) {
            return toast.error("No data to export");
        }

        const fileName = `${type}_Report_${new Date().toISOString().split('T')[0]}`;

        if (type === 'SALES') {
            const flattened = data.map(s => ({
                Receipt: s.receiptNumber,
                Date: new Date(s.createdAt).toLocaleDateString(),
                Total: s.totalAmount,
                Method: s.paymentMethod
            }));

            if (format === 'PDF') {
                exportToPDF('Sales Report', ['Receipt', 'Date', 'Total', 'Method'], flattened, `${fileName}.pdf`);
            } else {
                exportToExcel(flattened, `${fileName}.xlsx`);
            }
        } else if (type === 'EXPENSES') {
             const flattened = data.map(e => ({
                Description: e.description,
                Category: e.category,
                Amount: e.amount,
                Date: new Date(e.date).toLocaleDateString()
            }));

             if (format === 'PDF') {
                exportToPDF('Expense Report', ['Description', 'Category', 'Amount', 'Date'], flattened, `${fileName}.pdf`);
            } else {
                exportToExcel(flattened, `${fileName}.xlsx`);
            }
        }

        toast.success("Export successful");
    } catch (error) {
        toast.error("Export failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeModule="FINANCE" />
      <div className="flex-1 ml-64 p-8 pt-20">
        <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
            <p className="text-gray-500">Track revenue, expenses, and supplier payments.</p>
        </header>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 mb-6 w-fit">
            {['OVERVIEW', 'PAYABLES', 'EXPENSES', 'REPORTS'].map(tab => (
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard title="Revenue" value={stats.totalRevenue} icon={DollarSign} color="emerald" />
                    <StatCard title="COGS" value={stats.totalCOGS} icon={TrendingUp} color="blue" />
                    <StatCard title="Expenses" value={stats.totalExpenses} icon={CreditCard} color="rose" />
                    <StatCard title="Net Profit" value={stats.netProfit} icon={FileText} color="amber" />
                </div>

                {/* Simple P&L Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Profit & Loss Overview</h3>
                    <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Revenue', amount: stats.totalRevenue, fill: '#10b981' },
                                { name: 'Expenses', amount: stats.totalExpenses, fill: '#f43f5e' },
                                { name: 'Net Profit', amount: stats.netProfit, fill: '#f59e0b' },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(val) => `Rs. ${val.toLocaleString()}`} />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
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
                    <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50">
                        <div>
                            <h4 className="font-medium text-gray-900">Sales Report</h4>
                            <p className="text-sm text-gray-500">Detailed list of all completed sales.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleExport('SALES', 'PDF')} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">PDF</button>
                            <button onClick={() => handleExport('SALES', 'EXCEL')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">Excel</button>
                        </div>
                    </div>

                     <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50">
                        <div>
                            <h4 className="font-medium text-gray-900">Expense Report</h4>
                            <p className="text-sm text-gray-500">Breakdown of operational expenses.</p>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => handleExport('EXPENSES', 'PDF')} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">PDF</button>
                            <button onClick={() => handleExport('EXPENSES', 'EXCEL')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">Excel</button>
                        </div>
                    </div>
                </div>
            </div>
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Add Expense</h3>
                <form onSubmit={handleAddExpense}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <input type="text" required className="w-full border-gray-300 rounded-lg" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount</label>
                            <input type="number" required className="w-full border-gray-300 rounded-lg" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <select className="w-full border-gray-300 rounded-lg" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                                <option value="Rent">Rent</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Salaries">Salaries</option>
                                <option value="Supplies">Supplies</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-6 gap-3">
                        <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Save</button>
                    </div>
                </form>
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
