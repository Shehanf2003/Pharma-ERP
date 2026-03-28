import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(null); // Product object
  const [deleteReason, setDeleteReason] = useState('');
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');

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

  const handleEditPriceClick = (product) => {
    setEditingPriceId(product._id);
    setEditPriceValue(product.mrp || 0);
  };

  const handleCancelEdit = () => {
    setEditingPriceId(null);
    setEditPriceValue('');
  };

  const handleSavePrice = async (productId) => {
    try {
      const res = await fetch(`/api/inventory/products/${productId}/price`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ mrp: Number(editPriceValue) })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Price update failed');

      toast.success("Unit price updated successfully");
      setEditingPriceId(null);
      fetchProducts(); // Refresh list

    } catch (error) {
      toast.error(error.message);
    }
  };

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => (
                    <tr key={product._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.genericName || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingPriceId === product._id ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm focus:outline-none focus:border-blue-500"
                                        value={editPriceValue}
                                        onChange={(e) => setEditPriceValue(e.target.value)}
                                    />
                                    <button onClick={() => handleSavePrice(product._id)} className="text-green-600 hover:text-green-900" title="Save"><Check className="w-5 h-5" /></button>
                                    <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600" title="Cancel"><X className="w-5 h-5" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <span>Rs. {product.mrp || 0}</span>
                                    <button onClick={() => handleEditPriceClick(product)} className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Unit Price">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </td>
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
                 {products.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-gray-500">No products found</td></tr>}
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
