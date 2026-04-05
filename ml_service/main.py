from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import mean_absolute_error, mean_squared_error, silhouette_score
from prophet import Prophet
import os
import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import pulp

# Load environment variables from the backend .env file
load_dotenv(dotenv_path="../backend/.env")
MONGO_URI = os.getenv("MONGO_URI")

app = FastAPI(title="Pharma ERP ML Service")

# Allow React frontend to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.get_default_database()

@app.get("/")
def read_root():
    return {"message": "Pharma ERP Machine Learning Service is running."}

# ---------------------------------------------------------
# MODEL 1: FMCG ABC Analysis using K-Means Clustering
# ---------------------------------------------------------
@app.get("/api/ml/fmcg-clustering")
def fmcg_clustering(days: int = 90):
    """
    Uses K-Means clustering to categorize products into Fast, Normal, and Slow moving
    based on sales volume and order frequency.
    """
    cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    
    # 1. Fetch Sales Data
    sales = list(db.sales.find({"createdAt": {"$gte": cutoff_date}}))
    if not sales:
        raise HTTPException(status_code=404, detail="Not enough sales data for clustering")

    # 2. Extract and format data into a Pandas DataFrame
    data = []
    for sale in sales:
        for item in sale.get("items", []):
            data.append({
                "productId": str(item["productId"]),
                "quantity": item["quantity"]
            })
    
    df = pd.DataFrame(data)
    if df.empty:
        raise HTTPException(status_code=404, detail="No items found in recent sales")

    # 3. Aggregate metrics per product: Total Volume & Order Frequency
    product_stats = df.groupby('productId').agg(
        total_quantity=('quantity', 'sum'),
        order_frequency=('quantity', 'count')
    ).reset_index()

    # 4. Apply K-Means Clustering (3 Clusters: Fast, Normal, Slow)
    X = product_stats[['total_quantity', 'order_frequency']]
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    product_stats['cluster'] = kmeans.fit_predict(X)

    # Calculate Silhouette Score to evaluate cluster quality
    try:
        score = float(silhouette_score(X, product_stats['cluster']))
    except ValueError:
        score = None  # Fails if there's not enough variation to create distinct clusters

    # 5. Determine which cluster is which (based on average quantity in the cluster)
    cluster_centers = product_stats.groupby('cluster')['total_quantity'].mean().sort_values(ascending=False)
    fast_cluster = cluster_centers.index[0]
    normal_cluster = cluster_centers.index[1]
    slow_cluster = cluster_centers.index[2]

    def assign_label(cluster_id):
        if cluster_id == fast_cluster: return "Fast"
        if cluster_id == normal_cluster: return "Normal"
        return "Slow"

    product_stats['fmcg_class'] = product_stats['cluster'].apply(assign_label)

    # 6. Format Output
    results = []
    for _, row in product_stats.iterrows():
        # Optionally fetch product name from DB here
        product = db.products.find_one({"_id": ObjectId(row['productId'])})
        results.append({
            "productId": row['productId'],
            "productName": product['name'] if product else "Unknown",
            "totalQuantity": int(row['total_quantity']),
            "orderFrequency": int(row['order_frequency']),
            "fmcgClass": row['fmcg_class']
        })

    # Sort by Fast first, then total quantity
    sorted_results = sorted(results, key=lambda x: (x['fmcgClass'] != 'Fast', -x['totalQuantity']))
    return {
        "silhouetteScore": round(score, 3) if score is not None else None,
        "data": sorted_results
    }


