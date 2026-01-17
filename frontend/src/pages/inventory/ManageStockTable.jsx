import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getExpandedRowModel
} from '@tanstack/react-table';
import clsx from 'clsx';
import { Save, Trash2, ChevronRight, ChevronDown, ArrowRightLeft, Edit3, Search, Scan, Printer } from 'lucide-react';
import ScannerModal from '../../components/ScannerModal';
import PrintLabelModal from '../../components/inventory/PrintLabelModal';

const ManageStockTable = () => {
  const [data, setData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [printData, setPrintData] = useState(null); // For Print Modal

  // Transfer Modal State
  const [showTransfer, setShowTransfer] = useState(null);
  const [transferData, setTransferData] = useState({ fromLocation: '', toLocation: '', quantity: 0, reason: '' });

  // Adjust Modal State
  const [showAdjust, setShowAdjust] = useState(null);
  const [adjustData, setAdjustData] = useState({ location: '', quantity: 0, reason: '' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchRes, locRes] = await Promise.all([
          fetch('/api/inventory/batches-list', { headers: getAuthHeaders() }),
          fetch('/api/inventory/locations', { headers: getAuthHeaders() })
      ]);

      if (!batchRes.ok) throw new Error('Failed to fetch batches');
      setData(await batchRes.json());
      if (locRes.ok) setLocations(await locRes.json());

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Data
  const filteredData = useMemo(() => {
      if (!searchQuery) return data;
      const lowerQuery = searchQuery.toLowerCase();
      return data.filter(item => {
          const name = item.productId?.name?.toLowerCase() || '';
          const batchNo = item.batchNumber?.toLowerCase() || '';
          const barcode = item.productId?.barcode?.toLowerCase() || '';
          return name.includes(lowerQuery) || batchNo.includes(lowerQuery) || barcode.includes(lowerQuery);
      });
  }, [data, searchQuery]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/inventory/batches/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete');
      setData(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Transfer Logic ---
  const openTransferModal = (batch) => {
      setShowTransfer(batch);
      const firstLoc = batch.stockDistribution?.[0]?.location;
      setTransferData({
          fromLocation: firstLoc?._id || firstLoc || '',
          toLocation: '',
          quantity: 0,
          reason: ''
      });
  };

  const handleTransferSubmit = async (e) => {
      e.preventDefault();
      try {
          const payload = {
              batchId: showTransfer._id,
              fromLocationId: transferData.fromLocation,
              toLocationId: transferData.toLocation,
              quantity: Number(transferData.quantity),
              reason: transferData.reason
          };

          const res = await fetch('/api/inventory/transfer', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error((await res.json()).message || 'Transfer failed');

          alert("Transfer Successful");
          setShowTransfer(null);
          fetchData();
      } catch (err) {
          alert(err.message);
      }
  };

  // --- Adjust Logic ---
  const openAdjustModal = (batch) => {
      setShowAdjust(batch);
      const firstLoc = batch.stockDistribution?.[0]?.location;
      const firstLocId = firstLoc?._id || firstLoc || '';
      const initialQty = batch.stockDistribution?.[0]?.quantity || 0;

      setAdjustData({
          location: firstLocId,
          quantity: initialQty,
          reason: ''
      });
  };

  const handleAdjustLocationChange = (locId) => {
       // When location changes in dropdown, update the quantity input to reflect current stock there
       const dist = showAdjust.stockDistribution.find(s => (s.location._id || s.location) === locId);
       setAdjustData({
           ...adjustData,
           location: locId,
           quantity: dist ? dist.quantity : 0
       });
  }

  const handleAdjustSubmit = async (e) => {
      e.preventDefault();
      try {
          const payload = {
              batchId: showAdjust._id,
              locationId: adjustData.location,
              quantity: Number(adjustData.quantity),
              reason: adjustData.reason
          };

          const res = await fetch('/api/inventory/adjust', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error((await res.json()).message || 'Adjustment failed');

          alert("Stock Adjusted Successfully");
          setShowAdjust(null);
          fetchData();
      } catch (err) {
          alert(err.message);
      }
  };


  const columns = useMemo(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              {...{
                onClick: row.getToggleExpandedHandler(),
                style: { cursor: 'pointer' },
              }}
            >
              {row.getIsExpanded() ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
            </button>
          ) : null
        },
      },
      {
        header: 'Product Name',
        accessorKey: 'productId.name',
        cell: (info) => (
            <div>
                <div className="font-medium">{info.getValue() || 'Unknown'}</div>
                <div className="text-xs text-gray-400">{info.row.original.productId?.barcode}</div>
            </div>
        )
      },
      {
        header: 'Batch Number',
        accessorKey: 'batchNumber',
      },
      {
        header: 'Expiry Date',
        accessorKey: 'expiryDate',
        cell: (info) => {
            const date = info.getValue();
            return date ? new Date(date).toLocaleDateString() : 'N/A';
        }
      },
      {
        header: 'Total Quantity',
        accessorKey: 'quantity',
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => (
           <div className="flex space-x-2">
               <button
                   onClick={() => setPrintData(row.original)}
                   className="text-gray-600 hover:text-gray-900"
                   title="Print Label"
               >
                   <Printer className="w-5 h-5" />
               </button>
               <button
                   onClick={() => openTransferModal(row.original)}
                   className="text-blue-600 hover:text-blue-900"
                   title="Transfer Stock"
               >
                   <ArrowRightLeft className="w-5 h-5" />
               </button>
                <button
                   onClick={() => openAdjustModal(row.original)}
                   className="text-orange-600 hover:text-orange-900"
                   title="Adjust Stock"
               >
                   <Edit3 className="w-5 h-5" />
               </button>
               <button
                   onClick={() => handleDelete(row.original._id)}
                   className="text-red-600 hover:text-red-900"
                   title="Delete Batch"
               >
                   <Trash2 className="w-5 h-5" />
               </button>
           </div>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: filteredData || [],
    columns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by Product Name, Batch Number, or Barcode (Scan)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus // Helpful for scanners acting as keyboard
            />
             <div className="absolute inset-y-0 right-0 flex items-center">
                 <button
                    onClick={() => setShowScanner(true)}
                    className="p-2 text-gray-500 hover:text-blue-600 focus:outline-none"
                    title="Scan Barcode"
                 >
                     <Scan className="h-5 w-5" />
                 </button>
            </div>
        </div>

      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {table.getRowModel().rows.map((row, i) => (
              <React.Fragment key={row.id}>
                  <tr className={clsx("hover:bg-gray-100", i % 2 === 0 ? "bg-gray-50" : "bg-white")}>
                  {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                  ))}
                  </tr>
                  {row.getIsExpanded() && (
                      <tr>
                          <td colSpan={columns.length} className="p-4 bg-gray-50">
                              <h4 className="font-semibold text-xs text-gray-500 uppercase mb-2">Location Breakdown</h4>
                              <table className="min-w-full bg-white border rounded">
                                  <thead>
                                      <tr className="bg-gray-100 border-b">
                                          <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">Location</th>
                                          <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">Quantity</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {row.original.stockDistribution?.map((dist, idx) => (
                                          <tr key={idx} className="border-b last:border-0">
                                              <td className="py-2 px-4 text-sm">{dist.location?.name || 'Unknown'}</td>
                                              <td className="py-2 px-4 text-sm font-mono">{dist.quantity}</td>
                                          </tr>
                                      ))}
                                       {(!row.original.stockDistribution || row.original.stockDistribution.length === 0) && (
                                           <tr><td colSpan="2" className="p-2 text-center text-sm text-gray-500">No stock data</td></tr>
                                       )}
                                  </tbody>
                              </table>
                          </td>
                      </tr>
                  )}
              </React.Fragment>
            ))}
             {filteredData.length === 0 && (
                 <tr>
                     <td colSpan={columns.length} className="p-4 text-center text-gray-500">No matching records found.</td>
                 </tr>
             )}
          </tbody>
        </table>
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Transfer Stock</h3>
                <p className="text-sm mb-4">Batch: {showTransfer.batchNumber}</p>
                <form onSubmit={handleTransferSubmit}>
                    <div className="mb-3">
                        <label className="block text-sm">From Location</label>
                        <select
                            className="w-full border p-2 rounded"
                            value={transferData.fromLocation}
                            onChange={e => setTransferData({...transferData, fromLocation: e.target.value})}
                            required
                        >
                            <option value="">Select Location</option>
                            {showTransfer.stockDistribution.map(s => (
                                <option key={s.location._id || s.location} value={s.location._id || s.location}>
                                    {s.location.name || 'Location ' + (s.location._id || s.location)} (Qty: {s.quantity})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-3">
                        <label className="block text-sm">To Location</label>
                        <select
                            className="w-full border p-2 rounded"
                            value={transferData.toLocation}
                            onChange={e => setTransferData({...transferData, toLocation: e.target.value})}
                            required
                        >
                            <option value="">Select Location</option>
                            {locations.filter(l => l._id !== transferData.fromLocation).map(l => (
                                <option key={l._id} value={l._id}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                     <div className="mb-3">
                        <label className="block text-sm">Quantity</label>
                        <input
                            type="number" min="1"
                             className="w-full border p-2 rounded"
                            value={transferData.quantity}
                            onChange={e => setTransferData({...transferData, quantity: e.target.value})}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="block text-sm">Reason</label>
                         <input
                             type="text"
                             className="w-full border p-2 rounded"
                            value={transferData.reason}
                            onChange={e => setTransferData({...transferData, reason: e.target.value})}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowTransfer(null)} className="px-4 py-2 border rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Transfer</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Adjust Stock</h3>
                <p className="text-sm mb-4">Batch: {showAdjust.batchNumber}</p>
                <form onSubmit={handleAdjustSubmit}>
                    <div className="mb-3">
                        <label className="block text-sm">Location</label>
                        <select
                            className="w-full border p-2 rounded"
                            value={adjustData.location}
                            onChange={e => handleAdjustLocationChange(e.target.value)}
                            required
                        >
                            <option value="">Select Location</option>
                            {/* Show existing locations for this batch, OR all locations if we allow adding stock to new loc?
                                For now, let's allow all locations to enable "Adding" stock found in a new place.
                             */}
                            {locations.map(l => (
                                <option key={l._id} value={l._id}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                     <div className="mb-3">
                        <label className="block text-sm">New Quantity</label>
                        <input
                            type="number" min="0"
                             className="w-full border p-2 rounded"
                            value={adjustData.quantity}
                            onChange={e => setAdjustData({...adjustData, quantity: e.target.value})}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the total actual physical quantity.</p>
                    </div>
                    <div className="mb-3">
                        <label className="block text-sm">Reason *</label>
                         <input
                             type="text"
                             className="w-full border p-2 rounded"
                            value={adjustData.reason}
                            onChange={e => setAdjustData({...adjustData, reason: e.target.value})}
                            required
                            placeholder="e.g., Damaged, Found, Counting Error"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAdjust(null)} className="px-4 py-2 border rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded">Adjust</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
          <ScannerModal
            onClose={() => setShowScanner(false)}
            onScan={(code) => {
                setSearchQuery(code);
                setShowScanner(false);
            }}
          />
      )}

      {/* Print Label Modal */}
      <PrintLabelModal
        isOpen={!!printData}
        onClose={() => setPrintData(null)}
        data={printData}
      />

    </div>
  );
};

export default ManageStockTable;
