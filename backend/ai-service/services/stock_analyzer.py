"""
Stock Analysis and Preparation Recommendations
Predicts stockouts and suggests prep quantities
"""
import asyncpg
import pandas as pd
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional
from config import get_settings
from services.forecasting_engine import DemandForecastingEngine
from models.forecast_schemas import StockAlert, ChefDashboard


class StockAnalyzer:
    """
    Analyzes current inventory against predicted demand
    Generates alerts and preparation recommendations
    """
    
    def __init__(self, forecasting_engine: DemandForecastingEngine):
        self.settings = get_settings()
        self.forecasting_engine = forecasting_engine
    
    async def get_current_stock(self) -> Dict[str, Dict]:
        """Fetch current stock levels from catalog-service"""
        conn = await asyncpg.connect(self.settings.CATALOG_DATABASE_URL)
        
        try:
            # Assuming you have a stock table or field
            # If not, we'll estimate from recent orders
            query = """
                SELECT 
                    p.id,
                    p.name,
                    p.current_stock as stock,
                    p.min_stock_threshold as threshold,
                    c.name as category,
                    p.prep_time_minutes
                FROM plats p
                JOIN categories c ON p.category_id = c.id
                WHERE p.is_available = true
            """
            
            rows = await conn.fetch(query)
            
            stock = {}
            for row in rows:
                stock[row['id']] = {
                    'id': row['id'],
                    'name': row['name'],
                    'current_stock': row['stock'] or 0,
                    'threshold': row['threshold'] or 10,
                    'category': row['category'],
                    'prep_time': row['prep_time_minutes'] or 30
                }
            
            return stock
            
        except Exception as e:
            # If stock columns don't exist yet, return empty
            return {}
        finally:
            await conn.close()
    
    async def predict_dish_demand(
        self,
        days_ahead: int = 3
    ) -> Dict[str, float]:
        """
        Predict demand for individual dishes based on:
        - Historical popularity
        - Seasonality
        - Category trends
        """
        conn = await asyncpg.connect(self.settings.ORDER_DATABASE_URL)
        
        try:
            # Get historical dish popularity (last 90 days)
            start_date = datetime.now() - timedelta(days=90)
            
            query = """
                SELECT 
                    oi.plat_id,
                    p.name,
                    c.name as category,
                    SUM(oi.quantity) as total_ordered,
                    COUNT(DISTINCT o.id) as order_count,
                    AVG(oi.quantity) as avg_per_order
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN plats p ON oi.plat_id = p.id
                JOIN categories c ON p.category_id = c.id
                WHERE o.created_at >= $1
                    AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
                GROUP BY oi.plat_id, p.name, c.name
                ORDER BY total_ordered DESC
            """
            
            rows = await conn.fetch(query, start_date)
            
            # Get overall forecast
            forecast_df, _ = await self.forecasting_engine.generate_forecast(days_ahead)
            total_predicted = forecast_df['yhat'].sum()
            
            # Distribute total prediction by dish popularity
            total_historical = sum(r['total_ordered'] for r in rows)
            
            dish_predictions = {}
            for row in rows:
                share = row['total_ordered'] / total_historical if total_historical > 0 else 0
                predicted_quantity = total_predicted * share
                
                # Add seasonal adjustment (weekends = more plat principal)
                if row['category'] in ['Plat Principal', 'Main Course']:
                    predicted_quantity *= 1.2
                
                dish_predictions[row['plat_id']] = {
                    'name': row['name'],
                    'category': row['category'],
                    'predicted_3day': round(predicted_quantity),
                    'predicted_daily_avg': round(predicted_quantity / 3, 1),
                    'popularity_rank': None,
                    'confidence': 'medium'
                }
            
            # Add ranks
            sorted_dishes = sorted(
                dish_predictions.items(),
                key=lambda x: x[1]['predicted_3day'],
                reverse=True
            )
            for rank, (plat_id, data) in enumerate(sorted_dishes, 1):
                dish_predictions[plat_id]['popularity_rank'] = rank
            
            return dish_predictions
            
        finally:
            await conn.close()
    
    async def generate_stock_alerts(self) -> List[StockAlert]:
        """
        Identify dishes at risk of stockout
        """
        stock = await self.get_current_stock()
        
        if not stock:
            # If no stock tracking, use order-based estimation
            return await self._generate_order_based_alerts()
        
        predictions = await self.predict_dish_demand(days_ahead=3)
        
        alerts = []
        for plat_id, stock_data in stock.items():
            if plat_id not in predictions:
                continue
            
            pred = predictions[plat_id]
            current = stock_data['current_stock']
            predicted_need = pred['predicted_3day']
            
            # Calculate days until shortage
            daily_consumption = pred['predicted_daily_avg']
            if daily_consumption > 0:
                days_until_shortage = current / daily_consumption
            else:
                days_until_shortage = float('inf')
            
            # Determine risk level
            if current < predicted_need and days_until_shortage < 1:
                risk = "HIGH"
            elif current < predicted_need * 1.5 and days_until_shortage < 2:
                risk = "MEDIUM"
            elif current < stock_data['threshold']:
                risk = "LOW"
            else:
                continue  # No alert needed
            
            recommended = max(
                predicted_need - current + stock_data['threshold'],
                stock_data['threshold'] * 2
            )
            
            alerts.append(StockAlert(
                plat_id=plat_id,
                plat_name=stock_data['name'],
                predicted_demand=predicted_need,
                current_stock=current,
                stockout_risk=risk,
                days_until_shortage=round(days_until_shortage) if days_until_shortage < 10 else None,
                recommended_prep=round(recommended)
            ))
        
        # Sort by risk level
        risk_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        alerts.sort(key=lambda x: risk_order.get(x.stockout_risk, 3))
        
        return alerts
    
    async def _generate_order_based_alerts(self) -> List[StockAlert]:
        """Fallback when no stock table exists - based on order velocity"""
        conn = await asyncpg.connect(self.settings.ORDER_DATABASE_URL)
        
        try:
            # Find dishes with increasing order velocity
            query = """
                WITH recent_orders AS (
                    SELECT 
                        oi.plat_id,
                        p.name,
                        COUNT(*) as order_count_last_7d
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    JOIN plats p ON oi.plat_id = p.id
                    WHERE o.created_at >= NOW() - INTERVAL '7 days'
                        AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
                    GROUP BY oi.plat_id, p.name
                ),
                previous_orders AS (
                    SELECT 
                        oi.plat_id,
                        COUNT(*) as order_count_prev_7d
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
                        AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
                    GROUP BY oi.plat_id
                )
                SELECT 
                    r.plat_id,
                    r.name,
                    r.order_count_last_7d,
                    COALESCE(p.order_count_prev_7d, 0) as order_count_prev_7d,
                    CASE 
                        WHEN r.order_count_last_7d > COALESCE(p.order_count_prev_7d, 0) * 1.5 
                        THEN 'HIGH'
                        WHEN r.order_count_last_7d > COALESCE(p.order_count_prev_7d, 0) * 1.2 
                        THEN 'MEDIUM'
                        ELSE 'LOW'
                    END as trend
                FROM recent_orders r
                LEFT JOIN previous_orders p ON r.plat_id = p.plat_id
                WHERE r.order_count_last_7d > 5
                ORDER BY r.order_count_last_7d DESC
            """
            
            rows = await conn.fetch(query)
            
            alerts = []
            for row in rows:
                if row['trend'] == 'HIGH':
                    alerts.append(StockAlert(
                        plat_id=row['plat_id'],
                        plat_name=row['name'],
                        predicted_demand=row['order_count_last_7d'] * 2,  # Extrapolate
                        current_stock=0,  # Unknown
                        stockout_risk="HIGH",
                        days_until_shortage=None,
                        recommended_prep=row['order_count_last_7d']
                    ))
            
            return alerts
            
        finally:
            await conn.close()
    
    async def generate_chef_dashboard(self) -> ChefDashboard:
        """
        Generate daily briefing for chef with:
        - Predicted demand
        - Stock alerts
        - Prep recommendations
        - Special events
        """
        today = date.today()
        
        # Get overall forecast for today
        forecast_df, model = await self.forecasting_engine.generate_forecast(days_ahead=7)
        today_forecast = forecast_df[forecast_df['ds'].dt.date == today]
        
        if len(today_forecast) > 0:
            total_predicted = int(today_forecast['yhat'].iloc[0])
        else:
            total_predicted = 0
        
        # Get last week same day for comparison
        last_week = today - timedelta(days=7)
        
        conn = await asyncpg.connect(self.settings.ORDER_DATABASE_URL)
        try:
            query = """
                SELECT COUNT(*) as count, SUM(total_amount) as revenue
                FROM orders
                WHERE DATE(created_at) = $1
                    AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
            """
            last_week_data = await conn.fetchrow(query, last_week)
            
            if last_week_data and last_week_data['count'] > 0:
                vs_last_week = ((total_predicted - last_week_data['count']) / last_week_data['count']) * 100
            else:
                vs_last_week = 0
            
            # Get top dishes
            top_dishes_query = """
                SELECT 
                    p.name,
                    SUM(oi.quantity) as quantity,
                    p.category_id
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN plats p ON oi.plat_id = p.id
                WHERE o.created_at >= NOW() - INTERVAL '7 days'
                    AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
                GROUP BY p.id, p.name
                ORDER BY quantity DESC
                LIMIT 5
            """
            top_dishes = await conn.fetch(top_dishes_query)
            
        finally:
            await conn.close()
        
        # Get stock alerts
        stock_alerts = await self.generate_stock_alerts()
        
        # Get dish-level predictions for prep recommendations
        dish_predictions = await self.predict_dish_demand(days_ahead=1)
        prep_recommendations = [
            {
                'dish': data['name'],
                'quantity': data['predicted_daily_avg'],
                'priority': 'high' if data['popularity_rank'] <= 3 else 'medium'
            }
            for plat_id, data in sorted(
                dish_predictions.items(),
                key=lambda x: x[1]['popularity_rank'] or 999
            )[:5]
        ]
        
        # Detect special conditions
        special_events = []
        weekday = today.weekday()
        if weekday in [4, 5]:  # Friday, Saturday
            special_events.append("Week-end - Forte affluence attendue")
        
        # Check for holidays (simplified)
        if today.month == 3 and 20 <= today.day <= 22:
            special_events.append("Fête de l'Indépendance")
        
        return ChefDashboard(
            date=today,
            total_predicted_orders=total_predicted,
            total_predicted_revenue=total_predicted * 35,  # Avg order estimate
            vs_last_week_change=vs_last_week,
            top_dishes_today=[{'name': d['name'], 'quantity': d['quantity']} for d in top_dishes],
            stock_alerts=stock_alerts[:5],  # Top 5 alerts
            weather_impact=None,  # Would integrate weather API
            special_events=special_events,
            prep_recommendations=prep_recommendations
        )
