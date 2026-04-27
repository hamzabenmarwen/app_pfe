"""
Kitchen Intelligence Router
Real operational AI for traiteurs: ingredient forecasting, auto POs, profit analysis, anomaly detection.
"""

import logging
import traceback
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import jwt

from config import get_settings
from services.kitchen_intelligence import (
    forecast_ingredient_demand,
    suggest_purchase_orders,
    analyze_dish_profitability,
    detect_order_anomalies,
    get_chef_dashboard_v2,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/kitchen", tags=["Kitchen Intelligence"])


def _verify_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
        if payload.get("role") not in ("ADMIN", "CHEF"):
            raise HTTPException(status_code=403, detail="Admin or Chef access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/dashboard")
async def kitchen_dashboard(authorization: Optional[str] = Header(None)):
    """Complete daily operational briefing for chef/owner."""
    _verify_admin(authorization)
    try:
        data = await get_chef_dashboard_v2()
        return data
    except Exception as e:
        logger.error(f"Kitchen dashboard error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/ingredients/demand")
async def ingredient_demand_forecast(days_ahead: int = 7, authorization: Optional[str] = Header(None)):
    """Predict ingredient demand for upcoming days."""
    _verify_admin(authorization)
    try:
        data = await forecast_ingredient_demand(days_ahead=days_ahead)
        return {"forecast_days": days_ahead, "items": data}
    except Exception as e:
        logger.error(f"Ingredient demand error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase-orders/suggestions")
async def purchase_order_suggestions(authorization: Optional[str] = Header(None)):
    """AI-suggested purchase orders grouped by supplier."""
    _verify_admin(authorization)
    try:
        data = await suggest_purchase_orders()
        return {"suggestions": data}
    except Exception as e:
        logger.error(f"PO suggestions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profitability")
async def dish_profitability(authorization: Optional[str] = Header(None)):
    """Profit margin analysis per dish with volume data."""
    _verify_admin(authorization)
    try:
        data = await analyze_dish_profitability()
        return {"dishes": data}
    except Exception as e:
        logger.error(f"Profitability error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomalies")
async def order_anomalies(days_back: int = 30, authorization: Optional[str] = Header(None)):
    """Detect anomalies in daily order patterns (waste/fraud detection)."""
    _verify_admin(authorization)
    try:
        data = await detect_order_anomalies(days_back=days_back)
        return {"period_days": days_back, "anomalies": data}
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
