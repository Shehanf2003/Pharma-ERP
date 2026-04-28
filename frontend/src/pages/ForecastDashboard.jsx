import React, { useState } from 'react';
import { TrendingUp, Search, Loader2, AlertCircle, Calendar, List, X, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis as RechartsYAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-6 w-full mt-8">
    <div className="rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm h-[400px]"></div>
  </div>
);

const ForecastDashboard = () => {
    const [forecastData, setForecastData] = useState(null);
    const [loadingForecast, setLoadingForecast] = useState(false);
    const [productId, setProductId] = useState('');
    const [forecastError, setForecastError] = useState('');
    const [showDataModal, setShowDataModal] = useState(false);

    const fetchForecast = async (e) => {
        e.preventDefault();
        if (!productId.trim()) return;
        
        setLoadingForecast(true);
        setForecastError('');
        setForecastData(null);
        
        try {
            const response = await fetch(`http://localhost:8000/api/ml/forecast/${encodeURIComponent(productId)}?days_to_predict=30`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setForecastData(data);
        } catch (error) {
            console.error('Failed to fetch forecast:', error);
            setForecastError(error.message || 'Ensure the ID/Name is correct and has enough sales history (30+ points).');
        } finally {
            setLoadingForecast(false);
        }
    };

    const downloadCSV = () => {
        if (!forecastData || !forecastData.forecast) return;
        
        const headers = ['Date', 'Predicted Demand'];
        const csvRows = [
            headers.join(','),
            ...forecastData.forecast.map(item => `${item.date},${item.predictedQuantity}`)
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `forecast_${forecastData.productId.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-blue-900/40 p-6 rounded-2xl border border-blue-800 shadow-sm">
            <div className="mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Demand Forecasting (30 Days)
                </h2>
                <p className="text-sm text-blue-200 mt-1">Predicts future daily sales using Holt-Winters Exponential Smoothing. Requires minimum 30 data points.</p>
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
                        className="block w-full pl-10 pr-3 py-2.5 border border-blue-700 bg-blue-950/50 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
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

            {loadingForecast && <SkeletonLoader />}

            {!forecastData && !loadingForecast && !forecastError && (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-blue-800 border-dashed bg-blue-900/40">
                    <h3 className="text-lg font-bold text-white">No Forecast Generated</h3>
                    <p className="text-blue-200 text-sm mt-1 font-medium">Enter a Product ID or Name above to generate a 30-day forecast.</p>
                </div>
            )}

            {forecastData && !loadingForecast && (
                <div className="mt-8 bg-blue-900/30 p-6 rounded-xl border border-blue-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h3 className="font-bold text-white flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                            Forecast Results for: <span className="ml-2 font-normal text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded-md border border-indigo-800">{forecastData.productId}</span>
                        </h3>
                        <div className="flex gap-3">
                            <button
                                onClick={downloadCSV}
                                className="flex items-center px-3 py-1.5 bg-emerald-700 text-emerald-100 text-sm font-medium rounded-md hover:bg-emerald-600 transition-colors"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </button>
                            <button
                                onClick={() => setShowDataModal(true)}
                                className="flex items-center px-3 py-1.5 bg-blue-800 text-blue-100 text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <List className="w-4 h-4 mr-2" />
                                View Data
                            </button>
                        </div>
                    </div>
                    
                    <div className="h-80 w-full bg-blue-950/50 p-4 rounded-lg shadow-sm border border-blue-800">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastData.forecast} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e3a8a" />
                                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#bfdbfe'}} tickMargin={10} axisLine={false} tickLine={false} />
                                <RechartsYAxis tick={{fontSize: 12, fill: '#bfdbfe'}} tickMargin={10} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '0.5rem', backgroundColor: '#172554', border: '1px solid #1e3a8a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#ffffff', fontWeight: '500' }}
                                />
                                <RechartsLegend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                <Line type="monotone" dataKey="predictedQuantity" stroke="#818cf8" name="Predicted Demand (Units)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Modal for viewing data in a list */}
            {showDataModal && forecastData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-blue-950 border border-blue-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <List className="w-5 h-5 text-indigo-400" />
                                Forecast Data
                            </h3>
                            <button onClick={() => setShowDataModal(false)} className="text-blue-300 hover:text-white transition-colors p-1 rounded-full hover:bg-blue-800/50">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto pr-2 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-blue-900/60 sticky top-0">
                                    <tr>
                                        <th className="py-3 px-4 text-sm font-semibold text-blue-200 border-b border-blue-800">Date</th>
                                        <th className="py-3 px-4 text-sm font-semibold text-blue-200 border-b border-blue-800 text-right">Predicted Demand</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-800/50">
                                    {forecastData.forecast.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-800/30 transition-colors">
                                            <td className="py-3 px-4 text-sm font-medium text-blue-100">{item.date}</td>
                                            <td className="py-3 px-4 text-sm font-bold text-white text-right">{item.predictedQuantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForecastDashboard;
