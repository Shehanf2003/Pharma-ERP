export const initiatePayment = async (req, res) => {
    try {
        const { amount, orderId, provider } = req.body;

        // Simulate Gateway Interaction
        // In a real PayHere integration, we would hash the merchant ID + amount + orderID and return form data.

        // Mock Response
        const transactionId = `TXN-${Date.now()}`;

        res.json({
            status: 'INITIATED',
            transactionId,
            redirectUrl: null, // If web-based
            qrCodeData: `mock-payment://${provider}?amount=${amount}&ref=${transactionId}` // Frontend can render this
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { transactionId } = req.body;

        // Mock Verification
        // Always success for demo
        res.json({
            status: 'SUCCESS',
            transactionId,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
