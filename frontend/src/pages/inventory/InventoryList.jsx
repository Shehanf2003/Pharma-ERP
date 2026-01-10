// frontend/src/pages/inventory/InventoryList.jsx
import React, { useState, useEffect } from 'react';
import StockTable from './StockTable';
import { Package } from 'lucide-react';

const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center">
            <Package className="mr-3 h-8 w-8 text-blue-600" />
            Current Stock List
          </h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <StockTable data={inventory} isLoading={loading} />
    </div>
  );
};

export default InventoryList;