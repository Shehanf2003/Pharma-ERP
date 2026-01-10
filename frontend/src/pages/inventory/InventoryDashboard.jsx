import React, { useState, useEffect } from 'react';
import AddStockForm from './AddStockForm';
import AddProductForm from './AddProductForm';
import ManageStockTable from './ManageStockTable';
import { Package, PlusCircle, Boxes, ClipboardList } from 'lucide-react';

const InventoryDashboard = () => {
  // We don't strictly need the full inventory here, 
  // but we do need the 'products' list for the AddStockForm dropdown.
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'product' or 'manage'

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // We fetch inventory to populate the product dropdown in AddStockForm
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/inventory', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      
      // Assuming the API returns a list that can be used for products
      setProducts(data); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddBatch = async (batchData) => {
    setSubmitError(null);
    try {
      const response = await fetch('/api/inventory/batches', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(batchData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add batch');
      }

      alert('Batch added successfully!');
      // Optional: Refresh products list if adding a batch somehow alters product definitions
      fetchProducts(); 
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center">
            <Package className="mr-3 h-8 w-8 text-blue-600" />
            Inventory Operations
          </h2>
          <p className="mt-1 text-sm text-gray-500">
              Add new stock batches or create new product definitions.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs to Switch Modes */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'stock'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <Boxes className="w-4 h-4 mr-2" />
          Add Stock (Batch)
        </button>
        <button
          onClick={() => setActiveTab('product')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'product'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Create New Product
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manage'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Manage Stock
        </button>
      </div>

      <div className="space-y-8">
        <section>
          {activeTab === 'product' && (
            // The New Product Form
            <AddProductForm onSuccess={fetchProducts} />
          )}
          {activeTab === 'stock' && (
            // The Existing Stock Batch Form
            <>
              <AddStockForm 
                products={products} 
                onSubmit={handleAddBatch} 
                isLoading={loading} 
              />
              {submitError && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                  {submitError}
                </div>
              )}
            </>
          )}
          {activeTab === 'manage' && (
             // The New Manage Stock Table
             <ManageStockTable />
          )}
        </section>
      </div>
    </div>
  );
};

export default InventoryDashboard;