import express from 'express';
import Expense from '../models/Expense.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Add Expense
router.post('/', protectRoute, async (req, res) => {
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
router.get('/', protectRoute, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 }).limit(20);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

export default router;
