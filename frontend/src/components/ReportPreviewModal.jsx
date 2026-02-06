import React from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';

const ReportPreviewModal = ({ title, headers, data, onClose, onExportPDF, onExportExcel }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
              <h2 className="text-xl font-bold text-gray-800">{title}</h2>
              <p className="text-sm text-gray-500">Previewing {data.length} records</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6 bg-white">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700 font-semibold uppercase tracking-wider sticky top-0">
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-4 py-3 border-b border-gray-200">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50 transition-colors">
                    {headers.map((header, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.length === 0 && (
                    <tr>
                        <td colSpan={headers.length} className="px-4 py-8 text-center text-gray-400">
                            No data available for this report.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
          >
            Close
          </button>

          <button
            onClick={onExportExcel}
            className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 flex items-center gap-2 transition-transform active:scale-95"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>

          <button
            onClick={onExportPDF}
            className="px-5 py-2.5 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Download size={18} /> Export PDF
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReportPreviewModal;
