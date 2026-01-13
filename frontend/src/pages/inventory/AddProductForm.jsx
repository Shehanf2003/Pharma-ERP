import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle, Scan } from 'lucide-react';
import clsx from 'clsx';
import ScannerModal from '../../components/ScannerModal';

const AddProductForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: '',
    manufacturer: '',
    storageCondition: 'Room Temp',
    minStockLevel: 0,
  });

  const [addInitialStock, setAddInitialStock] = useState(false);
  const [batchData, setBatchData] = useState({
    batchNumber: '',
    expiryDate: '',
    quantity: 0,
    mrp: 0,
    costPrice: 0,
  });

  // Pack Calculator State
  const [usePackCalculator, setUsePackCalculator] = useState(false);
  const [packData, setPackData] = useState({ packSize: 0, numPacks: 0 });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showScanner, setShowScanner] = useState(false);

  // Effect to auto-calculate quantity when pack data changes
  useEffect(() => {
    if (usePackCalculator) {
        const total = (Number(packData.packSize) || 0) * (Number(packData.numPacks) || 0);
        setBatchData(prev => ({ ...prev, quantity: total }));
    }
  }, [usePackCalculator, packData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBatchChange = (e) => {
    setBatchData({ ...batchData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const payload = {
      ...formData,
      minStockLevel: Number(formData.minStockLevel) || 0,
    };

    if (addInitialStock) {
        payload.initialBatch = {
            ...batchData,
            quantity: Number(batchData.quantity),
            mrp: Number(batchData.mrp),
            costPrice: Number(batchData.costPrice)
        };
    }
    

    try {
      const token = localStorage.getItem('token'); 

      const response = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload), 
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create product');
      }

      setMessage({ type: 'success', text: 'Product created successfully!' });
      
      // Reset form
      setFormData({
        name: '',
        genericName: '',
        category: '',
        manufacturer: '',
        storageCondition: 'Room Temp',
        minStockLevel: 0,
      });

      setAddInitialStock(false);
      setUsePackCalculator(false);
      setPackData({ packSize: 0, numPacks: 0 });
      setBatchData({
        batchNumber: '',
        expiryDate: '',
        quantity: 0,
        mrp: 0,
        costPrice: 0,
      });

      if (onSuccess) onSuccess();

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-blue-600" />
        Create New Product
      </h3>

      {message.text && (
        <div className={`p-4 mb-4 rounded-md flex items-center gap-2 ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Name *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="e.g. Panadol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Generic Name</label>
          <input
            type="text"
            name="genericName"
            value={formData.genericName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="e.g. Paracetamol"
          />
        </div>

        
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="e.g. Analgesic"
          />
        </div>

      
        <div>
          <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
          <input
            type="text"
            name="manufacturer"
            value={formData.manufacturer}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="e.g. GSK"
          />
        </div>

        
        <div>
          <label className="block text-sm font-medium text-gray-700">Storage Condition</label>
          <select
            name="storageCondition"
            value={formData.storageCondition}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          >
            <option value="Room Temp">Room Temp</option>
            <option value="Cold Chain">Cold Chain</option>
            <option value="Refrigerated">Refrigerated</option>
            <option value="Frozen">Frozen</option>
          </select>
        </div>

       
        <div>
          <label className="block text-sm font-medium text-gray-700">Minimum Stock Level</label>
          <input
            type="number"
            name="minStockLevel"
            min="0"
            value={formData.minStockLevel}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div className="md:col-span-2">
            <div className="flex items-center mb-4">
                <input
                    id="addInitialStock"
                    name="addInitialStock"
                    type="checkbox"
                    checked={addInitialStock}
                    onChange={(e) => setAddInitialStock(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="addInitialStock" className="ml-2 block text-sm text-gray-900">
                    Add Initial Stock
                </label>
            </div>
        </div>

        {addInitialStock && (
            <>
                <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Initial Batch Details</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number *</label>
                  <div className="flex mt-1">
                      <input
                        type="text"
                        name="batchNumber"
                        required={addInitialStock}
                        value={batchData.batchNumber}
                        onChange={handleBatchChange}
                        className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100"
                        title="Scan Barcode"
                      >
                          <Scan className="h-4 w-4" />
                      </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    required={addInitialStock}
                    value={batchData.expiryDate}
                    onChange={handleBatchChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Quantity (Units) *</label>

                  <div className="flex items-center mb-2 mt-1">
                      <input
                          type="checkbox"
                          id="usePackCalcProd"
                          className="mr-2"
                          checked={usePackCalculator}
                          onChange={(e) => setUsePackCalculator(e.target.checked)}
                      />
                      <label htmlFor="usePackCalcProd" className="text-xs text-gray-500">Calculate from Packs</label>
                  </div>

                  {usePackCalculator && (
                      <div className="flex space-x-2 mb-2">
                          <div className="flex-1">
                              <input
                                  type="number" min="0" placeholder="Size"
                                  className="w-full text-xs border rounded p-1"
                                  value={packData.packSize || ''}
                                  onChange={e => setPackData({...packData, packSize: e.target.value})}
                              />
                              <span className="text-[10px] text-gray-400">Units/Pack</span>
                          </div>
                          <div className="flex-1">
                              <input
                                  type="number" min="0" placeholder="Count"
                                  className="w-full text-xs border rounded p-1"
                                  value={packData.numPacks || ''}
                                  onChange={e => setPackData({...packData, numPacks: e.target.value})}
                              />
                              <span className="text-[10px] text-gray-400">No. Packs</span>
                          </div>
                      </div>
                  )}

                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    readOnly={usePackCalculator}
                    required={addInitialStock}
                    value={batchData.quantity}
                    onChange={handleBatchChange}
                    className={clsx(
                        "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border",
                        usePackCalculator && "bg-gray-100 cursor-not-allowed"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">MRP (Per Unit) *</label>
                  <input
                    type="number"
                    name="mrp"
                    step="0.01"
                    min="0"
                    required={addInitialStock}
                    value={batchData.mrp}
                    onChange={handleBatchChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>

                 <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Price (Per Unit) *</label>
                  <input
                    type="number"
                    name="costPrice"
                    step="0.01"
                    min="0"
                    required={addInitialStock}
                    value={batchData.costPrice}
                    onChange={handleBatchChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                 <div className="hidden md:block"></div>
            </>
        )}

        
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating Product...' : 'Create Product'}
          </button>
        </div>
      </form>

      {/* Scanner Modal */}
      {showScanner && (
          <ScannerModal
            onClose={() => setShowScanner(false)}
            onScan={(code) => {
                setBatchData(prev => ({ ...prev, batchNumber: code }));
                setShowScanner(false);
            }}
          />
      )}
    </div>
  );
};

export default AddProductForm;
