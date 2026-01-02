import React, { useState, useEffect } from 'react';
import StockTable from './StockTable';
import AddStockForm from './AddStockForm';
import { Package } from 'lucide-react';

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]); // This would normally come from an API endpoint for products
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
      // In a real app, this would be a separate endpoint to get product list for the dropdown
      // For now, I'll assume we can get it from inventory or a products endpoint
      // Let's assume there is a way to get just products, or we extract from inventory if possible
      // But since we need products even if stock is 0, we should probably query products.
      // Re-using inventory endpoint might be okay if it lists all products.
      try {
          const response = await fetch('/api/inventory'); // Assuming this returns all products
           if (!response.ok) {
            throw new Error('Failed to fetch products');
          }
          const data = await response.json();
          // Extract product details. The endpoint returns products with totalStock.
          setProducts(data);
      } catch (err) {
          console.error("Error fetching products", err);
      }
  }

  useEffect(() => {
    fetchInventory();
    fetchProducts();
  }, []);

  const handleAddBatch = async (batchData) => {
    setSubmitError(null);
    try {
      const response = await fetch('/api/inventory/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add batch');
      }

      // Refresh inventory after adding batch
      await fetchInventory();
      alert('Batch added successfully!');
    } catch (err) {
      setSubmitError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center">
            <Package className="mr-3 h-8 w-8 text-blue-600" />
            Inventory Management
          </h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Icon */}
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <section>
             <AddStockForm products={products} onSubmit={handleAddBatch} isLoading={loading} />
             {submitError && <p className="mt-2 text-sm text-red-600">{submitError}</p>}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg leading-6 font-medium text-gray-900">Current Stock</h3>
          </div>
          <StockTable data={inventory} isLoading={loading} />
        </section>
      </div>
    </div>
  );
};

export default InventoryDashboard;
