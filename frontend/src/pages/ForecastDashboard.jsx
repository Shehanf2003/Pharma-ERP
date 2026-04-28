import React, { useState } from 'react';
import { TrendingUp, Search, Loader2, AlertCircle, Calendar, List, X, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis as RechartsYAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-6 w-full mt-8">
    <div className="rounded-2xl bg-slate-900 border border-slate-700 shadow-lg h-[400px]"></div>
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
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg min-h-[500px] mb-8">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-wide">
                    <TrendingUp className="w-6 h-6 text-cyan-400" />
                    Demand Forecasting (30 Days)
                </h2>
                <p className="text-base text-gray-400 mt-2 font-bold">Predicts future daily sales using Holt-Winters Exponential Smoothing. Requires minimum 30 data points.</p>
            </div>
            
            <form onSubmit={fetchForecast} className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Enter Product ID or Exact Name" 
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3 border border-slate-700 bg-slate-950 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-base font-bold outline-none transition-all shadow-sm"
                        required
                    />
                </div>
                <button 
                    type="submit" 
                    className="flex justify-center items-center px-6 py-3 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 shadow-sm transition-colors text-base font-black disabled:bg-slate-700 disabled:text-gray-500 disabled:cursor-not-allowed" 
                    disabled={loadingForecast}
                >
                    {loadingForecast ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin stroke-[3]" /> Generating...</>
                    ) : (
                        'Generate Forecast'
                    )}
                </button>
            </form>

            {forecastError && (
                <div className="mb-8 rounded-md bg-slate-900 p-5 border-l-4 border-orange-500 shadow-md">
                    <div className="flex">
                        <AlertCircle className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                        <div className="text-base text-white font-bold"><span className="font-black">Error:</span> {forecastError}</div>
                    </div>
                </div>
            )}

            {loadingForecast && <SkeletonLoader />}

            {!forecastData && !loadingForecast && !forecastError && (
                <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-4 border-slate-700 border-dashed bg-slate-900">
                    <h3 className="text-xl font-bold text-white tracking-wide">No Forecast Generated</h3>
                    <p className="text-gray-400 text-base mt-2 font-bold">Enter a Product ID or Name above to generate a 30-day forecast.</p>
                </div>
            )}

            {forecastData && !loadingForecast && (
                <div className="mt-8 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <h3 className="text-lg font-bold text-white flex items-center tracking-wide">
                            <Calendar className="w-6 h-6 mr-3 text-cyan-400" />
                            Forecast Results for: 
                            <span className="ml-3 font-black text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700 shadow-sm">
                                {forecastData.productId}
                            </span>
                        </h3>
                        <div className="flex gap-4">
                            <button
                                onClick={downloadCSV}
                                className="flex items-center px-4 py-2 bg-amber-500 text-slate-950 text-sm font-black rounded-md hover:bg-amber-400 transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2 stroke-[3]" />
                                Export CSV
                            </button>
                            <button
                                onClick={() => setShowDataModal(true)}
                                className="flex items-center px-4 py-2 bg-slate-700 text-white text-sm font-bold rounded-md hover:bg-slate-600 transition-colors shadow-sm border border-slate-600"
                            >
                                <List className="w-4 h-4 mr-2 stroke-[3]" />
                                View Data
                            </button>
                        </div>
                    </div>
                    
                    <div className="h-[400px] w-full bg-slate-900 p-6 rounded-xl shadow-inner border border-slate-700">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastData.forecast} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} tickMargin={12} axisLine={false} tickLine={false} />
                                <RechartsYAxis tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} tickMargin={12} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '0.75rem', backgroundColor: '#1e293b', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: '#ffffff', fontWeight: '900', fontSize: '1.1rem' }}
                                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <RechartsLegend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                <Line 
                                    type="monotone" 
                                    dataKey="predictedQuantity" 
                                    stroke="#22d3ee" 
                                    name="Predicted Demand (Units)" 
                                    strokeWidth={4} 
                                    dot={false} 
                                    activeDot={{ r: 8, fill: '#22d3ee', strokeWidth: 0 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Modal for viewing data in a list */}
            {showDataModal && forecastData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                            <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-wide">
                                <List className="w-6 h-6 text-cyan-400" />
                                Forecast Data
                            </h3>
                            <button onClick={() => setShowDataModal(false)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto pr-2 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-4 px-5 text-sm font-bold text-gray-300 border-b border-slate-600 uppercase tracking-wider">Date</th>
                                        <th className="py-4 px-5 text-sm font-bold text-gray-300 border-b border-slate-600 text-right uppercase tracking-wider">Predicted Demand</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700 bg-slate-900">
                                    {forecastData.forecast.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800 transition-colors">
                                            <td className="py-4 px-5 text-base font-bold text-gray-300">{item.date}</td>
                                            <td className="py-4 px-5 text-base font-black text-white text-right">{item.predictedQuantity}</td>
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