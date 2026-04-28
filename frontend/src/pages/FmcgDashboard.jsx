import React, { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingCart, AlertCircle, X, PlusCircle } from 'lucide-react';

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-6 w-full">
    <div className="rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm h-[400px]"></div>
  </div>
);

const FmcgDashboard = ({ startDate, endDate, refreshTrigger }) => {
    const [showPoSuggestions, setShowPoSuggestions] = useState(false);
    const [poModal, setPoModal] = useState({ isOpen: false, data: null });

    const [fmcgData, setFmcgData] = useState([]);
    const [loading, setLoadingFmcg] = useState(false);
    const [error, setFmcgError] = useState('');

    const buildDateQuery = useCallback(() => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return params.toString();
    }, [startDate, endDate]);

    const fetchFmcgData = async () => {
        setLoadingFmcg(true);
        setFmcgError('');
        const query = buildDateQuery(); // Use dynamic dates instead of hardcoded ?days=90
        
        try {
            const response = await fetch(`http://localhost:8000/api/ml/fmcg-clustering?${query}`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setFmcgData(data.data || []);
        } catch (error) {
            setFmcgError(error.message);
        } finally {
            setLoadingFmcg(false);
        }
    };

    useEffect(() => {
        fetchFmcgData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    if (loading) return <SkeletonLoader />;

    const hasData = fmcgData && fmcgData.length > 0;

    const poSuggestions = hasData 
        ? fmcgData.filter(item => item.fmcgClass === 'Fast').map(item => ({ ...item, suggestedQty: Math.ceil(item.totalQuantity / 3) }))
        : [];

    const handlePoSubmit = (e) => {
        e.preventDefault();
        // Here you would hook this up to your backend POST /api/purchase-orders
        alert(`✅ Purchase Order successfully created for ${poModal.data?.productName}!`);
        setPoModal({ isOpen: false, data: null });
    };

    return (
        <div className="bg-blue-900/40 p-6 rounded-2xl border border-blue-800 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-600" />
                        FMCG ABC Analysis
                    </h2>
                    <p className="text-sm text-blue-200 mt-1">Categorizes products into Fast, Normal, and Slow moving based on 90-day volume and order frequency.</p>
                </div>
                {hasData && (
                    <button 
                        onClick={() => setShowPoSuggestions(!showPoSuggestions)}
                        className={`flex items-center px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium ${showPoSuggestions ? 'bg-blue-800 text-blue-100 hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                        {showPoSuggestions ? <X className="w-4 h-4 mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                        {showPoSuggestions ? 'Hide PO Suggestions' : 'Suggest Purchase Orders'}
                    </button>
                )}
            </div>
            
            {error && (
                <div className="mb-6 rounded-md bg-red-50 p-4 border-l-4 border-red-500">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
                        <div className="text-sm text-red-700"><span className="font-medium">Error:</span> {error}</div>
                    </div>
                </div>
            )}
            
            {!hasData && !error ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-blue-800 border-dashed bg-blue-900/40">
                    <h3 className="text-lg font-bold text-white">No FMCG Data Available</h3>
                    <p className="text-blue-200 text-sm mt-1 font-medium">Adjust your date filters to see ABC clustering results.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-blue-800">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                        <thead className="bg-blue-900/60">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-blue-200 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-3 text-xs font-medium text-blue-200 uppercase tracking-wider">Total Sold (90d)</th>
                                <th className="px-6 py-3 text-xs font-medium text-blue-200 uppercase tracking-wider">Order Frequency</th>
                                <th className="px-6 py-3 text-xs font-medium text-blue-200 uppercase tracking-wider">Classification</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent divide-y divide-blue-800/50">
                            {fmcgData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-800/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                            {item.totalQuantity.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200 font-medium">{item.orderFrequency.toLocaleString()}</td>
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
                        </tbody>
                    </table>
                </div>
            )}

            {/* PO Suggestions UI */}
            {showPoSuggestions && poSuggestions.length > 0 && (
                <div className="mt-8 bg-blue-900/30 p-6 rounded-xl border border-blue-800">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                        Suggested 30-Day Restock (Fast Moving Only)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {poSuggestions.map((item, idx) => (
                            <div key={idx} className="bg-blue-800/40 p-5 rounded-lg border border-blue-700/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="font-bold text-white truncate" title={item.productName}>{item.productName}</p>
                                        <p className="text-sm text-blue-200 mt-1">90d Vol: {item.totalQuantity.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">Order Qty</p>
                                        <p className="text-2xl font-black text-emerald-400">+{item.suggestedQty.toLocaleString()}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setPoModal({ isOpen: true, data: item })} 
                                    className="w-full flex justify-center items-center py-2 px-4 border border-emerald-500/50 rounded-md shadow-sm text-sm font-medium text-emerald-400 bg-blue-900/50 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    Create PO
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Note: In a production setting, the Create PO modal would live outside or be a standalone component. */}
        </div>
    );
};

export default FmcgDashboard;
