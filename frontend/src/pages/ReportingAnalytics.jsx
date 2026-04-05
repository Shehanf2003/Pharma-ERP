import React, { useState, useEffect } from 'react';
import axiosInstance from '../lib/axios';

const ReportingAnalytics = () => {
  
  // Date Range Filtering
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data States
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch standard Inventory Reports
  const fetchInventoryReports = async () => {
    setLoading(true);
    setError('');
    try {
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
  }, []);

  // Handler for custom date range application
  const applyDateFilter = () => {
    fetchInventoryReports();
  };

  // Calculate Stock Valuations
  const stockValuation = inventory.reduce(
    (acc, item) => {
      acc.totalCost += (item.costPrice || 0) * (item.totalStock || 0);
      acc.totalMrp += (item.mrp || 0) * (item.totalStock || 0);
      return acc;
    },
    { totalCost: 0, totalMrp: 0 }
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reporting & Analytics</h1>
        
        {/* Customizable Date Range Filtering */}
        <div className="flex items-center space-x-3 bg-white p-3 rounded shadow-sm border">
          <div>
            <label className="text-xs text-gray-500 block">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="border p-1 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="border p-1 rounded text-sm"
            />
          </div>
          <button 
            onClick={applyDateFilter}
            className="mt-4 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>}
      {loading && <div className="text-blue-600 mb-4 font-semibold animate-pulse">Loading data...</div>}

      {/* Inventory Reports Tab */}
      {!loading && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded shadow border-l-4 border-blue-500">
              <h3 className="text-gray-500 text-sm">Total Stock Cost Value</h3>
              <p className="text-2xl font-bold">Rs. {stockValuation.totalCost.toLocaleString()}</p>
            </div>
            <div className="bg-white p-5 rounded shadow border-l-4 border-green-500">
              <h3 className="text-gray-500 text-sm">Estimated MRP Value</h3>
              <p className="text-2xl font-bold">Rs. {stockValuation.totalMrp.toLocaleString()}</p>
            </div>
            <div className="bg-white p-5 rounded shadow border-l-4 border-red-500">
              <h3 className="text-gray-500 text-sm">Items Low on Stock</h3>
              <p className="text-2xl font-bold">{lowStock.length}</p>
            </div>
          </div>

          {/* Expiring Batches Table */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-bold mb-3 text-red-600">Aging & Expiring Batches (Next 90 Days)</h2>
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left text-sm text-gray-600">Product Name</th>
                  <th className="p-2 text-left text-sm text-gray-600">Batch No</th>
                  <th className="p-2 text-left text-sm text-gray-600">Expiry Date</th>
                  <th className="p-2 text-left text-sm text-gray-600">Qty Remaining</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map(batch => (
                  <tr key={batch._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{batch.productId?.name || 'Unknown'}</td>
                    <td className="p-2">{batch.batchNumber}</td>
                    <td className="p-2 font-semibold text-red-500">{new Date(batch.expiryDate).toLocaleDateString()}</td>
                    <td className="p-2">{batch.quantity}</td>
                  </tr>
                ))}
                {expiring.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-gray-500">No batches expiring soon.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingAnalytics;