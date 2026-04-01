import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';

export const getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to today if no date provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23,59,59,999));

    const salesSummary = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                salesCount: { $sum: 1 }
              }
            }
          ],
          items: [
            { $unwind: "$items" },
            {
              $group: {
                _id: null,
                totalCOGS: { $sum: { $multiply: [{ $ifNull: ["$items.costPrice", 0] }, "$items.quantity"] } },
                totalDiscounts: { $sum: { $ifNull: ["$items.discount", 0] } }
              }
            }
          ]
        }
      }
    ]);

    const expensesSummary = await Expense.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          expensesCount: { $sum: 1 }
        }
      }
    ]);

    const stats = salesSummary[0];
    const totalRevenue = stats.totals[0]?.totalRevenue || 0;
    const salesCount = stats.totals[0]?.salesCount || 0;
    const totalCOGS = stats.items[0]?.totalCOGS || 0;
    const totalDiscounts = stats.items[0]?.totalDiscounts || 0;

    const expStats = expensesSummary[0];
    const totalExpenses = expStats?.totalExpenses || 0;
    const expensesCount = expStats?.expensesCount || 0;

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    res.json({
      totalRevenue,
      totalCOGS,
      totalExpenses,
      grossProfit,
      netProfit,
      grossMarginPercentage,
      totalDiscounts,
      salesCount,
      expensesCount
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
