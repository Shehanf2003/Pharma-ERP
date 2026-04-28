import React, { useState, useEffect } from 'react';
import axiosInstance from '../lib/axios';
import { Loader2, DollarSign, TrendingUp, AlertTriangle, Clock, AlertCircle, Package } from 'lucide-react';

const ReportingAnalytics = ({ startDate, endDate }) => {
  
  // Data States
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockValuation, setStockValuation] = useState({ totalCost: 0, totalMrp: 0 });

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
        </div>
      )}
    </div>
  );
};

export default ReportingAnalytics;