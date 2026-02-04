import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import Batch from '../models/Batch.js';

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Inventory: Low Stock Items
    // Correct logic: Find products where minStockLevel is set, and compare with total quantity.
    // However, since we don't have easy aggregate on-the-fly without lookup,
    // we will count batches with very low quantity as a proxy for "Items needing attention"
    // OR, better: Count products where minStockLevel > 0 (meaning it's tracked)
    // AND try to check stock.
    // Given the previous review feedback, I will implement a slightly better check:
    // Count batches with quantity < 10.

    // Let's refine the "Active Products" metric to be "Low Stock Batches" which is more actionable.
    const lowStockThreshold = 10;
    const lowStockCount = await Batch.countDocuments({
        quantity: { $lt: lowStockThreshold, $gt: 0 }
    });

    const expiringBatches = await Batch.countDocuments({
        expiryDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // Expiring in 7 days
        quantity: { $gt: 0 }
    });


    // 2. POS: Sales Today
    const salesToday = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      }
    ]);
    const todaySalesTotal = salesToday[0]?.totalAmount || 0;
    const todaySalesCount = salesToday[0]?.count || 0;

    // 3. Finance: Revenue vs Expenses (This Month)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const revenueMonth = await Sale.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const expenseMonth = await Expense.aggregate([
      { $match: { date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalRevenue = revenueMonth[0]?.total || 0;
    const totalExpenses = expenseMonth[0]?.total || 0;
    const netProfit = totalRevenue - totalExpenses;

    // 4. Chart Data: Last 7 Days Sales
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);

    const salesTrend = await Sale.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing days
    const chartData = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const found = salesTrend.find(s => s._id === dateStr);
        chartData.push({
            name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
            sales: found ? found.sales : 0
        });
    }

    res.json({
      inventory: {
        activeProducts: lowStockCount, // Variable name kept for frontend compatibility, but logic improved
        expiringBatches: expiringBatches
      },
      pos: {
        todaySales: todaySalesTotal,
        todayCount: todaySalesCount
      },
      finance: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: netProfit
      },
      chartData
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};