# ---------------------------------------------------------
# MODEL 2: Demand Forecasting using Exponential Smoothing
# ---------------------------------------------------------
@app.get("/api/ml/forecast/{product_id}")
def demand_forecast(product_id: str, days_to_predict: int = 30):
    """
    Predicts future daily sales for a specific product based on historical trends
    using the Holt-Winters Exponential Smoothing model.
    """
    # 1. Resolve Product ID
    try:
        obj_id = ObjectId(product_id)
    except InvalidId:
        # Fallback: attempt to find the product by name if an invalid ID is passed
        product = db.products.find_one({"name": product_id})
        if not product:
            raise HTTPException(status_code=400, detail=f"Invalid product ID format or product name not found: {product_id}")
        obj_id = product["_id"]
        # Update product_id to the stringified correct ID for the return payload
        product_id = str(obj_id)

    # 2. Fetch historical sales for this product
    pipeline = [
        {"$unwind": "$items"},
        {"$match": {"items.productId": obj_id, "status": {"$ne": "returned"}}},
        {"$project": {
            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "quantity": "$items.quantity"
        }}
    ]
    
    sales = list(db.sales.aggregate(pipeline))
    if len(sales) < 30:
        raise HTTPException(status_code=400, detail="Not enough historical data to forecast. Need at least 30 data points.")

    # 3. Prepare Time-Series Data
    df = pd.DataFrame(sales)
    df['ds'] = pd.to_datetime(df['date'])
    df.rename(columns={'quantity': 'y'}, inplace=True)
    
    # Group by day and sum quantities (fill missing days with 0)
    daily_sales = df.groupby('ds')['y'].sum().reset_index()
    daily_sales.set_index('ds', inplace=True)
    daily_sales = daily_sales.asfreq('D', fill_value=0).reset_index()

    # 4. Apply Meta's Prophet Model
    # Prophet is excellent for business time series, robust to missing data and shifts
    model = Prophet(yearly_seasonality='auto', weekly_seasonality=True, daily_seasonality=False)
    
    # ADD THIS LINE: Tell Prophet to look out for Sri Lankan holidays!
    model.add_country_holidays(country_name='LK') 
    model.fit(daily_sales)

    # 5. Forecast future days
    future = model.make_future_dataframe(periods=days_to_predict)
    forecast = model.predict(future)
    
    # 6. Format Output
    predictions = []
    future_forecast = forecast.tail(days_to_predict)
    for _, row in future_forecast.iterrows():
        predictions.append({"date": row['ds'].strftime("%Y-%m-%d"), "predictedQuantity": max(0, round(row['yhat'], 2))})

    return {"productId": product_id, "forecast": predictions}


# ---------------------------------------------------------
# MODEL EVALUATION: Backtesting for Demand Forecasting
# ---------------------------------------------------------
@app.get("/api/ml/forecast-accuracy/{product_id}")
def evaluate_forecast(product_id: str, test_days: int = 10):
    """
    Evaluates the Demand Forecasting model using backtesting.
    Splits data chronologically, trains on the older data, tests on the recent 'test_days',
    and returns MAE and RMSE metrics.
    """
    # 1. Resolve Product ID
    try:
        obj_id = ObjectId(product_id)
    except InvalidId:
        product = db.products.find_one({"name": product_id})
        if not product:
            raise HTTPException(status_code=400, detail=f"Invalid product ID format or product name not found: {product_id}")
        obj_id = product["_id"]
        product_id = str(obj_id)

    # 2. Fetch historical sales
    pipeline = [
        {"$unwind": "$items"},
        {"$match": {"items.productId": obj_id, "status": {"$ne": "returned"}}},
        {"$project": {
            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "quantity": "$items.quantity"
        }}
    ]
    
    sales = list(db.sales.aggregate(pipeline))
    if len(sales) < 30 + test_days:
        raise HTTPException(
            status_code=400, 
            detail=f"Not enough historical data to evaluate. Need at least {30 + test_days} data points."
        )

    # 3. Prepare Time-Series Data
    df = pd.DataFrame(sales)
    df['ds'] = pd.to_datetime(df['date'])
    df.rename(columns={'quantity': 'y'}, inplace=True)
    
    daily_sales = df.groupby('ds')['y'].sum().reset_index()
    daily_sales.set_index('ds', inplace=True)
    daily_sales = daily_sales.asfreq('D', fill_value=0).reset_index()

    # 4. Split Data into Train and Test
    train = daily_sales.iloc[:-test_days]
    actual_test = daily_sales.iloc[-test_days:]

    # 5. Train Model on Training Data
    try:
        model = Prophet(yearly_seasonality='auto', weekly_seasonality=True, daily_seasonality=False)
        model.add_country_holidays(country_name='LK')
        model.fit(train)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")

    # 6. Predict the Test Period
    future = model.make_future_dataframe(periods=test_days)
    forecast = model.predict(future)
    predictions = forecast['yhat'].tail(test_days).apply(lambda x: max(0, x)).values

    # 7. Calculate Metrics
    mae = mean_absolute_error(actual_test['y'], predictions)
    rmse = np.sqrt(mean_squared_error(actual_test['y'], predictions))
    
    comparison = []
    for date, actual, predicted in zip(actual_test['ds'], actual_test['y'], predictions):
        comparison.append({
            "date": date.strftime("%Y-%m-%d"),
            "actualQuantity": actual,
            "predictedQuantity": round(predicted, 2)
        })

    return {
        "productId": product_id,
        "testDays": test_days,
        "metrics": {
            "MAE": round(mae, 2),
            "RMSE": round(rmse, 2)
        },
        "comparison": comparison
    }
