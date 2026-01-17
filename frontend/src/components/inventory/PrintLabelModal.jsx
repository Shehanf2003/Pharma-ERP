import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';
import { X, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const PrintLabelModal = ({ isOpen, onClose, data }) => {
  const [codeType, setCodeType] = useState('QR'); // 'QR' or 'BARCODE'
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Label-${data?.batchNumber || 'Product'}`,
  });

  if (!isOpen || !data) return null;

  // Data mapping
  const productName = data.productId?.name || data.name || "Unknown Product";
  const batchNumber = data.batchNumber || "N/A";
  const expiry = data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : "N/A";
  const price = data.mrp ? `Rs. ${data.mrp}` : "";

  // The value to encode: Prefer Barcode/UPC for Products, Batch Number for Batches
  // If it's a batch row, we encode the Batch Number (so scanning it fills the batch field or finds the batch)
  // If it's a product row (inventory view), we might encode the product barcode if available.
  // For this implementation, we'll default to the Batch Number as it's more specific for inventory.
  const codeValue = batchNumber !== "N/A" ? batchNumber : (data.barcode || "NO_DATA");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Generate Label</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center space-y-4">

          {/* Toggle Type */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCodeType('QR')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                codeType === 'QR' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              QR Code
            </button>
            <button
              onClick={() => setCodeType('BARCODE')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                codeType === 'BARCODE' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Barcode
            </button>
          </div>

          {/* Preview Area (This is what gets printed) */}
          <div
            ref={componentRef}
            className="border-2 border-dashed border-gray-300 p-4 rounded bg-white flex flex-col items-center justify-center text-center w-full max-w-[300px]"
            style={{ minHeight: '300px' }}
          >
            <h4 className="font-bold text-sm mb-1">{productName}</h4>
            <div className="text-xs text-gray-600 mb-2">Batch: {batchNumber} | Exp: {expiry}</div>

            <div className="py-2">
                {codeType === 'QR' ? (
                    <QRCode
                        value={codeValue}
                        size={128}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                ) : (
                    <Barcode
                        value={codeValue}
                        width={1.5}
                        height={50}
                        fontSize={12}
                    />
                )}
            </div>

            <div className="text-sm font-bold mt-2">{price}</div>
            <div className="text-[10px] text-gray-400 mt-1">Pharma ERP System</div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t bg-gray-50 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            <Printer size={16} className="mr-2" />
            Print Label
          </button>
        </div>

      </div>
    </div>
  );
};

export default PrintLabelModal;
