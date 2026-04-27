"""
Kitchen Intelligence System
Provides operational insights for a real traiteur:
  - Ingredient demand forecasting from dish demand
  - Automatic purchase order suggestions
  - Profit margin analysis per dish
  - Anomaly / waste detection on order patterns
"""

import logging
from datetime import datetime, timedelta, date
from typing import Optional
from collections import defaultdict

import numpy as np
import pandas as pd
import asyncpg

try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

from config import get_settings

logger = logging.getLogger(__name__)


# ── Database helpers ──

async def _get_catalog_conn():
    return await asyncpg.connect(get_settings().CATALOG_DATABASE_URL)


async def _get_order_conn():
    return await asyncpg.connect(get_settings().ORDER_DATABASE_URL)


# ── 1. Ingredient Demand Forecasting ──

async def forecast_ingredient_demand(days_ahead: int = 7) -> list[dict]:
    """
    Predict ingredient demand by combining:
      1) Dish-level demand forecast (from historical orders)
      2) Recipe mapping (PlatIngredient quantities)
      3) Event reservations (if any)
    Returns list of {ingredient_id, name, predicted_qty, unit, urgency}.
    """
    catalog_conn = await _get_catalog_conn()
    order_conn = await _get_order_conn()
    try:
        # Fetch recipes: plat_id -> [(ingredient_id, qty_per_plat)]
        recipes = await catalog_conn.fetch("""
            SELECT plat_id, ingredient_id, quantity_per_plat
            FROM plat_ingredients
        """)
        recipe_map: dict[str, list[tuple[str, float]]] = defaultdict(list)
        for r in recipes:
            recipe_map[str(r["plat_id"])].append((str(r["ingredient_id"]), float(r["quantity_per_plat"])))

        # Fetch ingredient metadata
        ing_rows = await catalog_conn.fetch("""
            SELECT id, name, unit, quantity as current_stock,
                   low_stock_threshold, cost_per_unit, supplier_id
            FROM ingredients WHERE is_active = true
        """)
        ingredients: dict[str, dict] = {str(r["id"]): dict(r) for r in ing_rows}

        # Historical dish demand (last 30 days, daily)
        start = datetime.now() - timedelta(days=30)
        hist = await order_conn.fetch("""
            SELECT
                oi.plat_id,
                DATE(o.created_at) as day,
                SUM(oi.quantity) as qty
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= $1
              AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
            GROUP BY oi.plat_id, DATE(o.created_at)
            ORDER BY day DESC
        """, start)

        # Compute average daily demand per dish
        dish_daily: dict[str, float] = defaultdict(float)
        dish_counts: dict[str, int] = defaultdict(int)
        for r in hist:
            dish_daily[str(r["plat_id"])] += int(r["qty"])
            dish_counts[str(r["plat_id"])] += 1

        avg_demand = {}
        for pid, total in dish_daily.items():
            avg_demand[pid] = total / max(dish_counts[pid], 1)

        # Project demand for days_ahead
        predicted = defaultdict(float)
        for pid, daily_avg in avg_demand.items():
            projected = daily_avg * days_ahead
            for ing_id, qty_per_plat in recipe_map.get(pid, []):
                predicted[ing_id] += projected * qty_per_plat

        # Also add event reservations for upcoming events (event DB separate — skip for now)
        # TODO: connect to event-service DB if available
        pass

        # Build result
        results = []
        for ing_id, pred_qty in predicted.items():
            meta = ingredients.get(ing_id)
            if not meta:
                continue
            current = float(meta.get("current_stock") or 0)
            threshold = float(meta.get("low_stock_threshold") or 0)
            needed = max(0, pred_qty - current + threshold)
            urgency = "HIGH" if current < threshold else ("MEDIUM" if current < pred_qty else "LOW")
            results.append({
                "ingredient_id": ing_id,
                "name": meta["name"],
                "unit": meta["unit"],
                "predicted_demand": round(pred_qty, 3),
                "current_stock": round(current, 3),
                "needed_quantity": round(needed, 3),
                "urgency": urgency,
                "cost_estimate": round(needed * float(meta.get("cost_per_unit") or 0), 2) if meta.get("cost_per_unit") else None,
                "supplier_id": meta.get("supplier_id"),
            })

        results.sort(key=lambda x: ("HIGH", "MEDIUM", "LOW").index(x["urgency"]))
        return results
    finally:
        await catalog_conn.close()
        await order_conn.close()


# ── 2. Auto Purchase Order Suggestions ──

