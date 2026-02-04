import CashShift from '../models/CashShift.js';
import Sale from '../models/Sale.js';
import { z } from 'zod';

export const getCurrentShift = async (req, res) => {
    try {
        // Find latest OPEN shift for this user
        // Assuming one shift per user at a time, or one global shift?
        // Typically POS shifts are per-cashier or per-terminal.
        // We'll do per-cashier for now based on req.user._id

        const shift = await CashShift.findOne({
            cashierId: req.user._id,
            status: 'OPEN'
        }).sort({ startTime: -1 });

        res.json(shift); // Returns null if no open shift
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const startShift = async (req, res) => {
    try {
        const { openingBalance } = req.body;

        // Check if already has open shift
        const existing = await CashShift.findOne({
            cashierId: req.user._id,
            status: 'OPEN'
        });

        if (existing) {
            return res.status(400).json({ message: "You already have an open shift." });
        }

        const shift = new CashShift({
            cashierId: req.user._id,
            openingBalance: openingBalance || 0,
            startTime: new Date(),
            status: 'OPEN'
        });

        await shift.save();
        res.status(201).json(shift);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const endShift = async (req, res) => {
    try {
        const { closingBalance, notes } = req.body;

        const shift = await CashShift.findOne({
            cashierId: req.user._id,
            status: 'OPEN'
        });

        if (!shift) {
            return res.status(404).json({ message: "No open shift found." });
        }

        // Calculate System Sales during this shift
        const sales = await Sale.find({
            cashierId: req.user._id,
            createdAt: { $gte: shift.startTime },
            paymentMethod: 'Cash', // Only cash affects drawer count?
            // Or usually we separate Card/Cash. The shift model tracks CASH drawer.
            // So we sum Cash sales.
            status: 'completed'
        });

        const cashSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

        // Also consider Returns? (Cash returns reduce drawer).
        // If returns are tracked in Sales as 'returned', we need to check if refund was Cash.
        // Simplified: We look at Refunds that happened during this shift by this cashier.
        // Note: Sale model updates `refundedAmount` but doesn't track *when* refund happened or *who* did it if different from seller.
        // For accurate shift tracking, we ideally need a 'Transaction' log.
        // Given current constraints, we'll approximate using Sales created in this shift.

        // To be safer, let's just stick to Sales made in this shift.

        shift.endTime = new Date();
        shift.closingBalance = closingBalance;
        shift.systemCalculatedSales = cashSales;
        shift.actualCashAmount = closingBalance; // This is the count.

        // Expected: Opening + CashSales.
        // Discrepancy: Actual - Expected.
        const expected = shift.openingBalance + cashSales;
        shift.discrepancy = closingBalance - expected;

        shift.status = 'CLOSED';
        shift.notes = notes;

        await shift.save();
        res.json(shift);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getShiftHistory = async (req, res) => {
    try {
        const shifts = await CashShift.find({ cashierId: req.user._id })
            .sort({ startTime: -1 })
            .limit(20);
        res.json(shifts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
