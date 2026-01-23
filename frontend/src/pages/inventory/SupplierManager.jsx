import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const SupplierManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', address: '', contactPerson: '' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/suppliers', { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) setSuppliers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewSupplier({ name: '', email: '', phone: '', address: '', contactPerson: '' });
        fetchSuppliers();
      } else {
          alert("Failed to add supplier");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
      if(!confirm("Are you sure?")) return;
      try {
          await fetch(`/api/inventory/suppliers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
          fetchSuppliers();
      } catch (e) { console.error(e); }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Supplier Management</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Name *" required
            value={newSupplier.name}
            onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            placeholder="Contact Person"
            value={newSupplier.contactPerson}
            onChange={e => setNewSupplier({...newSupplier, contactPerson: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            placeholder="Email" type="email"
            value={newSupplier.email}
            onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            placeholder="Phone"
            value={newSupplier.phone}
            onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
            className="p-2 border rounded"
          />
           <input
            placeholder="Address"
            value={newSupplier.address}
            onChange={e => setNewSupplier({...newSupplier, address: e.target.value})}
            className="p-2 border rounded md:col-span-2"
          />
          <div className="md:col-span-2 flex justify-end space-x-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 text-gray-600">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.map((s) => (
                <tr key={s._id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{s.contactPerson}</div>
                    <div>{s.email}</div>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{s.phone}</div>
                    <div className="truncate max-w-xs" title={s.address}>{s.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-gray-500">No suppliers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


export default SupplierManager;

