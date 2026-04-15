"""Recommendations router — plat suggestions and event menus."""

import asyncio
import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models.schemas import RecommendationResponse, EventMenuRequest, EventMenuResponse
from services.recommender import get_recommendations, get_event_menu_suggestions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.get("/plats", response_model=RecommendationResponse)
async def recommend_plats(
    userId: Optional[str] = Query(None, description="User ID for personalized recommendations"),
    category: Optional[str] = Query(None, description="Filter by category name"),
    dietary: Optional[str] = Query(None, description="Filter: vegetarian, vegan, halal, gluten_free"),
    limit: int = Query(8, ge=1, le=20, description="Number of recommendations"),
):
    """Get personalized plat recommendations."""
    try:
        results = await asyncio.to_thread(
            get_recommendations,
            user_id=userId,
            category=category,
            dietary=dietary,
            limit=limit,
        )
        return RecommendationResponse(recommendations=results, count=len(results))
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors des recommandations")


@router.post("/event-menu", response_model=EventMenuResponse)
async def suggest_event_menu(req: EventMenuRequest):
    """Suggest a complete menu for an event."""
    try:
        result = await asyncio.to_thread(
            get_event_menu_suggestions,
            event_type=req.eventType,
            guest_count=req.guestCount,
            budget_per_person=req.budgetPerPerson,
        )
        return EventMenuResponse(**result)
    except Exception as e:
        logger.error(f"Event menu error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suggestion de menu")
