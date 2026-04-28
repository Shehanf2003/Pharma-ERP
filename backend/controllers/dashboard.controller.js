import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import Batch from '../models/Batch.js';

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Inventory: Low Stock Items
    const products = await Product.find({ isDeleted: { $ne: true } });
    let lowStockCount = 0;
    for (const product of products) {
        if (product.minStockLevel !== undefined) {
            const totalStock = await Batch.checkLowStock(product._id);
            if (totalStock <= product.minStockLevel) {
                lowStockCount++;
            }
        }
    }

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

    const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const prevDayStart = new Date(today);
    prevDayStart.setDate(prevDayStart.getDate() - 1);
    const prevDayEnd = new Date(prevDayStart);
    prevDayEnd.setHours(23, 59, 59, 999);

    const salesMonth = await Sale.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      {
        $facet: {
          revenue: [
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ],
          cogs: [
            { $unwind: "$items" },
            { $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ["$items.costPrice", 0] }, "$items.quantity"] } } } }
          ]
        }
      }
    ]);

    const expenseMonth = await Expense.aggregate([
      { $match: { date: { $gte: startOfMonth }, status: { $ne: 'PENDING' } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalRevenue = salesMonth[0]?.revenue[0]?.total || 0;
    const totalCOGS = salesMonth[0]?.cogs[0]?.total || 0;
    const totalExpenses = expenseMonth[0]?.total || 0;
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    const salesPrevMonth = await Sale.aggregate([
      { $match: { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
      {
        $facet: {
          revenue: [
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ],
          cogs: [
            { $unwind: "$items" },
            { $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ["$items.costPrice", 0] }, "$items.quantity"] } } } }
          ]
        }
      }
    ]);

    const expensePrevMonth = await Expense.aggregate([
      { $match: { date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }, status: { $ne: 'PENDING' } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const prevMonthRevenue = salesPrevMonth[0]?.revenue[0]?.total || 0;
    const prevMonthCOGS = salesPrevMonth[0]?.cogs[0]?.total || 0;
    const prevMonthExpenses = expensePrevMonth[0]?.total || 0;
    const prevMonthProfit = prevMonthRevenue - prevMonthCOGS - prevMonthExpenses;

    const salesTodayFinance = await Sale.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $facet: {
          revenue: [
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ],
          cogs: [
            { $unwind: "$items" },
            { $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ["$items.costPrice", 0] }, "$items.quantity"] } } } }
          ]
        }
      }
    ]);

    const expenseToday = await Expense.aggregate([
      { $match: { date: { $gte: today }, status: { $ne: 'PENDING' } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const todayRevenue = salesTodayFinance[0]?.revenue[0]?.total || 0;
    const todayCOGS = salesTodayFinance[0]?.cogs[0]?.total || 0;
    const todayExpenses = expenseToday[0]?.total || 0;
    const todayProfit = todayRevenue - todayCOGS - todayExpenses;

    const salesPrevDay = await Sale.aggregate([
      { $match: { createdAt: { $gte: prevDayStart, $lte: prevDayEnd } } },
      {
        $facet: {
          revenue: [
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ],
          cogs: [
            { $unwind: "$items" },
            { $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ["$items.costPrice", 0] }, "$items.quantity"] } } } }
          ]
        }
      }
    ]);

    const expensePrevDay = await Expense.aggregate([
      { $match: { date: { $gte: prevDayStart, $lte: prevDayEnd }, status: { $ne: 'PENDING' } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const prevDayRevenue = salesPrevDay[0]?.revenue[0]?.total || 0;
    const prevDayCOGS = salesPrevDay[0]?.cogs[0]?.total || 0;
    const prevDayExpenses = expensePrevDay[0]?.total || 0;
    const prevDayProfit = prevDayRevenue - prevDayCOGS - prevDayExpenses;

    const pendingExpensesAggr = await Expense.aggregate([
      { $match: { status: 'PENDING' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const pendingExpenses = pendingExpensesAggr[0]?.total || 0;

    // 4. Chart Data: Dynamic Date Range
    let daysToFetch = 7;
    let pastDate = new Date();
    let endDate = new Date();

    if (req.query.startDate && req.query.endDate) {
        pastDate = new Date(req.query.startDate);
        endDate = new Date(req.query.endDate);
        const diffTime = Math.abs(endDate.getTime() - pastDate.getTime());
        daysToFetch = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else if (req.query.days) {
        daysToFetch = parseInt(req.query.days, 10);
        pastDate.setDate(pastDate.getDate() - (daysToFetch - 1));
    } else {
        pastDate.setDate(pastDate.getDate() - 6);
    }
    
    pastDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (daysToFetch > 365) daysToFetch = 365; // Safeguard

    const salesTrend = await Sale.aggregate([
      { $match: { createdAt: { $gte: pastDate, $lte: endDate } } },
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
    for (let i = 0; i < daysToFetch; i++) {
        const d = new Date(pastDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const found = salesTrend.find(s => s._id === dateStr);
        
        let labelFormat;
        if (daysToFetch <= 14) {
            labelFormat = { weekday: 'short' };
        } else {
            labelFormat = { month: 'short', day: 'numeric' };
        }
        
        chartData.push({
            name: new Date(dateStr).toLocaleDateString('en-US', labelFormat),
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
        cogs: totalCOGS,
        expenses: totalExpenses,
        profit: netProfit,
        prevMonthRevenue,
        prevMonthCOGS,
        prevMonthExpenses,
        prevMonthProfit,
        todayRevenue,
        todayCOGS,
        todayExpenses,
        todayProfit,
        prevDayRevenue,
        prevDayCOGS,
        prevDayExpenses,
        prevDayProfit,
        pendingExpenses
      },
      chartData
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};
