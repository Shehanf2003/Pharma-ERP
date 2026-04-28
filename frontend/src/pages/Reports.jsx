import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingCart, TrendingUp, AlertCircle, 
  PlusCircle, Search, Loader2, X, Calendar, Filter, BarChart3 
} from 'lucide-react';

import ReportingAnalytics from './ReportingAnalytics'; 
import SalesTrendsDashboard from './SalesTrendsDashboard';
import FmcgDashboard from './FmcgDashboard';
import ForecastDashboard from './ForecastDashboard';
import axiosInstance from '../lib/axios';

// Updated to high-contrast projector-safe colors
const DONUT_COLORS = ['#94a3b8', '#22d3ee', '#fbbf24', '#f97316', '#a3e635'];

const Reports = () => {
    // --- Global Date Filtering States ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // --- Tab State ---
    const [activeTab, setActiveTab] = useState('SALES'); // 'SALES' | 'FMCG' | 'FORECAST' | 'ANALYTICS'

    // --- Refresh Trigger ---
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // --- Sales Trends States ---
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
            const response = await axiosInstance.get(`/sales/dashboard?${query}`);
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
        <div className="min-h-screen w-full bg-slate-950 font-sans">
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
            
            {/* Header & Global Date Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-wide">Analytics & Reports</h1>
                    <p className="text-gray-400 font-bold mt-2 text-base">Sales trends, inventory velocity, and AI forecasting.</p>
                </div>
                
                {['SALES', 'ANALYTICS'].includes(activeTab) && (
                    <div className="flex items-end space-x-4 bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-700">
                        <div>
                            <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">Start Date</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-slate-950 border border-slate-700 text-white p-2.5 rounded-md text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">End Date</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-slate-950 border border-slate-700 text-white p-2.5 rounded-md text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <button 
                            onClick={fetchAllData}
                            className="bg-cyan-500 text-slate-950 px-5 py-2.5 rounded-md hover:bg-cyan-400 text-sm font-black flex items-center transition-colors shadow-sm"
                        >
                            <Filter className="w-4 h-4 mr-2 stroke-[3]" />
                            Apply
                        </button>
                        <button 
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="bg-slate-800 border border-slate-600 text-gray-300 px-5 py-2.5 rounded-md hover:bg-slate-700 hover:text-white text-sm font-bold flex items-center transition-colors shadow-sm"
                        >
                            <X className="w-4 h-4 mr-1 stroke-[3]" />
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-6 mb-8 border-b border-slate-700 overflow-x-auto pb-px">
                {['SALES', 'FMCG', 'FORECAST', 'ANALYTICS'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-3 px-2 font-bold text-base border-b-4 transition-colors whitespace-nowrap ${
                            activeTab === tab
                                ? 'border-cyan-400 text-cyan-400'
                                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-slate-500'
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
                <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-700 p-2 min-h-[calc(100vh-250px)]">
                    <ReportingAnalytics startDate={startDate} endDate={endDate} />
                </div>
            )}
            </div>
        </div>
    );
};

export default Reports;