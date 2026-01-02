import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const StockTable = ({ data, isLoading }) => {
  const columns = useMemo(
    () => [
      {
        header: 'Product Name',
        accessorKey: 'name',
      },
      {
        header: 'Total Stock',
        accessorKey: 'totalStock',
      },
      {
        header: 'Next Expiry Date',
        accessorKey: 'nextExpiryDate',
        cell: (info) => {
            const date = info.getValue();
            return date ? new Date(date).toLocaleDateString() : 'N/A';
        }
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: (info) => {
            const row = info.row.original;
            const isLowStock = row.totalStock < row.minStockLevel;

            return (
                <div className={clsx(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                    isLowStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                )}>
                    {isLowStock ? (
                        <>
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Low Stock
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Good
                        </>
                    )}
                </div>
            );
        }
      },
    ],
    []
  );

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
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
          <div className="p-4 text-center text-gray-500">No inventory data found.</div>
      )}
    </div>
  );
};

export default StockTable;
