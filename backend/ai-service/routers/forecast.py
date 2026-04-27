"""
Forecast API Routes - Merged into AI Service
Provides demand predictions using Prophet
"""
import jwt
import logging
from fastapi import APIRouter, HTTPException, Query, Header
from typing import List, Optional
from datetime import date, datetime
import pandas as pd

from models.forecast_schemas import (
    ForecastResponse, 
    DemandForecast, 
    ForecastPeriod,
    ForecastAccuracy
)
from services.forecasting_engine import get_forecasting_engine, DemandForecastingEngine
from services.stock_analyzer import StockAnalyzer
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/forecast", tags=["Forecasting"])


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


def _get_demo_forecast(days: int) -> ForecastResponse:
    """Return demo forecast data for testing without database"""
    from datetime import datetime, timedelta
    
    forecasts = []
    base_orders = 25
    
    for i in range(days):
        forecast_date = datetime.now().date() + timedelta(days=i)
        # Weekend boost
        is_weekend = forecast_date.weekday() in [4, 5]
        predicted = base_orders + (10 if is_weekend else 0) + (i % 5)
        
        forecasts.append(DemandForecast(
            date=forecast_date,
            predicted_orders=predicted,
            predicted_revenue=predicted * 35.0,
            confidence_lower=int(predicted * 0.8),
            confidence_upper=int(predicted * 1.2),
            by_category={"Plats Principaux": int(predicted * 0.6), "Desserts": int(predicted * 0.4)},
            factors=["Weekend - demande elevee"] if is_weekend else ["Journee standard"]
        ))
    
    return ForecastResponse(
        generated_at=datetime.now(),
        period=ForecastPeriod.DAILY,
        days_ahead=days,
        forecasts=forecasts,
        overall_confidence=85.5,
        key_insights=[
            "📈 Tendance hausse le weekend (+40%)",
            "🎊 Vendredi/Samedi - pics de commandes",
            "📊 Regularite stable en semaine"
        ]
    )


