import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const ScannerModal = ({ onClose, onScan }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    // Initialize scanner
    // The ID "reader" must match the div ID below
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Success
        onScan(decodedText);
        // We typically want to close after successful scan,
        // but we'll let the parent handle that via onScan calling onClose if desired.
        // Or we can stop scanning here.
        scanner.clear();
        onClose();
      },
      (errorMessage) => {
        // Error / Scanning...
        // console.log(errorMessage);
      }
    );

    scannerRef.current = scanner;

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5-qrcode scanner. ", error);
        });
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={() => {
             if(scannerRef.current) scannerRef.current.clear();
             onClose();
          }}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-lg font-bold mb-4 text-center">Scan Barcode / QR Code</h3>
        <div id="reader" className="w-full"></div>
        <p className="text-xs text-gray-500 text-center mt-2">
            Align the code within the frame.
        </p>
      </div>
    </div>
  );
};

export default ScannerModal;
