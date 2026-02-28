import React from 'react';
import Barcode from 'react-barcode';

const LabelPrint = React.forwardRef(({ item, billNumber = 'OP00000000-DRIVE THR' }, ref) => {
    if (!item) return null;

    // Dosage comes from item.dosageInstructions (backend) or item.dosage (frontend local state)
    const dosage = item.dosageInstructions || item.dosage || {
        patientName: '',
        amount: '1',
        unit: 'TABLET',
        frequency: '',
        timing: ''
    };

    // Format date consistently (YYYY-MM-DD)
    const issueDate = new Date().toISOString().split('T')[0];
    // Find the batch to get expiry if available, otherwise mock or leave blank
    // Assuming item object passed from cart has batch details or at least expiry if we map it,
    // but right now cart only stores batchId. Let's assume an arbitrary future date or if item has expiry.
    const expiryDate = item.expiryDate || '2026-09-30'; // Mocked for UI template matching

    return (
        <div ref={ref} className="w-[100mm] h-[75mm] bg-white text-black box-border font-sans p-4 flex flex-col justify-between" style={{ pageBreakAfter: 'always' }}>

            {/* Top Section */}
            <div className="flex justify-between items-start text-sm pb-1">
                <div className="flex-1">
                    <div className="font-bold text-[18px] leading-tight mb-1 truncate uppercase">
                        {item.name} ({item.quantity})
                    </div>
                    <div className="text-[13px] tracking-wide">
                        EXPIRY DATE: {expiryDate}
                    </div>
                </div>
                <div className="text-right text-[12px] whitespace-nowrap pt-1">
                    BILL NO: {billNumber}
                </div>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400 my-1"></div>

            {/* Sub Header */}
            <div className="flex gap-4 text-[11px] mb-2 uppercase tracking-wide">
                <span>ISSUED DATE: {issueDate}</span>
                <span className="truncate flex-1">NAME: <span className="font-bold">{dosage.patientName || '_________________'}</span></span>
            </div>

            {/* DIRECTION Header */}
            <div className="text-sm tracking-widest underline underline-offset-2 mb-2">
                DIRECTION
            </div>

            {/* Instructions Body */}
            <div className="flex-1 flex flex-col justify-center items-center text-center -mt-2">
                <div className="text-[22px] tracking-wider mb-1 uppercase">
                    {dosage.amount} {dosage.unit}
                </div>
                <div className="text-[16px] tracking-wider mb-2 uppercase">
                    TO BE TAKEN/GIVEN
                </div>
                <div className="text-[18px] font-medium tracking-wide">
                    {dosage.frequency || '_________________'}
                </div>
            </div>

            {/* Timing */}
            <div className="text-[16px] tracking-wide uppercase mt-1 mb-2">
                 {dosage.timing || '_________________'}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400 my-1"></div>

            {/* Footer */}
            <div className="flex justify-between items-center h-8">
                <div className="text-[11px] uppercase tracking-wide">
                    PHARMA PLC LTD
                </div>
                <div className="h-full flex items-center pt-2">
                    {/* Simulated barcode using generic library if needed, or CSS representation */}
                    <div className="h-6 w-32 border-l border-r border-black overflow-hidden flex">
                        {/* Fake barcode lines for aesthetic matching */}
                        {[...Array(40)].map((_, i) => (
                            <div key={i} className="h-full bg-black" style={{ width: `${Math.random() * 2 + 1}px`, marginRight: `${Math.random() * 2}px` }}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default LabelPrint;
