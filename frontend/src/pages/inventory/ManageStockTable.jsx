import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { Save, Trash2 } from 'lucide-react';

const ManageStockTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRows, setEditingRows] = useState({}); // { [rowId]: { quantity: number } }

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
      const response = await fetch('/api/inventory/batches-list', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch batches');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuantityChange = (rowId, value) => {
    setEditingRows(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], quantity: value }
    }));
  };

  const handleSave = async (row) => {
    const editState = editingRows[row._id];
    if (!editState) return; // No changes

    try {
      const response = await fetch(`/api/inventory/batches/${row._id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity: Number(editState.quantity) })
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.message || 'Failed to update');
      }

      const updatedBatch = await response.json();

      // Update local data
      setData(prev => prev.map(item => item._id === row._id ? { ...item, quantity: updatedBatch.quantity } : item));

      // Clear edit state for this row
      setEditingRows(prev => {
        const newState = { ...prev };
        delete newState[row._id];
        return newState;
      });

      alert('Batch updated successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/inventory/batches/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
         const resData = await response.json();
         throw new Error(resData.message || 'Failed to delete');
      }

      setData(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'Product Name',
        accessorKey: 'productId.name', // Access nested property
        cell: (info) => info.getValue() || 'Unknown Product'
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
        header: 'Quantity',
        accessorKey: 'quantity',
        cell: ({ row, getValue }) => {
            const isEditing = editingRows[row.original._id] !== undefined;
            const currentValue = isEditing ? editingRows[row.original._id].quantity : getValue();

            return (
                <input
                    type="number"
                    min="0"
                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-1"
                    value={currentValue}
                    onChange={(e) => handleQuantityChange(row.original._id, e.target.value)}
                />
            );
        }
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => {
           const isEditing = editingRows[row.original._id] !== undefined;

           return (
               <div className="flex space-x-2">
                   {isEditing && (
                       <button
                           onClick={() => handleSave(row.original)}
                           className="text-green-600 hover:text-green-900"
                           title="Save Changes"
                       >
                           <Save className="w-5 h-5" />
                       </button>
                   )}
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
      }
    ],
    [editingRows] // Depend on editingRows so it re-renders when edit state changes
  );

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (error) {
      return <div className="text-red-500">Error loading batches: {error}</div>
  }

  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={clsx(
                "hover:bg-gray-100",
                i % 2 === 0 ? "bg-gray-50" : "bg-white"
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
       {data && data.length === 0 && (
          <div className="p-4 text-center text-gray-500">No batches found.</div>
      )}
    </div>
  );
};

export default ManageStockTable;