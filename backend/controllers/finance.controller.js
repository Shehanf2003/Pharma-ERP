import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';

export const getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to today if no date provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23,59,59,999));

    const sales = await Sale.find({
      createdAt: { $gte: start, $lte: end },
      status: 'completed'
    });

    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    });

    // Calculate Totals
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalDiscounts = 0;

    sales.forEach(sale => {
      totalRevenue += sale.totalAmount;
      sale.items.forEach(item => {
        totalCOGS += (item.costPrice || 0) * item.quantity;
        totalDiscounts += item.discount || 0;
      });
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    res.json({
      totalRevenue,
      totalCOGS,
      totalExpenses,
      netProfit,
      totalDiscounts,
      salesCount: sales.length,
      expensesCount: expenses.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    if (type === 'SALES') {
      const sales = await Sale.find({
        createdAt: { $gte: start, $lte: end },
        status: 'completed'
      }).populate('items.productId', 'name').sort({ createdAt: -1 });
      return res.json(sales);
    } else if (type === 'EXPENSES') {
      const expenses = await Expense.find({
        date: { $gte: start, $lte: end }
      }).sort({ date: -1 });
      return res.json(expenses);
    } else if (type === 'PNL') {
      // Aggregate by Day
      // This is a bit complex for a simple query, returning raw data for frontend processing
      // or we can aggregate here.
      // Let's return raw aggregated data.

      const sales = await Sale.find({
        createdAt: { $gte: start, $lte: end },
        status: 'completed'
      });

      const expenses = await Expense.find({
        date: { $gte: start, $lte: end }
      });

      // Combine into a daily breakdown
      return res.json({ sales, expenses });
    }

    res.status(400).json({ message: "Invalid report type" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
