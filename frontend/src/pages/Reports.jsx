import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, ShoppingCart, TrendingUp, AlertCircle, PlusCircle, Search, Loader2, X, Calendar } from 'lucide-react';

const Reports = () => {
    const [fmcgData, setFmcgData] = useState([]);
    const [loadingFmcg, setLoadingFmcg] = useState(false);
    const [fmcgError, setFmcgError] = useState('');

    const [forecastData, setForecastData] = useState(null);
    const [loadingForecast, setLoadingForecast] = useState(false);
    const [productId, setProductId] = useState('');
    const [forecastError, setForecastError] = useState('');

    const [showPoSuggestions, setShowPoSuggestions] = useState(false);
    const [poModal, setPoModal] = useState({ isOpen: false, data: null });
    const [activeTab, setActiveTab] = useState('FMCG'); // 'FMCG' | 'FORECAST'

    useEffect(() => {
        fetchFmcgData();
    }, []);

    const fetchFmcgData = async () => {
        setLoadingFmcg(true);
        setFmcgError('');
        try {
            const response = await fetch('http://localhost:8000/api/ml/fmcg-clustering?days=90'); // CORRECT

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || err.message || 'Failed to fetch');
            }
            const data = await response.json();
            setFmcgData(data.data || []);
        } catch (error) {
            console.error('Failed to fetch FMCG data:', error);
            setFmcgError(error.message);
        } finally {
            setLoadingFmcg(false);
        }
    };

    const fetchForecast = async (e) => {
        e.preventDefault();
        if (!productId.trim()) return;
        
        setLoadingForecast(true);
        setForecastError('');
        setForecastData(null);
        
        try {
           const response = await fetch(`http://localhost:8000/api/ml/forecast/${encodeURIComponent(productId)}?days_to_predict=30`); // CORRECT

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || err.message || 'Failed to fetch');
            }
            const data = await response.json();
            setForecastData(data);
        } catch (error) {
            console.error('Failed to fetch forecast:', error);
            setForecastError(error.message || 'Ensure the ID/Name is correct and has enough sales history (30+ points).');
        } finally {
            setLoadingForecast(false);
        }
    };

    // Calculate 30-day suggested restock for "Fast" moving items (based on 90-day total)
    const poSuggestions = fmcgData
        .filter(item => item.fmcgClass === 'Fast')
        .map(item => ({
            ...item,
            suggestedQty: Math.ceil(item.totalQuantity / 3) 
        }));

    const handlePoSubmit = (e) => {
        e.preventDefault();
        // Here you would hook this up to your backend POST /api/purchase-orders
        alert(`✅ Purchase Order successfully created for ${poModal.data?.productName}!`);
        setPoModal({ isOpen: false, data: null });
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">AI Analytics & Reports</h1>
                <p className="text-gray-500 mt-1">Machine learning insights for inventory and demand forecasting.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('FMCG')}
                    className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'FMCG'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    FMCG ABC Analysis
                </button>
                <button
                    onClick={() => setActiveTab('FORECAST')}
                    className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'FORECAST'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Demand Forecasting
                </button>
            </div>

            {/* FMCG Clustering Section */}
            {activeTab === 'FMCG' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            FMCG ABC Analysis
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Categorizes products into Fast, Normal, and Slow moving based on 90-day volume and order frequency.</p>
                    </div>
                    <button 
                        onClick={() => setShowPoSuggestions(!showPoSuggestions)}
                        className={`flex items-center px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium ${showPoSuggestions ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        disabled={fmcgData.length === 0}
                    >
                        {showPoSuggestions ? <X className="w-4 h-4 mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                        {showPoSuggestions ? 'Hide PO Suggestions' : 'Suggest Purchase Orders'}
                    </button>
                </div>
                
                {fmcgError && (
                    <div className="mb-6 rounded-md bg-red-50 p-4 border-l-4 border-red-500">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
                            <div className="text-sm text-red-700"><span className="font-medium">Error:</span> {fmcgError}</div>
                        </div>
                    </div>
                )}
                
                {loadingFmcg ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                        <span className="text-gray-500 font-medium">Processing ML Clustering...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sold (90d)</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order Frequency</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Classification</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {fmcgData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                {item.totalQuantity.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{item.orderFrequency.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                item.fmcgClass === 'Fast' ? 'bg-emerald-100 text-emerald-800' :
                                                item.fmcgClass === 'Normal' ? 'bg-indigo-100 text-indigo-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {item.fmcgClass}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {fmcgData.length === 0 && !fmcgError && (
                                    <tr><td colSpan="4" className="text-center py-8 text-gray-500">No sales data available for clustering.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PO Suggestions UI */}
                {showPoSuggestions && poSuggestions.length > 0 && (
                    <div className="mt-8 bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                        <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-emerald-600" />
                            Suggested 30-Day Restock (Fast Moving Only)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {poSuggestions.map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-lg border border-emerald-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="font-bold text-gray-900 truncate" title={item.productName}>{item.productName}</p>
                                            <p className="text-sm text-gray-500 mt-1">90d Vol: {item.totalQuantity.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">Order Qty</p>
                                            <p className="text-2xl font-black text-emerald-700">+{item.suggestedQty.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setPoModal({ isOpen: true, data: item })} 
                                        className="w-full flex justify-center items-center py-2 px-4 border border-emerald-600 rounded-md shadow-sm text-sm font-medium text-emerald-700 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Create PO
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Demand Forecasting Section */}
            {activeTab === 'FORECAST' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Demand Forecasting (30 Days)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Predicts future daily sales using Holt-Winters Exponential Smoothing. Requires minimum 30 data points.</p>
                </div>
                
                <form onSubmit={fetchForecast} className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Enter Product ID or Exact Name" 
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="flex justify-center items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors text-sm font-medium disabled:bg-indigo-400" 
                        disabled={loadingForecast}
                    >
                        {loadingForecast ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                        ) : (
                            'Generate Forecast'
                        )}
                    </button>
                </form>

                {forecastError && (
                    <div className="mb-6 rounded-md bg-red-50 p-4 border-l-4 border-red-500">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
                            <div className="text-sm text-red-700"><span className="font-medium">Error:</span> {forecastError}</div>
                        </div>
                    </div>
                )}

                {forecastData && (
                    <div className="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                            Forecast Results for: <span className="ml-2 font-normal text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">{forecastData.productId}</span>
                        </h3>
                        
                        <div className="h-80 w-full mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={forecastData.forecast} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} tickMargin={10} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 12, fill: '#6b7280'}} tickMargin={10} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                        itemStyle={{ color: '#1f2937', fontWeight: '500' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                    <Line type="monotone" dataKey="predictedQuantity" stroke="#4f46e5" name="Predicted Demand (Units)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {forecastData.forecast.map((item, idx) => (
                                <div key={idx} className="bg-white p-3 shadow-sm rounded-lg border border-gray-100 flex flex-col items-center hover:border-indigo-300 transition-colors">
                                    <span className="text-xs text-gray-500 font-medium mb-2">{item.date}</span>
                                    <span className="text-xl font-bold text-indigo-600">{item.predictedQuantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Create PO Modal Form */}
            {poModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold text-gray-900">Create Purchase Order</h3>
                            <button onClick={() => setPoModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handlePoSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                    <input type="text" readOnly value={poModal.data?.productName || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Quantity</label>
                                    <input type="number" defaultValue={poModal.data?.suggestedQty || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm outline-none" required min="1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm outline-none" required>
                                        <option value="">Choose a supplier...</option>
                                        <option value="PharmaCorp">PharmaCorp</option>
                                        <option value="MediSupply Inc">MediSupply Inc</option>
                                        <option value="HealthFirst Distributors">HealthFirst Distributors</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setPoModal({ isOpen: false, data: null })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center">
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    Submit Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;