# ---------------------------------------------------------
# MODEL 3: Profit Optimization & Expense Prescriptions (Sri Lanka Context)
# ---------------------------------------------------------
@app.get("/api/ml/optimize-profit")
def optimize_profit(
    target_net_profit: float, 
    current_monthly_expenses: float, 
    utility_costs: float = 0.0,
    innovator_brand_percentage: float = 0.0,
    lkr_devaluation_percent: float = 0.0,
    days_to_predict: int = 30
):
    """
    Uses Prophet to forecast store-wide Gross Profit, then prescribes 
    expense reductions and operational strategies using PuLP Integer Optimization.
    """
    # 1. Fetch store-wide sales to calculate historical Gross Profit
    pipeline = [
        {"$unwind": "$items"},
        {"$match": {"status": {"$ne": "returned"}}},
        {"$project": {
            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "gross_profit": {
                "$multiply": [
                    {"$subtract": ["$items.price", "$items.costPrice"]},
                    "$items.quantity"
                ]
            }
        }}
    ]
    
    sales = list(db.sales.aggregate(pipeline))
    if len(sales) < 30:
        raise HTTPException(status_code=400, detail="Not enough historical data to forecast profit.")

    # 2. Prepare Time-Series Data for Prophet
    df = pd.DataFrame(sales)
    df['ds'] = pd.to_datetime(df['date'])
    df.rename(columns={'gross_profit': 'y'}, inplace=True)
    
    daily_profit = df.groupby('ds')['y'].sum().reset_index()
    daily_profit.set_index('ds', inplace=True)
    daily_profit = daily_profit.asfreq('D', fill_value=0).reset_index()

    # 3. Apply Meta's Prophet Model
    try:
        model = Prophet(yearly_seasonality='auto', weekly_seasonality=True, daily_seasonality=False)
        model.add_country_holidays(country_name='LK') # Sri Lankan holidays (Poya, Avurudu)
        model.fit(daily_profit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")

    # 4. Forecast future days
    future = model.make_future_dataframe(periods=days_to_predict)
    forecast = model.predict(future)
    future_forecast = forecast.tail(days_to_predict)
    
    forecasted_gross_profit = float(future_forecast['yhat'].apply(lambda x: max(0, x)).sum())

    # 5. Calculate Gap Analysis
    target_expenses = forecasted_gross_profit - target_net_profit
    expense_reduction_needed = current_monthly_expenses - target_expenses
    
    # 6. Generate AI-Driven Prescriptions (PuLP Optimization Engine)
    suggestions = []
    is_achievable = bool(target_expenses >= 0)

    if not is_achievable:
        suggestions.append("Critical: Target profit exceeds forecasted Gross Profit. Expense cuts alone are insufficient; you must increase sales volume or retail prices.")
    elif expense_reduction_needed > 0:
        
        # Define the pool of potential operational actions. 
        # In a full production system, this list could be fetched dynamically from MongoDB.
        # Savings are estimated as a percentage of current expenses or fixed metrics.
        action_pool = [
            {"id": "inv_rat", "name": "Inventory Rationalization (Drop Fringe Cluster stock)", "savings": 0.05 * current_monthly_expenses, "disruption": 2},
            {"id": "brand_con", "name": "Brand Consolidation (Filter non-BE brands)", "savings": 0.03 * current_monthly_expenses, "disruption": 1},
            {"id": "proc_opt", "name": "Procurement Optimization (Bulk discounts on NCDs)", "savings": 0.08 * current_monthly_expenses, "disruption": 3},
            {"id": "util_mgt", "name": "Utility Management (TOU arbitrage / Off-peak scheduling)", "savings": utility_costs * 0.15 if utility_costs else 0.02 * current_monthly_expenses, "disruption": 2},
            {"id": "staff_ros", "name": "Staff Rostering (Sunday Closure / Pharmacist-Only Shift)", "savings": 0.15 * current_monthly_expenses, "disruption": 8},
            {"id": "green_fin", "name": "Initiate Green Loan for Solar Power System", "savings": utility_costs * 0.40 if utility_costs else 0, "disruption": 5}
        ]

        # Initialize the Problem: We want to MINIMIZE business disruption
        prob = pulp.LpProblem("Pharmacy_Expense_Optimization", pulp.LpMinimize)

        # Define Decision Variables: 1 if we take the action, 0 if we don't
        action_vars = pulp.LpVariable.dicts("Action", [action["id"] for action in action_pool], cat='Binary')

        # Objective Function: Sum of Disruption Scores
        prob += pulp.lpSum([action["disruption"] * action_vars[action["id"]] for action in action_pool]), "Total_Disruption"

        # Constraint 1: The chosen actions MUST save enough money to hit the target
        prob += pulp.lpSum([action["savings"] * action_vars[action["id"]] for action in action_pool]) >= expense_reduction_needed, "Meet_Savings_Target"

        # Constraint 2: Dynamic Business Rule (e.g., Only suggest Green Loan if utility costs are high)
        if utility_costs <= (0.10 * target_net_profit):
            prob += action_vars["green_fin"] == 0, "Disable_Green_Finance_If_Not_Needed"

        # Solve the model (msg=False hides the solver terminal output)
        prob.solve(pulp.PULP_CBC_CMD(msg=False))

        # Parse the mathematical output back into readable suggestions
        if pulp.LpStatus[prob.status] == 'Optimal':
            total_planned_savings = 0
            for action in action_pool:
                if action_vars[action["id"]].varValue == 1.0:
                    suggestions.append(f"{action['name']} (Est. Rs. {round(action['savings'], 2)} savings)")
                    total_planned_savings += action['savings']
            
            suggestions.insert(0, f"Optimal Action Plan: Implement the following combination to reduce expenses by ~Rs. {round(total_planned_savings, 2)} with minimal operational disruption.")
        else:
            suggestions.append(f"Warning: The mathematical optimizer could not find a combination of actions to reach the Rs. {round(expense_reduction_needed, 2)} target. Consider revising your Net Profit target.")

    # 7. Continuous Intelligence Rules (Active Business Alerts)
    active_alerts = []
    
    # Generic Switch Rule
    if expense_reduction_needed > 0 and innovator_brand_percentage > 20.0:
        active_alerts.append({
            "type": "Margin Maximization",
            "message": "Generic Counseling Alert: Current basket contains >20% innovator brands. Prompt pharmacists to offer higher-margin (up to 30%) generic alternatives."
        })
        
    # Forex Risk Mitigation Rule
    if lkr_devaluation_percent > 3.0:
        active_alerts.append({
            "type": "Forex Risk",
            "message": "Stock Preservation Alert: LKR has devalued >3%. Avoid clearance sales or deep discounts on imported stock, as replacement import costs will rise sharply."
        })

    # 8. Format Output
    return {
        "periodDays": days_to_predict,
        "financials": {
            "forecastedGrossProfit": round(forecasted_gross_profit, 2),
            "targetNetProfit": round(target_net_profit, 2),
            "currentExpenses": round(current_monthly_expenses, 2),
            "targetAllowedExpenses": max(0, round(target_expenses, 2)),
            "reductionNeeded": max(0, round(expense_reduction_needed, 2))
        },
        "isAchievable": is_achievable,
        "actionPlan": suggestions,
        "activeAlerts": active_alerts
    }