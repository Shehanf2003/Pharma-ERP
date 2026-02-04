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
    const { description, amount, category, date } = req.body;
    const expense = await Expense.create({
      description,
      amount,
      category,
      date: date || Date.now(),
      createdBy: req.user._id
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

// Legacy routes (backward compatibility if frontend uses root /api/finance/ directly for expenses)
// Assuming previous frontend used GET / and POST / on this router.
router.post('/', protectRoute, async (req, res) => {
    // Redirect logic or duplicate
     try {
    const { description, amount, category, date } = req.body;
    const expense = await Expense.create({
      description,
      amount,
      category,
      date: date || Date.now(),
      createdBy: req.user._id
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
