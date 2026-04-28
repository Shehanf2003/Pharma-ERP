import express from 'express';
import Expense from '../models/Expense.js';
import { getFinancialStats, getReports } from '../controllers/finance.controller.js';
import { protectRoute, adminRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Dashboard Stats
router.get('/stats', protectRoute, getFinancialStats);

// Reports
router.get('/reports', protectRoute, getReports);

// Add Expense
router.post('/expenses', protectRoute, async (req, res) => {
  try {
    const { description, amount, category, date, status, paymentMethod } = req.body;
    const expense = await Expense.create({
      description,
      amount,
      category,
      date: date || Date.now(),
      createdBy: req.user._id,
      status: status || 'PAID',
      paymentMethod: status === 'PENDING' ? null : (paymentMethod || 'CASH')
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error adding expense', error: error.message });
  }
});

// List Expenses
router.get('/expenses', protectRoute, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 }).limit(100);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// Update Expense
router.put('/expenses/:id', protectRoute, async (req, res) => {
  try {
    const { status, paymentMethod } = req.body;
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (status) expense.status = status;
    if (expense.status === 'PENDING') {
      expense.paymentMethod = null;
    } else if (paymentMethod) {
      expense.paymentMethod = paymentMethod;
    }

    await expense.save();

    const io = req.app.get('io');
    if (io) {
        io.emit('FINANCE_UPDATE');
        io.emit('DASHBOARD_UPDATE');
        io.emit('STATS_UPDATE');
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error updating expense', error: error.message });
  }
});

// Delete Expense
router.delete('/expenses/:id', protectRoute, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const io = req.app.get('io');
    if (io) {
        io.emit('FINANCE_UPDATE');
        io.emit('DASHBOARD_UPDATE');
        io.emit('STATS_UPDATE');
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense', error: error.message });
  }
});

// Legacy routes (backward compatibility if frontend uses root /api/finance/ directly for expenses)
// Assuming previous frontend used GET / and POST / on this router.
router.post('/', protectRoute, async (req, res) => {
    // Redirect logic or duplicate
     try {
    const { description, amount, category, date, status, paymentMethod } = req.body;
    const expense = await Expense.create({
      description,
      amount,
      category,
      date: date || Date.now(),
      createdBy: req.user._id,
      status: status || 'PAID',
      paymentMethod: status === 'PENDING' ? null : (paymentMethod || 'CASH')
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error adding expense', error: error.message });
  }
});

router.get('/', protectRoute, async (req, res) => {
     try {
    const expenses = await Expense.find().sort({ date: -1 }).limit(20);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});


export default router;
