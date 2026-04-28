import React, { useState, useEffect } from 'react';
import axiosInstance from '../lib/axios';
import { Loader2, DollarSign, TrendingUp, AlertTriangle, Clock, AlertCircle, Package, PlusCircle, X, ShoppingCart } from 'lucide-react';

const ReportingAnalytics = ({ startDate, endDate }) => {
  
  // Data States
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockValuation, setStockValuation] = useState({ totalCost: 0, totalMrp: 0 });

  const [poModal, setPoModal] = useState({ isOpen: false, data: null });
  const [poForm, setPoForm] = useState({ supplier: '', unitCost: '', quantity: '' });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  // Fetch standard Inventory Reports
  const fetchInventoryReports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate; 

      const valRes = await axiosInstance.get('/inventory/valuation', { params });
      setStockValuation(valRes.data);

      const invRes = await axiosInstance.get('/inventory');
      const inventoryData = invRes.data;
      setInventory(inventoryData);

      try {
        const [lowRes, expRes] = await Promise.all([
          axiosInstance.get('/inventory/alerts/low-stock'),
          axiosInstance.get('/inventory/alerts/expiring')
        ]);
        setLowStock(lowRes.data);
        setExpiring(expRes.data);
      } catch (subErr) {
        console.warn('Dedicated alerts endpoints returned 404. Falling back to local calculation.');
        
        const localLowStock = inventoryData.filter(item => 
          (item.totalStock || 0) <= (item.minStockLevel || 10)
        );
        setLowStock(localLowStock);

        const localExpiring = [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + 90);

        inventoryData.forEach(prod => {
          if (prod.batches && Array.isArray(prod.batches)) {
            prod.batches.forEach(batch => {
              if (new Date(batch.expiryDate) <= cutoffDate && batch.quantity > 0) {
                localExpiring.push({
                  _id: batch._id || Math.random().toString(),
                  productId: { name: prod.name },
                  batchNumber: batch.batchNumber,
                  expiryDate: batch.expiryDate,
                  quantity: batch.quantity
                });
              }
            });
          }
        });
        setExpiring(localExpiring);
      }
    } catch (err) {
      setError('Failed to fetch inventory reports.');
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventoryReports();
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axiosInstance.get('/inventory/suppliers');
        setSuppliers(res.data);
      } catch (err) {
        console.error("Failed to fetch suppliers", err);
      }
    };
    fetchSuppliers();
  }, []);

  const handlePoSubmit = async (e) => {
    e.preventDefault();
    if (!poForm.supplier) {
      alert("Please select a supplier.");
      return;
    }
    if (!poForm.quantity || poForm.quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    try {
      const newPO = {
        supplier: poForm.supplier,
        items: [{
          product: poModal.data._id,
          quantity: Number(poForm.quantity),
          unitCost: Number(poForm.unitCost)
        }]
      };
      
      await axiosInstance.post('/inventory/purchase-orders', newPO);
      alert(`✅ Purchase Order successfully created for ${poModal.data?.name}!`);
      setPoModal({ isOpen: false, data: null });
      setPoForm({ supplier: '', unitCost: '', quantity: '' });
      setSupplierSearch('');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create PO');
    }
  };

  return (
    <div className="p-4 sm:p-6 w-full bg-slate-950 min-h-screen">
      {/* Solid dark base background to guarantee contrast on projectors */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-wide">Stock Analytics</h2>
        <p className="text-base text-gray-300 mt-1 font-medium">Valuation and aging alerts for your current inventory.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-slate-900 p-4 border-l-4 border-orange-500 flex items-start shadow-md">
          <AlertCircle className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
          <p className="text-base text-white font-bold">{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col justify-center items-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
          <span className="text-white font-bold text-lg tracking-wide">Gathering stock analytics...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards: Using solid backgrounds, distinct borders, and high-value projector-safe colors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg border-t-4 border-t-cyan-400 flex items-center justify-between">
              <div>
                <p className="text-base text-gray-300 font-bold uppercase tracking-wider">Total Stock Cost</p>
                <p className="text-3xl font-bold text-white mt-2">Rs. {stockValuation.totalCost.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl"><DollarSign className="w-8 h-8 text-cyan-400" /></div>
            </div>
            
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg border-t-4 border-t-amber-400 flex items-center justify-between">
              <div>
                <p className="text-base text-gray-300 font-bold uppercase tracking-wider">Estimated MRP Value</p>
                <p className="text-3xl font-bold text-white mt-2">Rs. {stockValuation.totalMrp.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl"><TrendingUp className="w-8 h-8 text-amber-400" /></div>
            </div>
            
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg border-t-4 border-t-orange-500 flex items-center justify-between">
              <div>
                <p className="text-base text-gray-300 font-bold uppercase tracking-wider">Low Stock Items</p>
                <p className="text-3xl font-bold text-white mt-2">{lowStock.length}</p>
              </div>
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl"><AlertTriangle className="w-8 h-8 text-orange-500" /></div>
            </div>
          </div>

          {/* Expiring Batches Table */}
          <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-700 flex items-center gap-3 bg-slate-800">
              <Clock className="w-6 h-6 text-orange-400" />
              <h3 className="text-xl font-bold text-white tracking-wide">Aging & Expiring Batches (Next 90 Days)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Batch No</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Qty Remaining</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-700">
                  {expiring.map(batch => (
                    <tr key={batch._id} className="hover:bg-slate-800 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap text-base font-bold text-white">
                        {batch.productId?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base text-gray-300">
                        <span className="bg-slate-800 text-gray-100 px-3 py-1 rounded-md text-sm font-bold border border-slate-600 shadow-sm">
                          {batch.batchNumber}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base">
                        {/* High contrast badge: Dark text on a bright solid background */}
                        <span className="inline-flex items-center px-3 py-1 rounded text-sm font-black bg-orange-500 text-slate-950 shadow-sm">
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base font-bold text-white">
                        {batch.quantity}
                      </td>
                    </tr>
                  ))}
                  {expiring.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Package className="w-12 h-12 text-slate-600 mb-4" />
                          <p className="text-lg font-bold text-white tracking-wide">No expiring batches</p>
                          <p className="text-sm mt-2 text-gray-400 font-medium">All current inventory is well within expiry limits.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Items Table */}
          <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-700 flex items-center gap-3 bg-slate-800">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              <h3 className="text-xl font-bold text-white tracking-wide">Low Stock Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Current Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Min Stock Level</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-700">
                  {lowStock.map(item => (
                    <tr key={item._id} className="hover:bg-slate-800 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap text-base font-bold text-white">
                        {item.name}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base text-gray-300">
                        <span className="bg-orange-500 text-slate-950 px-3 py-1 rounded-md text-sm font-bold shadow-sm">
                          {item.totalQuantity ?? item.totalStock ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base text-gray-300 font-bold">
                        {item.minStockLevel ?? 10}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base">
                        <button 
                            onClick={() => {
                                setPoModal({ isOpen: true, data: item });
                                setPoForm({ supplier: '', unitCost: item.costPrice || '', quantity: Math.max((item.minStockLevel || 10) * 2, 10) });
                                setSupplierSearch('');
                            }} 
                            className="flex items-center px-4 py-2 bg-cyan-500 text-slate-950 text-sm font-black rounded-md hover:bg-cyan-400 transition-colors shadow-sm"
                        >
                            <ShoppingCart className="w-4 h-4 mr-2 stroke-[3]" />
                            Create PO
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lowStock.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Package className="w-12 h-12 text-slate-600 mb-4" />
                          <p className="text-lg font-bold text-white tracking-wide">No low stock items</p>
                          <p className="text-sm mt-2 text-gray-400 font-medium">All products are adequately stocked.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                              value={poModal.data?.name || ''} 
                              className="w-full bg-slate-800 border border-slate-600 text-gray-300 rounded-lg p-2.5 outline-none cursor-not-allowed"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-400 mb-1">Quantity</label>
                          <input 
                              type="number" 
                              min="1"
                              required
                              value={poForm.quantity} 
                              onChange={(e) => setPoForm({...poForm, quantity: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-cyan-500 font-black"
                          />
                      </div>
                      <div className="relative">
                          <label className="block text-sm font-bold text-gray-400 mb-1">Supplier</label>
                          <input 
                              type="text"
                              value={supplierSearch}
                              onChange={(e) => {
                                  setSupplierSearch(e.target.value);
                                  setPoForm({ ...poForm, supplier: '' }); 
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

export default ReportingAnalytics;