@router.get("/demand", response_model=ForecastResponse)
async def get_demand_forecast(
    days: int = Query(default=7, ge=1, le=30, description="Number of days to forecast"),
    period: ForecastPeriod = Query(default=ForecastPeriod.DAILY),
    category: Optional[str] = Query(default=None, description="Filter by dish category"),
    demo: bool = Query(default=True, description="Return demo data without database"),
    authorization: Optional[str] = Header(None)
):
    """Get demand forecast for specified number of days"""
    # Demo mode - return mock data for testing
    if demo:
        return _get_demo_forecast(days)
    
    # Verify token for non-demo requests
    current_user = _verify_token(authorization)
    
    try:
        engine = get_forecasting_engine()
        forecast_df, model = await engine.generate_forecast(
            days_ahead=days,
            category=category
        )
        
        forecasts = []
        for _, row in forecast_df.iterrows():
            forecast_date = row['ds'].date() if isinstance(row['ds'], datetime) else row['ds']
            
            daily_factors = []
            if forecast_date.weekday() in [4, 5]:
                daily_factors.append("Weekend - demande elevee")
            
            forecasts.append(DemandForecast(
                date=forecast_date,
                predicted_orders=int(row['yhat']),
                predicted_revenue=int(row['yhat']) * 35.0,
                confidence_lower=int(row['yhat_lower']),
                confidence_upper=int(row['yhat_upper']),
                by_category={},
                factors=daily_factors
            ))
        
        all_factors = engine.analyze_factors(forecast_df, model)
        
        avg_interval_width = (
            (forecast_df['yhat_upper'] - forecast_df['yhat_lower']) / forecast_df['yhat']
        ).mean()
        confidence = max(0, min(100, 100 - (avg_interval_width * 50)))
        
        return ForecastResponse(
            generated_at=datetime.now(),
            period=period,
            days_ahead=days,
            forecasts=forecasts,
            overall_confidence=round(confidence, 1),
            key_insights=all_factors
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {str(e)}")


@router.get("/accuracy")
async def get_forecast_accuracy(
    days: int = Query(default=30, ge=7, le=90),
    authorization: Optional[str] = Header(None)
):
    current_user = _verify_token(authorization)
    """Get forecast accuracy metrics (MAPE)"""
    engine = get_forecasting_engine()
    metrics = await engine.calculate_accuracy_metrics(days)
    
    return {
        "metrics": metrics,
        "explanation": {
            "mape": "Mean Absolute Percentage Error - lower is better (<20% is good)",
            "rmse": "Root Mean Square Error - average prediction error magnitude",
            "bias": "Systematic over/under-prediction tendency"
        }
    }


@router.get("/insights/daily")
async def get_daily_insights(
    target_date: Optional[date] = Query(default=None),
    authorization: Optional[str] = Header(None)
):
    current_user = _verify_token(authorization)
    """Get specific insights for a target date"""
    if target_date is None:
        target_date = date.today()
    
    engine = get_forecasting_engine()
    forecast_df, model = await engine.generate_forecast(days_ahead=7)
    
    target_row = forecast_df[forecast_df['ds'].dt.date == target_date]
    
    if len(target_row) == 0:
        raise HTTPException(status_code=404, detail="Date out of forecast range")
    
    row = target_row.iloc[0]
    predicted = int(row['yhat'])
    
    if predicted > 50:
        staffing = "HIGH - All staff required"
    elif predicted > 30:
        staffing = "MEDIUM - Standard staffing"
    else:
        staffing = "LOW - Minimum staffing"
    
    if predicted > 40:
        prep = "Preparation maximale - Lancer les preparatifs tot"
    elif predicted > 20:
        prep = "Preparation standard"
    else:
        prep = "Preparation legere - Surveiller les commandes"
    
    return {
        "date": target_date.isoformat(),
        "predicted_orders": predicted,
        "confidence_interval": {
            "low": int(row['yhat_lower']),
            "high": int(row['yhat_upper'])
        },
        "recommendations": {
            "staffing_level": staffing,
            "prep_level": prep
        },
        "factors": engine.analyze_factors(pd.DataFrame([row]), model)
    }


@router.get("/trends/weekly")
async def get_weekly_trends(
    weeks: int = Query(default=4, ge=1, le=12),
    demo: bool = Query(default=True, description="Return demo data"),
    authorization: Optional[str] = Header(None)
):
    """Get weekly trend analysis"""
    if demo:
        return _get_demo_weekly_trends(weeks)
    
    current_user = _verify_token(authorization)
    
    try:
        engine = get_forecasting_engine()
        forecast_df, model = await engine.generate_forecast(days_ahead=weeks * 7)
        
        forecast_df['weekday'] = forecast_df['ds'].dt.day_name()
        weekday_avg = forecast_df.groupby('weekday')['yhat'].mean().to_dict()
        
        peak_day = max(weekday_avg, key=weekday_avg.get)
        low_day = min(weekday_avg, key=weekday_avg.get)
        
        return {
            "period_weeks": weeks,
            "weekday_patterns": {day: round(avg, 1) for day, avg in weekday_avg.items()},
            "insights": [
                f"{peak_day} est le jour le plus fort ({weekday_avg[peak_day]:.1f} commandes)",
                f"{low_day} est le jour le plus faible ({weekday_avg[low_day]:.1f} commandes)"
            ],
            "chart_data": [{"day": day, "predicted": round(avg, 1)} for day, avg in weekday_avg.items()]
        }
    except Exception:
        return _get_demo_weekly_trends(weeks)


def _get_demo_weekly_trends(weeks: int):
    """Demo weekly trends data"""
    return {
        "period_weeks": weeks,
        "weekday_patterns": {
            "Monday": 22.5, "Tuesday": 24.0, "Wednesday": 26.5,
            "Thursday": 28.0, "Friday": 38.5, "Saturday": 42.0, "Sunday": 25.0
        },
        "insights": [
            "Samedi est le jour le plus fort (42.0 commandes)",
            "Lundi est le jour le plus faible (22.5 commandes)",
            "Ratio week-end/semaine: 1.45"
        ],
        "chart_data": [
            {"day": "Lun", "predicted": 22.5}, {"day": "Mar", "predicted": 24.0},
            {"day": "Mer", "predicted": 26.5}, {"day": "Jeu", "predicted": 28.0},
            {"day": "Ven", "predicted": 38.5}, {"day": "Sam", "predicted": 42.0},
            {"day": "Dim", "predicted": 25.0}
        ]
    }
