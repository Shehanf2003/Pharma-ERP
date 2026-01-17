import React, { useState, useEffect } from 'react';
import { Plus, PackageCheck, Eye, X } from 'lucide-react';

const PurchaseOrderManager = () => {
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(null); // PO object or null

  // Create Form State
  const [newPO, setNewPO] = useState({
    supplier: '',
    items: [{ product: '', quantity: 1, unitCost: 0 }]
  });

  // Receive Form State
  const [receiveData, setReceiveData] = useState([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, prodRes] = await Promise.all([
        fetch('/api/inventory/purchase-orders', { headers: getAuthHeaders() }),
        fetch('/api/inventory/suppliers', { headers: getAuthHeaders() }),
        fetch('/api/inventory', { headers: getAuthHeaders() }) // Gets products
      ]);

      if(poRes.ok) setPos(await poRes.json());
      if(supRes.ok) setSuppliers(await supRes.json());
      if(prodRes.ok) setProducts(await prodRes.json());

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers for Create PO ---
  const handleAddItem = () => {
    setNewPO({ ...newPO, items: [...newPO.items, { product: '', quantity: 1, unitCost: 0 }] });
  };

  const handleRemoveItem = (index) => {
    const items = [...newPO.items];
    items.splice(index, 1);
    setNewPO({ ...newPO, items });
  };

  const handleItemChange = (index, field, value) => {
    const items = [...newPO.items];
    items[index] = { ...items[index], [field]: value };
    setNewPO({ ...newPO, items });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
        // Validate
        if (!newPO.supplier) return alert("Select supplier");
        if (newPO.items.some(i => !i.product)) return alert("Select product for all items");

        const res = await fetch('/api/inventory/purchase-orders', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newPO)
        });

        if (!res.ok) throw new Error((await res.json()).message || 'Failed');

        setShowCreateModal(false);
        setNewPO({ supplier: '', items: [{ product: '', quantity: 1, unitCost: 0 }] });
        fetchData();
        alert("PO Created!");
    } catch (err) {
        alert(err.message);
    }
  };

  // --- Handlers for Receive PO ---
  const openReceiveModal = (po) => {
    setShowReceiveModal(po);
    // Initialize receive data for each item in PO
    const initialData = po.items.map(item => ({
        productId: item.product._id || item.product, // .product might be populated
        productName: item.product.name,
        quantityReceived: item.quantity - (item.receivedQuantity || 0),
        batchNumber: '',
        expiryDate: '',
        mrp: 0
    }));
    setReceiveData(initialData);
  };

  const handleReceiveChange = (index, field, value) => {
      const data = [...receiveData];
      data[index] = { ...data[index], [field]: value };
      setReceiveData(data);
  };

  const handleReceiveSubmit = async (e) => {
      e.preventDefault();
      try {
          // Construct payload
          const payload = {
              receivedItems: receiveData.map(item => ({
                  productId: item.productId,
                  quantityReceived: Number(item.quantityReceived),
                  batchNumber: item.batchNumber,
                  expiryDate: item.expiryDate,
                  mrp: Number(item.mrp)
              }))
          };

          const res = await fetch(`/api/inventory/purchase-orders/${showReceiveModal._id}/receive`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error((await res.json()).message || 'Failed');

          setShowReceiveModal(null);
          fetchData();
          alert("Stock Received Successfully!");

      } catch (err) {
          alert(err.message);
      }
  };


  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create PO
        </button>
      </div>

      {/* PO List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pos.map((po) => (
              <tr key={po._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.poNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{po.supplier?.name || 'Unknown'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Rs. {po.totalCost}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {po.status !== 'RECEIVED' && (
                    <button
                        onClick={() => openReceiveModal(po)}
                        className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                    >
                        <PackageCheck className="w-4 h-4 mr-1"/> Receive
                    </button>
                  )}
                </td>
              </tr>
            ))}
             {pos.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-gray-500">No Orders Found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold">New Purchase Order</h3>
               <button onClick={() => setShowCreateModal(false)}><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleCreateSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={newPO.supplier}
                        onChange={e => setNewPO({...newPO, supplier: e.target.value})}
                    >
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                    {newPO.items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 mb-2 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                                <select
                                    className="w-full border p-2 rounded"
                                    value={item.product}
                                    onChange={e => handleItemChange(idx, 'product', e.target.value)}
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="w-20">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                                <input
                                    type="number" min="1" placeholder="Qty"
                                    className="w-full border p-2 rounded"
                                    value={item.quantity}
                                    onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                    required
                                />
                            </div>
                             <div className="w-24">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost</label>
                                <input
                                    type="number" min="0" placeholder="Cost"
                                    className="w-full border p-2 rounded"
                                    value={item.unitCost}
                                    onChange={e => handleItemChange(idx, 'unitCost', Number(e.target.value))}
                                    required
                                />
                            </div>
                            <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 p-2 mb-1"><X className="w-4 h-4"/></button>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddItem} className="text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
                </div>

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-700 border rounded">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create Order</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold">Receive Stock: {showReceiveModal.poNumber}</h3>
               <button onClick={() => setShowReceiveModal(null)}><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleReceiveSubmit}>
                <table className="min-w-full divide-y divide-gray-200 mb-4">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left">Product</th>
                            <th className="px-4 py-2 text-left">Qty Received</th>
                            <th className="px-4 py-2 text-left">Batch No *</th>
                            <th className="px-4 py-2 text-left">Expiry *</th>
                            <th className="px-4 py-2 text-left">MRP *</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receiveData.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-4 py-2">{item.productName}</td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        className="w-20 border rounded p-1"
                                        value={item.quantityReceived}
                                        onChange={e => handleReceiveChange(idx, 'quantityReceived', e.target.value)}
                                        required
                                    />
                                </td>
                                <td className="px-4 py-2">
                                     <input
                                        type="text"
                                        className="w-32 border rounded p-1"
                                        value={item.batchNumber}
                                        onChange={e => handleReceiveChange(idx, 'batchNumber', e.target.value)}
                                        required
                                        placeholder="BATCH-XXX"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                     <input
                                        type="date"
                                        className="w-32 border rounded p-1"
                                        value={item.expiryDate}
                                        onChange={e => handleReceiveChange(idx, 'expiryDate', e.target.value)}
                                        required
                                    />
                                </td>
                                <td className="px-4 py-2">
                                     <input
                                        type="number" min="0" step="0.01"
                                        className="w-24 border rounded p-1"
                                        value={item.mrp}
                                        onChange={e => handleReceiveChange(idx, 'mrp', e.target.value)}
                                        required
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowReceiveModal(null)} className="px-4 py-2 text-gray-700 border rounded">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Confirm Receipt</button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchaseOrderManager;
