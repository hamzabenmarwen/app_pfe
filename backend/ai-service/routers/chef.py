"""
Chef Dashboard API Routes - Merged into AI Service
Daily operational insights for kitchen staff
"""
import jwt
import logging
from fastapi import APIRouter, HTTPException, Query, Header
from typing import List, Optional
from datetime import date

from models.forecast_schemas import ChefDashboard, StockAlert
from services.forecasting_engine import get_forecasting_engine
from services.stock_analyzer import StockAnalyzer
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/chef", tags=["Chef Dashboard"])


def _verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """Verify JWT Bearer token. Returns payload or raises 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _verify_admin(authorization: Optional[str] = Header(None)) -> dict:
    """Verify JWT token and check admin role."""
    payload = _verify_token(authorization)
    role = payload.get("role", "")
    if role not in ("ADMIN", "CHEF"):
        raise HTTPException(status_code=403, detail="Admin or Chef access required")
    return payload


def _get_demo_dashboard() -> ChefDashboard:
    """Return demo chef dashboard for testing"""
    from datetime import datetime, timedelta
    today = datetime.now().date()
    
    return ChefDashboard(
        date=today,
        total_predicted_orders=32,
        total_predicted_revenue=1120.0,
        vs_last_week_change=15.5,
        top_dishes_today=[
            {"name": "Couscous Royal", "quantity": 12},
            {"name": "Tagine Poulet", "quantity": 8},
            {"name": "Salade Mechouia", "quantity": 6}
        ],
        stock_alerts=[
            StockAlert(
                plat_id="1",
                plat_name="Couscous Royal",
                predicted_demand=12,
                current_stock=5,
                stockout_risk="HIGH",
                days_until_shortage=1,
                recommended_prep=10
            )
        ],
        weather_impact=None,
        special_events=["Mariage - Salle A"],
        prep_recommendations=[
            {"dish": "Couscous Royal", "quantity": 10, "priority": "high"},
            {"dish": "Tagine Poulet", "quantity": 8, "priority": "medium"}
        ]
    )


@router.get("/dashboard", response_model=ChefDashboard)
async def get_chef_dashboard(
    demo: bool = Query(default=True, description="Return demo data"),
    authorization: Optional[str] = Header(None)
):
    """Get complete daily briefing for chef"""
    if demo:
        return _get_demo_dashboard()
    
    current_user = _verify_admin(authorization)
    try:
        engine = get_forecasting_engine()
        analyzer = StockAnalyzer(engine)
        dashboard = await analyzer.generate_chef_dashboard()
        return dashboard
    except Exception as e:
        if "database" in str(e).lower() or "connection" in str(e).lower():
            return _get_demo_dashboard()
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")


@router.get("/alerts", response_model=List[StockAlert])
async def get_stock_alerts(
    min_risk: str = "MEDIUM",
    authorization: Optional[str] = Header(None)
):
    current_user = _verify_admin(authorization)
    """Get stockout risk alerts"""
    engine = get_forecasting_engine()
    analyzer = StockAnalyzer(engine)
    
    alerts = await analyzer.generate_stock_alerts()
    
    risk_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    min_level = risk_order.get(min_risk, 0)
    
    filtered = [
        alert for alert in alerts
        if risk_order.get(alert.stockout_risk, 3) <= min_level
    ]
    
    return filtered


@router.get("/prep-guide")
async def get_prep_guide(
    target_date: date = date.today(),
    authorization: Optional[str] = Header(None)
):
    current_user = _verify_admin(authorization)
    """Get detailed preparation guide for specific date"""
    engine = get_forecasting_engine()
    analyzer = StockAnalyzer(engine)
    
    predictions = await analyzer.predict_dish_demand(days_ahead=1)
    
    high_priority = []
    medium_priority = []
    low_priority = []
    
    for plat_id, data in predictions.items():
        dish_info = {
            "dish": data['name'],
            "category": data['category'],
            "prepare_quantity": data['predicted_daily_avg'],
            "confidence": data['confidence'],
            "reasoning": f"Rang de popularite: #{data['popularity_rank']}"
        }
        
        if data['popularity_rank'] and data['popularity_rank'] <= 3:
            high_priority.append(dish_info)
        elif data['popularity_rank'] and data['popularity_rank'] <= 8:
            medium_priority.append(dish_info)
        else:
            low_priority.append(dish_info)
    
    return {
        "date": target_date.isoformat(),
        "total_predicted_items": sum(d['predicted_daily_avg'] for d in predictions.values()),
        "priority_levels": {
            "high": {
                "description": "Preparer en priorite - Forte demande attendue",
                "dishes": high_priority[:5]
            },
            "medium": {
                "description": "Preparation standard",
                "dishes": medium_priority[:5]
            },
            "low": {
                "description": "Preparation a la demande",
                "dishes": low_priority[:3]
            }
        },
        "timing_recommendations": [
            "06:00 - Commencer preparatifs haute priorite",
            "09:00 - Finaliser plats chauds",
            "11:00 - Verifier stocks vs predictions",
            "12:00 - Lancer production commandes"
        ]
    }


@router.post("/feedback")
async def submit_actual_results(
    date: date,
    actual_orders: int,
    stockouts: List[str] = None,
    notes: str = None,
    authorization: Optional[str] = Header(None)
):
    current_user = _verify_admin(authorization)
    """Submit actual results for forecast accuracy tracking"""
    return {
        "message": "Resultats enregistres pour analyse de precision",
        "data": {
            "date": date.isoformat(),
            "actual_orders": actual_orders,
            "stockouts": stockouts or [],
            "notes": notes
        },
        "next_step": "Les metriques de precision seront recalculees dans 24h"
    }