async def suggest_purchase_orders() -> list[dict]:
    """
    Group needed ingredients by supplier and suggest POs with:
      - Aggregated quantities
      - Cost estimates
      - Lead-time based priority
    """
    catalog_conn = await _get_catalog_conn()
    try:
        demand = await forecast_ingredient_demand(days_ahead=7)
        needed = [d for d in demand if d["needed_quantity"] > 0 and d.get("supplier_id")]

        if not needed:
            return []

        # Fetch supplier lead times
        supp_ids = list(set(d["supplier_id"] for d in needed if d["supplier_id"]))
        if not supp_ids:
            return []

        rows = await catalog_conn.fetch("""
            SELECT id, name, lead_time_days, payment_terms
            FROM suppliers WHERE id = ANY($1)
        """, supp_ids)
        suppliers = {str(r["id"]): dict(r) for r in rows}

        by_supplier: dict[str, list[dict]] = defaultdict(list)
        for d in needed:
            by_supplier[d["supplier_id"]].append(d)

        pos = []
        for sid, items in by_supplier.items():
            sup = suppliers.get(sid, {})
            total = sum((i["cost_estimate"] or 0) for i in items)
            pos.append({
                "supplier_id": sid,
                "supplier_name": sup.get("name", "Inconnu"),
                "lead_time_days": sup.get("lead_time_days", 3),
                "priority": "HIGH" if sup.get("lead_time_days", 3) <= 1 else "NORMAL",
                "items": items,
                "total_cost_estimate": round(total, 2),
                "suggested_order_date": (date.today() + timedelta(days=max(0, 7 - sup.get("lead_time_days", 3)))).isoformat(),
            })

        pos.sort(key=lambda x: ("HIGH", "NORMAL").index(x["priority"]))
        return pos
    finally:
        await catalog_conn.close()


# ── 3. Profit Margin Analysis ──

async def analyze_dish_profitability() -> list[dict]:
    """
    For each active dish, compute:
      - Cost of ingredients (from recipe * cost_per_unit)
      - Revenue (price)
      - Profit margin %
      - Volume sold (last 30 days)
      - Profit contribution ranking
    """
    catalog_conn = await _get_catalog_conn()
    order_conn = await _get_order_conn()
    try:
        # Recipe costs
        rows = await catalog_conn.fetch("""
            SELECT
                p.id,
                p.name,
                p.price,
                p.category_id,
                p.preparation_time,
                COALESCE(SUM(pi.quantity_per_plat * i.cost_per_unit), 0) as ingredient_cost
            FROM plats p
            LEFT JOIN plat_ingredients pi ON pi.plat_id = p.id
            LEFT JOIN ingredients i ON i.id = pi.ingredient_id
            WHERE p.is_available = true
            GROUP BY p.id, p.name, p.price, p.category_id, p.preparation_time
        """)

        # Volume sold last 30 days
        start = datetime.now() - timedelta(days=30)
        vol_rows = await order_conn.fetch("""
            SELECT oi.plat_id, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= $1 AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
            GROUP BY oi.plat_id
        """, start)
        volume_map = {str(r["plat_id"]): {"qty": int(r["total_qty"]), "revenue": float(r["revenue"])} for r in vol_rows}

        results = []
        for r in rows:
            price = float(r["price"]) if r["price"] else 0
            cost = float(r["ingredient_cost"]) if r["ingredient_cost"] else 0
            # Assume labor cost proportional to prep time (simplified)
            labor = (float(r["preparation_time"]) or 30) * 0.5  # 0.5 DT per minute rough estimate
            total_cost = cost + labor
            margin = price - total_cost
            margin_pct = (margin / price * 100) if price > 0 else 0
            vol = volume_map.get(str(r["id"]), {"qty": 0, "revenue": 0})
            results.append({
                "plat_id": str(r["id"]),
                "name": r["name"],
                "price": round(price, 2),
                "ingredient_cost": round(cost, 2),
                "labor_cost_estimate": round(labor, 2),
                "total_cost_estimate": round(total_cost, 2),
                "margin": round(margin, 2),
                "margin_percent": round(margin_pct, 1),
                "volume_30d": vol["qty"],
                "revenue_30d": round(vol["revenue"], 2),
                "profit_contribution_30d": round(vol["qty"] * margin, 2),
                "category_id": str(r["category_id"]) if r["category_id"] else None,
            })

        results.sort(key=lambda x: x["profit_contribution_30d"], reverse=True)
        return results
    finally:
        await catalog_conn.close()
        await order_conn.close()


# ── 4. Anomaly / Waste Detection ──

