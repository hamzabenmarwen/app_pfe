from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import date, datetime
from enum import Enum


class ForecastPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class DemandForecast(BaseModel):
    """Single day/period forecast"""
    date: date
    predicted_orders: int
    predicted_revenue: float
    confidence_lower: int
    confidence_upper: int
    # Breakdown by category
    by_category: Dict[str, int] = Field(default_factory=dict)
    # Key drivers for this prediction
    factors: List[str] = Field(default_factory=list)


class ForecastResponse(BaseModel):
    """Complete forecast response"""
    generated_at: datetime
    period: ForecastPeriod
    days_ahead: int
    forecasts: List[DemandForecast]
    overall_confidence: float  # MAPE-based
    key_insights: List[str]


class ForecastAccuracy(BaseModel):
    """Track how well predictions match reality"""
    metric_date: date
    predicted_orders: int
    actual_orders: int
    absolute_error: int
    percentage_error: float  # MAPE


class StockAlert(BaseModel):
    """Alert when inventory won't cover predicted demand"""
    plat_id: str
    plat_name: str
    predicted_demand: int
    current_stock: int
    stockout_risk: str  # "HIGH", "MEDIUM", "LOW"
    days_until_shortage: Optional[int]
    recommended_prep: int


class ChefDashboard(BaseModel):
    """Daily briefing for chef"""
    date: date
    total_predicted_orders: int
    total_predicted_revenue: float
    vs_last_week_change: float  # percentage
    top_dishes_today: List[Dict]
    stock_alerts: List[StockAlert]
    weather_impact: Optional[str]
    special_events: List[str]
    prep_recommendations: List[Dict]
