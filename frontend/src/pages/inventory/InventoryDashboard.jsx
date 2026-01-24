import React, { useState, useEffect } from 'react';
import AddStockForm from './AddStockForm';
import AddProductForm from './AddProductForm';
import ManageStockTable from './ManageStockTable';
import SupplierManager from './SupplierManager';
import PurchaseOrderManager from './PurchaseOrderManager';
import ProductList from './ProductList';
import { Package, PlusCircle, Boxes, ClipboardList, Truck, ShoppingCart, AlertTriangle, AlertCircle, FileText } from 'lucide-react';

const InventoryDashboard = () => {
  // We don't strictly need the full inventory here, 
  // but we do need the 'products' list for the AddStockForm dropdown.
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiring: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('manage'); // Default to Manage for overview

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
      const [invRes, lowRes, expRes] = await Promise.all([
          fetch('/api/inventory', { headers: getAuthHeaders() }),
          fetch('/api/inventory/alerts/low-stock', { headers: getAuthHeaders() }),
          fetch('/api/inventory/alerts/expiring', { headers: getAuthHeaders() })
      ]);

      if (!invRes.ok) throw new Error('Failed to fetch inventory');
      
      setProducts(await invRes.json());

      if (lowRes.ok) {
          const low = await lowRes.json();
          setAlerts(prev => ({ ...prev, lowStock: low }));
      }
      if (expRes.ok) {
          const exp = await expRes.json();
          setAlerts(prev => ({ ...prev, expiring: exp }));
      }

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

      {/* Alerts Section */}
      {(alerts.lowStock.length > 0 || alerts.expiring.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {alerts.lowStock.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                      <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                          <div>
                              <h3 className="text-sm font-medium text-red-800">Low Stock Alert</h3>
                              <div className="mt-2 text-sm text-red-700">
                                  <ul className="list-disc pl-5 space-y-1">
                                      {alerts.lowStock.slice(0, 3).map(p => (
                                          <li key={p._id}>{p.name} (Qty: {p.totalQuantity})</li>
                                      ))}
                                      {alerts.lowStock.length > 3 && <li>...and {alerts.lowStock.length - 3} more</li>}
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
               {alerts.expiring.length > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded shadow-sm">
                      <div className="flex">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                          <div>
                              <h3 className="text-sm font-medium text-yellow-800">Expiring Soon (90 Days)</h3>
                              <div className="mt-2 text-sm text-yellow-700">
                                  <ul className="list-disc pl-5 space-y-1">
                                      {alerts.expiring.slice(0, 3).map(b => (
                                          <li key={b._id}>{b.productId?.name} - {new Date(b.expiryDate).toLocaleDateString()}</li>
                                      ))}
                                      {alerts.expiring.length > 3 && <li>...and {alerts.expiring.length - 3} more</li>}
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

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

        <button
          onClick={() => setActiveTab('products-list')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'products-list'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Products
        </button>

         <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <Truck className="w-4 h-4 mr-2" />
          Suppliers
        </button>

         <button
          onClick={() => setActiveTab('po')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'po'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Purchase Orders
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
          {activeTab === 'products-list' && (
             <ProductList />
          )}
          {activeTab === 'suppliers' && (
             <SupplierManager />
          )}
          {activeTab === 'po' && (
             <PurchaseOrderManager />
          )}
        </section>
      </div>
    </div>
  );
};

export default InventoryDashboard;