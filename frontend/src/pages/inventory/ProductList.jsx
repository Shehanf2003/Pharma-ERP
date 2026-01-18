import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(null); // Product object
  const [deleteReason, setDeleteReason] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch products');
      setProducts(await res.json());
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!deleteReason.trim()) {
        toast.error("Reason is required");
        return;
    }

    try {
        const res = await fetch(`/api/inventory/products/${showDeleteModal._id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ reason: deleteReason })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Delete failed');

        toast.success("Product deleted successfully");
        setShowDeleteModal(null);
        setDeleteReason('');
        fetchProducts(); // Refresh list

    } catch (error) {
        toast.error(error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Product Definitions</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => (
                    <tr key={product._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.genericName || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.totalStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                                onClick={() => setShowDeleteModal(product)}
                                className="text-red-600 hover:text-red-900"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </td>
                    </tr>
                ))}
                 {products.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-gray-500">No products found</td></tr>}
            </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4 text-red-600">Delete Product</h3>
                <p className="mb-4">
                    Are you sure you want to delete <strong>{showDeleteModal.name}</strong>?
                    This will hide it from new operations, but history will be preserved.
                </p>

                <form onSubmit={handleDeleteSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion *</label>
                        <textarea
                            className="w-full border rounded p-2"
                            rows="3"
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="e.g., Discontinued, Data Entry Error"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(null)}
                            className="px-4 py-2 border rounded"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default ProductList;
