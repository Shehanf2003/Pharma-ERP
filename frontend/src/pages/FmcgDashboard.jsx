import React, { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingCart, AlertCircle, X, PlusCircle } from 'lucide-react';

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-6 w-full">
    <div className="rounded-2xl bg-slate-900 border border-slate-700 shadow-lg h-[400px]"></div>
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
        const query = buildDateQuery(); 
        
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
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg mb-8 min-h-[500px]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-wide">
                        <Package className="w-6 h-6 text-cyan-400" />
                        FMCG ABC Analysis
                    </h2>
                    <p className="text-base text-gray-400 mt-2 font-bold">Categorizes products into Fast, Normal, and Slow moving based on 90-day volume and order frequency.</p>
                </div>
                {hasData && (
                    <button 
                        onClick={() => setShowPoSuggestions(!showPoSuggestions)}
                        className={`flex items-center px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm font-black ${
                            showPoSuggestions 
                            ? 'bg-slate-800 text-gray-300 hover:text-white border border-slate-600' 
                            : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                        }`}
                    >
                        {showPoSuggestions ? <X className="w-5 h-5 mr-2 stroke-[3]" /> : <ShoppingCart className="w-5 h-5 mr-2 stroke-[3]" />}
                        {showPoSuggestions ? 'Hide PO Suggestions' : 'Suggest Purchase Orders'}
                    </button>
                )}
            </div>
            
            {error && (
                <div className="mb-6 rounded-md bg-slate-900 p-5 border-l-4 border-orange-500 shadow-md">
                    <div className="flex">
                        <AlertCircle className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                        <div className="text-base text-white font-bold"><span className="font-black">Error:</span> {error}</div>
                    </div>
                </div>
            )}
            
            {!hasData && !error ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-4 border-slate-700 border-dashed bg-slate-900">
                    <h3 className="text-xl font-bold text-white tracking-wide">No FMCG Data Available</h3>
                    <p className="text-gray-400 text-base mt-2 font-bold">Adjust your date filters to see ABC clustering results.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-sm">
                    <table className="min-w-full divide-y divide-slate-700 text-left">
                        <thead className="bg-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-gray-300 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-300 uppercase tracking-wider">Total Sold (90d)</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-300 uppercase tracking-wider">Order Frequency</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-300 uppercase tracking-wider">Classification</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900 divide-y divide-slate-700">
                            {fmcgData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-800 transition-colors">
                                    <td className="px-6 py-5 whitespace-nowrap text-base font-bold text-white">{item.productName}</td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <span className="inline-flex items-center px-3 py-1 rounded text-sm font-black bg-slate-800 text-gray-100 border border-slate-600 shadow-sm">
                                            {item.totalQuantity.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-base text-gray-300 font-bold">{item.orderFrequency.toLocaleString()}</td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-black shadow-sm ${
                                            item.fmcgClass === 'Fast' ? 'bg-cyan-500 text-slate-950' :
                                            item.fmcgClass === 'Normal' ? 'bg-slate-600 text-white' :
                                            'bg-orange-500 text-slate-950'
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
                <div className="mt-8 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 tracking-wide">
                        <ShoppingCart className="w-6 h-6 text-cyan-400" />
                        Suggested 30-Day Restock (Fast Moving Only)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {poSuggestions.map((item, idx) => (
                            <div key={idx} className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-md flex flex-col justify-between border-t-4 border-t-amber-400 hover:shadow-xl transition-shadow">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="font-black text-white text-lg truncate" title={item.productName}>{item.productName}</p>
                                        <p className="text-sm text-gray-400 mt-1 font-bold">90d Vol: {item.totalQuantity.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Order Qty</p>
                                        <p className="text-3xl font-black text-amber-400">+{item.suggestedQty.toLocaleString()}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setPoModal({ isOpen: true, data: item })} 
                                    className="w-full flex justify-center items-center py-3 px-4 rounded-md shadow-sm text-sm font-black text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-colors"
                                >
                                    <PlusCircle className="w-5 h-5 mr-2 stroke-[3]" />
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