async def detect_order_anomalies(days_back: int = 30) -> list[dict]:
    """
    Detect anomalies in daily order patterns using Z-score or IQR.
    Flags potential waste events (unexpected drop) or fraud (unexpected spike).
    """
    order_conn = await _get_order_conn()
    try:
        start = datetime.now() - timedelta(days=days_back + 30)
        rows = await order_conn.fetch("""
            SELECT
                DATE(created_at) as day,
                COUNT(*) as order_count,
                SUM(total_amount) as revenue,
                AVG(total_amount) as avg_order_value
            FROM orders
            WHERE created_at >= $1
              AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
            GROUP BY DATE(created_at)
            ORDER BY day
        """, start)

        if len(rows) < 7:
            return []

        df = pd.DataFrame(rows, columns=["day", "order_count", "revenue", "avg_order_value"])
        df["day"] = pd.to_datetime(df["day"])
        df = df.sort_values("day")

        # Compute rolling median and IQR
        window = 7
        for col in ["order_count", "revenue", "avg_order_value"]:
            df[f"{col}_median"] = df[col].rolling(window=window, min_periods=3, center=False).median()
            df[f"{col}_q75"] = df[col].rolling(window=window, min_periods=3, center=False).quantile(0.75)
            df[f"{col}_q25"] = df[col].rolling(window=window, min_periods=3, center=False).quantile(0.25)
            df[f"{col}_iqr"] = df[f"{col}_q75"] - df[f"{col}_q25"]
            df[f"{col}_anomaly"] = np.abs(df[col] - df[f"{col}_median"]) > 1.5 * df[f"{col}_iqr"]

        anomalies = []
        for _, row in df.iterrows():
            reasons = []
            if row.get("order_count_anomaly") and pd.notna(row.get("order_count_anomaly")):
                if row["order_count"] > row["order_count_median"]:
                    reasons.append("Unusual spike in order count")
                else:
                    reasons.append("Unusual drop in order count (possible waste risk)")
            if row.get("revenue_anomaly") and pd.notna(row.get("revenue_anomaly")):
                if row["revenue"] > row["revenue_median"]:
                    reasons.append("Revenue spike detected")
                else:
                    reasons.append("Revenue drop detected")
            if row.get("avg_order_value_anomaly") and pd.notna(row.get("avg_order_value_anomaly")):
                reasons.append("Average order value anomaly")

            if reasons:
                anomalies.append({
                    "date": row["day"].strftime("%Y-%m-%d"),
                    "order_count": int(row["order_count"]),
                    "revenue": round(float(row["revenue"]), 2),
                    "avg_order_value": round(float(row["avg_order_value"]), 2),
                    "expected_order_count": round(float(row["order_count_median"]), 1) if pd.notna(row["order_count_median"]) else None,
                    "expected_revenue": round(float(row["revenue_median"]), 2) if pd.notna(row["revenue_median"]) else None,
                    "severity": "HIGH" if len(reasons) >= 2 else "MEDIUM",
                    "reasons": reasons,
                })

        return anomalies[-7:]  # return last 7 flagged days
    finally:
        await order_conn.close()


# ── 5. Consolidated Chef Dashboard v2 ──

async def get_chef_dashboard_v2() -> dict:
    """
    Real operational dashboard with no demo data.
    Returns everything needed for a traiteur's morning briefing.
    """
    today = date.today()
    order_conn = await _get_order_conn()
    try:
        # Today's predicted orders (simple heuristic: same weekday last 4 weeks average)
        four_weeks_ago = today - timedelta(weeks=4)
        rows = await order_conn.fetch("""
            SELECT DATE(created_at) as day, COUNT(*) as cnt
            FROM orders
            WHERE created_at >= $1
              AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
              AND EXTRACT(DOW FROM created_at) = EXTRACT(DOW FROM $2::date)
            GROUP BY DATE(created_at)
        """, four_weeks_ago, today)

        predicted_today = round(np.mean([int(r["cnt"]) for r in rows])) if rows else 10

        # Actual so far today
        today_actual = await order_conn.fetchval("""
            SELECT COUNT(*) FROM orders
            WHERE DATE(created_at) = CURRENT_DATE
              AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
        """)

        # Top dishes last 7 days
        top_dishes = await order_conn.fetch("""
            SELECT oi.plat_name as name, SUM(oi.quantity) as qty
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= NOW() - INTERVAL '7 days'
              AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED')
            GROUP BY oi.plat_name
            ORDER BY qty DESC
            LIMIT 5
        """)

        # Ingredient alerts
        ing_demand = await forecast_ingredient_demand(days_ahead=1)
        high_urgency = [i for i in ing_demand if i["urgency"] == "HIGH"][:5]

        # Profit insights
        profitability = await analyze_dish_profitability()
        top_margin = [p for p in profitability if p["margin_percent"] > 30][:3]
        low_margin = [p for p in profitability if p["margin_percent"] < 10 and p["volume_30d"] > 5][:3]

        # Anomalies
        anomalies = await detect_order_anomalies(days_back=14)

        return {
            "date": today.isoformat(),
            "predicted_orders_today": predicted_today,
            "actual_orders_today": today_actual or 0,
            "variance_percent": round(((today_actual or 0) - predicted_today) / predicted_today * 100, 1) if predicted_today else 0,
            "top_dishes_last_7d": [{"name": r["name"], "quantity": int(r["qty"])} for r in top_dishes],
            "ingredient_alerts": high_urgency,
            "purchase_order_suggestions": await suggest_purchase_orders(),
            "profitability_insights": {
                "top_margin_dishes": top_margin,
                "low_margin_high_volume": low_margin,
            },
            "anomalies": anomalies,
        }
    finally:
        await order_conn.close()
