import Sale from '../models/Sale.js';
import mongoose from 'mongoose';

export const getSalesDashboard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 1. Build the Match Stage (Date Filters & Status)
        const matchStage = { status: 'completed' };
        
        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                // Set the end date to the very end of the day
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            };
        }

        // 2. Fetch Basic Metrics (Total Revenue, Total Orders, AOV)
        const basicMetricsResult = await Sale.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    // Revenue = totalAmount - refundedAmount
                    totalRevenue: { $sum: { $subtract: ["$totalAmount", "$refundedAmount"] } },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        const totalRevenue = basicMetricsResult.length > 0 ? basicMetricsResult[0].totalRevenue : 0;
        const totalOrders = basicMetricsResult.length > 0 ? basicMetricsResult[0].totalOrders : 0;
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

        // 3. Fetch Sales Trends (Revenue Grouped by Month or Day)
        // Adjust formatting string if you prefer daily viewing (e.g., "%Y-%m-%d")
        const salesTrendsRaw = await Sale.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    Revenue: { $sum: { $subtract: ["$totalAmount", "$refundedAmount"] } }
                }
            },
            { $sort: { "_id": 1 } } // Sort chronologically
        ]);

        // Format for Tremor: { date: "2025-01", Revenue: 2500 }
        const salesTrends = salesTrendsRaw.map(item => ({
            date: item._id,
            Revenue: item.Revenue
        }));

        // 4. Fetch Category Breakdown
        // Requires looking up the Product collection to get category names
        const categoryDataRaw = await Sale.aggregate([
            { $match: matchStage },
            { $unwind: "$items" }, // Deconstruct the items array
            {
                $lookup: {
                    from: "products", // The MongoDB collection name for products (usually plural, lowercase)
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.category",
                    // Category Revenue = (Quantity - Returned) * Price
                    sales: {
                        $sum: {
                            $multiply: [
                                { $subtract: ["$items.quantity", "$items.returnedQuantity"] },
                                "$items.price"
                            ]
                        }
                    }
                }
            },
            { $sort: { sales: -1 } }
        ]);

        const categoryData = categoryDataRaw.map(item => ({
            name: item._id || "Uncategorized",
            sales: item.sales
        }));

        // 5. Fetch Top Selling Products (By Units Sold)
        const topProductsRaw = await Sale.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.name",
                    // Total units sold minus returns
                    units: { $sum: { $subtract: ["$items.quantity", "$items.returnedQuantity"] } }
                }
            },
            { $sort: { units: -1 } }, // Sort descending
            { $limit: 5 } // Top 5 products
        ]);

        const topProducts = topProductsRaw.map(item => ({
            name: item._id || "Unknown Product",
            units: item.units
        }));

        // 6. Construct and send the final payload
        const dashboardData = {
            salesTrends,
            categoryData,
            topProducts,
            totalRevenue,
            totalOrders,
            avgOrderValue
        };

        res.json(dashboardData);

    } catch (error) {
        console.error("Dashboard Aggregation Error:", error);
        res.status(500).json({ message: "Failed to generate sales analytics" });
    }
};