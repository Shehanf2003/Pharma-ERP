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
      if (endDate) params.endDate = endDate; // Send the date!

      // Fetch the historical valuation
      const valRes = await axiosInstance.get('/inventory/valuation', { params });
      setStockValuation(valRes.data);

      // 1. Fetch main inventory
      const invRes = await axiosInstance.get('/inventory');
      const inventoryData = invRes.data;
      setInventory(inventoryData);

      try {
        // 2. Try fetching from the expected backend routes based on controller function names
        const [lowRes, expRes] = await Promise.all([
          axiosInstance.get('/inventory/alerts/low-stock'),
          axiosInstance.get('/inventory/alerts/expiring')
        ]);
        setLowStock(lowRes.data);
        setExpiring(expRes.data);
      } catch (subErr) {
        console.warn('Dedicated alerts endpoints returned 404. Falling back to local calculation.');
        
        // Fallback: Calculate Low Stock locally
        const localLowStock = inventoryData.filter(item => 
          (item.totalStock || 0) <= (item.minStockLevel || 10)
        );
        setLowStock(localLowStock);

        // Fallback: Calculate Expiring locally (Next 90 Days)
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
    <div className="p-4 sm:p-6 w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Stock Analytics</h2>
        <p className="text-sm text-blue-200 mt-1">Valuation and aging alerts for your current inventory.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border-l-4 border-red-500 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col justify-center items-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <span className="text-gray-500 font-medium text-sm">Gathering stock analytics...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-900/40 p-6 rounded-xl border border-blue-800 shadow-sm border-t-4 border-t-indigo-500 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-sm text-blue-200 font-medium">Total Stock Cost</p>
                <p className="text-2xl font-bold text-white mt-2">Rs. {stockValuation.totalCost.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-indigo-900/50 rounded-xl"><DollarSign className="w-6 h-6 text-indigo-400" /></div>
            </div>
            <div className="bg-blue-900/40 p-6 rounded-xl border border-blue-800 shadow-sm border-t-4 border-t-emerald-500 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-sm text-blue-200 font-medium">Estimated MRP Value</p>
                <p className="text-2xl font-bold text-white mt-2">Rs. {stockValuation.totalMrp.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-900/50 rounded-xl"><TrendingUp className="w-6 h-6 text-emerald-400" /></div>
            </div>
            <div className="bg-blue-900/40 p-6 rounded-xl border border-blue-800 shadow-sm border-t-4 border-t-rose-500 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-sm text-blue-200 font-medium">Low Stock Items</p>
                <p className="text-2xl font-bold text-white mt-2">{lowStock.length}</p>
              </div>
              <div className="p-3 bg-rose-900/50 rounded-xl"><AlertTriangle className="w-6 h-6 text-rose-400" /></div>
            </div>
          </div>

          {/* Expiring Batches Table */}
          <div className="bg-blue-900/40 rounded-xl shadow-sm border border-blue-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-blue-800/50 flex items-center gap-2 bg-blue-900/60">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-white">Aging & Expiring Batches (Next 90 Days)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Batch No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Qty Remaining</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-blue-800/50">
                  {expiring.map(batch => (
                    <tr key={batch._id} className="hover:bg-blue-800/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {batch.productId?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="bg-blue-950/50 text-blue-100 px-2 py-1 rounded-md text-xs font-medium border border-blue-800">
                          {batch.batchNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {batch.quantity}
                      </td>
                    </tr>
                  ))}
                  {expiring.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-blue-300">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Package className="w-10 h-10 text-gray-300 mb-3" />
                          <p className="text-sm font-medium text-white">No expiring batches</p>
                          <p className="text-xs mt-1 text-blue-200">All current inventory is well within expiry limits.</p>
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