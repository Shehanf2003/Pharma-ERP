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
    const [poForm, setPoForm] = useState({ supplier: '', unitCost: '' });
    const [supplierSearch, setSupplierSearch] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

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

    useEffect(() => {
        const fetchInventoryData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };
                const [supRes, prodRes] = await Promise.all([
                    fetch('/api/inventory/suppliers', { headers }),
                    fetch('/api/inventory', { headers })
                ]);
                if (supRes.ok) setSuppliers(await supRes.json());
                if (prodRes.ok) setProducts(await prodRes.json());
            } catch (err) {
                console.error("Failed to fetch inventory data for POs", err);
            }
        };
        fetchInventoryData();
    }, []);

    if (loading) return <SkeletonLoader />;

    const hasData = fmcgData && fmcgData.length > 0;

    const poSuggestions = hasData 
        ? fmcgData.filter(item => item.fmcgClass === 'Fast').map(item => ({ ...item, suggestedQty: Math.ceil(item.totalQuantity / 3) }))
        : [];

    const handlePoSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const matchedProduct = products.find(p => p.name === poModal.data?.productName);
            if (!matchedProduct) {
                alert(`Error: Product "${poModal.data?.productName}" not found in inventory database.`);
                return;
            }

            if (!poForm.supplier) {
                alert("Please select a supplier.");
                return;
            }

            const newPO = {
                supplier: poForm.supplier,
                items: [{
                    product: matchedProduct._id,
                    quantity: poModal.data.suggestedQty,
                    unitCost: Number(poForm.unitCost)
                }]
            };

            const token = localStorage.getItem('token');
            const res = await fetch('/api/inventory/purchase-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newPO)
            });

            if (!res.ok) throw new Error((await res.json()).message || 'Failed to create PO');

            alert(`✅ Purchase Order successfully created for ${poModal.data?.productName}!`);
            setPoModal({ isOpen: false, data: null });
            setPoForm({ supplier: '', unitCost: '' });
            setSupplierSearch('');
        } catch (err) {
            alert(err.message);
        }
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
            
            {/* PO Suggestions UI */}
            {showPoSuggestions && poSuggestions.length > 0 && (
                <div className="mb-8 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
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
                                    onClick={() => {
                                        setPoModal({ isOpen: true, data: item });
                                        setPoForm({ supplier: '', unitCost: '' });
                                        setSupplierSearch('');
                                    }} 
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

            
            {/* Create PO Modal */}
            {poModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                            <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-wide">
                                <PlusCircle className="w-6 h-6 text-cyan-400" />
                                Create Purchase Order
                            </h3>
                            <button onClick={() => setPoModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handlePoSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Product</label>
                                <input 
                                    type="text" 
                                    disabled 
                                    value={poModal.data?.productName || ''} 
                                    className="w-full bg-slate-800 border border-slate-600 text-gray-300 rounded-lg p-2.5 outline-none cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    disabled 
                                    value={poModal.data?.suggestedQty || 0} 
                                    className="w-full bg-slate-800 border border-slate-600 text-gray-300 rounded-lg p-2.5 outline-none cursor-not-allowed font-black"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-bold text-gray-400 mb-1">Supplier</label>
                                <input 
                                    type="text"
                                    value={supplierSearch}
                                    onChange={(e) => {
                                        setSupplierSearch(e.target.value);
                                        setPoForm({ ...poForm, supplier: '' }); // Reset selected ID when user types
                                        setIsSupplierDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsSupplierDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsSupplierDropdownOpen(false), 200)}
                                    placeholder="Search supplier..."
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-cyan-500"
                                    required={!poForm.supplier}
                                />
                                {isSupplierDropdownOpen && (
                                    <ul className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                                        {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length > 0 ? (
                                            suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => (
                                                <li 
                                                    key={s._id} 
                                                    onMouseDown={() => { setPoForm({ ...poForm, supplier: s._id }); setSupplierSearch(s.name); setIsSupplierDropdownOpen(false); }}
                                                    className="px-4 py-2.5 hover:bg-slate-700 cursor-pointer text-gray-200 font-medium transition-colors border-b border-slate-700/50 last:border-0"
                                                >
                                                    {s.name}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-4 py-2.5 text-gray-500 italic text-sm font-medium">No suppliers found</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Estimated Unit Cost (Rs.)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    required
                                    value={poForm.unitCost}
                                    onChange={(e) => setPoForm({...poForm, unitCost: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setPoModal({ isOpen: false, data: null })}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 font-black transition-colors"
                                >
                                    Confirm PO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FmcgDashboard;