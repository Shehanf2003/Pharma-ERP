import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingCart, TrendingUp, AlertCircle, 
  PlusCircle, Search, Loader2, X, Calendar, Filter, BarChart3 
} from 'lucide-react';

import ReportingAnalytics from './ReportingAnalytics'; // Your existing component
import SalesTrendsDashboard from './SalesTrendsDashboard';
import FmcgDashboard from './FmcgDashboard';
import ForecastDashboard from './ForecastDashboard';
import axiosInstance from '../lib/axios';

// Colors for Donut/Pie Chart
const DONUT_COLORS = ['#64748b', '#8b5cf6', '#4f46e5', '#f43f5e', '#0ea5e9'];

const Reports = () => {
    // --- Global Date Filtering States ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // --- Tab State ---
    const [activeTab, setActiveTab] = useState('SALES'); // 'SALES' | 'FMCG' | 'FORECAST' | 'ANALYTICS'

    // --- Refresh Trigger ---
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // --- Sales Trends States (New) ---
    const [salesTrends, setSalesTrends] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [salesMetrics, setSalesMetrics] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
    const [loadingSales, setLoadingSales] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchAllData();
    }, []);

    // Helper to build query string based on dates
    const buildDateQuery = () => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return params.toString();
    };

    const fetchAllData = () => {
        fetchSalesData();
        setRefreshTrigger(prev => prev + 1);
    };

    // --- API Fetch Functions ---

  const fetchSalesData = async () => {
    setLoadingSales(true);
    const query = buildDateQuery();
    
    try {
        // 1. Swap 'fetch' for 'axiosInstance.get'
        // 2. Remove the hardcoded domain/port
        const response = await axiosInstance.get(`/sales/dashboard?${query}`);
        
        // 3. Axios automatically parses JSON, so we just grab response.data
        const data = response.data; 
        
        setSalesTrends(data.salesTrends || []);
        setCategoryData(data.categoryData || []);
        setTopProducts(data.topProducts || []);
        setSalesMetrics({
            totalRevenue: data.totalRevenue || 0,
            totalOrders: data.totalOrders || 0,
            avgOrderValue: data.avgOrderValue || 0,
        });
    } catch (error) {
        console.error('Failed to fetch sales data:', error);
    } finally {
        setLoadingSales(false);
    }
};

    return (
        <div className="min-h-screen w-full bg-blue-950">
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
            
            {/* Header & Global Date Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
                    <p className="text-gray-200 mt-1">Sales trends, inventory velocity, and AI forecasting.</p>
                </div>
                
                {['SALES', 'ANALYTICS'].includes(activeTab) && (
                    <div className="flex items-end space-x-3 bg-blue-900/40 p-3 rounded-lg shadow-sm border border-blue-800">
                        <div>
                            <label className="text-xs font-medium text-blue-200 block mb-1">Start Date</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-blue-950/50 border border-blue-800 text-white p-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-blue-200 block mb-1">End Date</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-blue-950/50 border border-blue-800 text-white p-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button 
                            onClick={fetchAllData}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center transition-colors"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Apply
                        </button>
                        <button 
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="bg-blue-900/50 border border-blue-700 text-blue-100 px-4 py-2 rounded-md hover:bg-blue-800 text-sm font-medium flex items-center transition-colors"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200 overflow-x-auto pb-1">
                {['SALES', 'FMCG', 'FORECAST', 'ANALYTICS'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab
                                ? 'border-white text-white'
                                : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
                        }`}
                    >
                        {tab === 'SALES' && 'Sales Trends'}
                        {tab === 'FMCG' && 'Inventory Velocity (FMCG)'}
                        {tab === 'FORECAST' && 'Demand Forecasting'}
                        {tab === 'ANALYTICS' && 'Stock Analytics'}
                    </button>
                ))}
            </div>

            {/* --- TAB 1: SALES TRENDS --- */}
            {activeTab === 'SALES' && (
                <SalesTrendsDashboard 
                    loading={loadingSales}
                    metrics={salesMetrics}
                    trendsData={salesTrends}
                    categoryData={categoryData}
                    topProducts={topProducts}
                />
            )}

            {/* --- TAB 2: FMCG CLUSTERING --- */}
            {activeTab === 'FMCG' && (
                <FmcgDashboard 
            startDate={startDate}
            endDate={endDate}
            refreshTrigger={refreshTrigger}
                />
            )}

            {/* --- TAB 3: DEMAND FORECASTING --- */}
            {activeTab === 'FORECAST' && (
                <ForecastDashboard />
            )}

            {/* --- TAB 4: EXISTING ANALYTICS COMPONENT --- */}
            {activeTab === 'ANALYTICS' && (
                <div className="bg-blue-900/40 rounded-2xl shadow-sm border border-blue-800 p-2">
                    {/* Pass dates down if you updated ReportingAnalytics to accept props! */}
                    <ReportingAnalytics startDate={startDate} endDate={endDate} />
                </div>
            )}
            </div>
        </div>
    );
};

export default Reports;