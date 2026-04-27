"""Recommendations router — plat suggestions and event menus."""

import asyncio
import logging
import jwt
from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional
from models.schemas import RecommendationResponse, EventMenuRequest, EventMenuResponse
from services.recommender import get_recommendations, get_event_menu_suggestions
from services.recommender_eval import evaluate_recommender_offline, explain_recommendation
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


def _extract_user_id_optional(authorization: Optional[str]) -> Optional[str]:
    """Extract userId from a Bearer JWT token. Returns None if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
        return payload.get("userId")
    except Exception:
        return None


def _get_demo_recommendations(limit: int) -> list[dict]:
    """Return demo recommendations when database is unavailable."""
    demo_plats = [
        {"id": "1", "name": "Couscous Royal", "description": "Couscous aux sept légumes et agneau", "price": 35.0, "category": "Plats Principaux", "image": None, "isVegetarian": False, "isVegan": False, "isHalal": True, "isGlutenFree": False, "score": 0.95, "reason": "popular"},
        {"id": "2", "name": "Tagine Poulet", "description": "Tagine de poulet aux olives et citron", "price": 28.0, "category": "Plats Principaux", "image": None, "isVegetarian": False, "isVegan": False, "isHalal": True, "isGlutenFree": False, "score": 0.88, "reason": "popular"},
        {"id": "3", "name": "Salade Mechouia", "description": "Salade de poivrons grillés", "price": 15.0, "category": "Entrées", "image": None, "isVegetarian": True, "isVegan": True, "isHalal": True, "isGlutenFree": True, "score": 0.82, "reason": "popular"},
        {"id": "4", "name": "Baklawa", "description": "Pâtisserie aux noix et miel", "price": 12.0, "category": "Desserts", "image": None, "isVegetarian": True, "isVegan": False, "isHalal": True, "isGlutenFree": False, "score": 0.78, "reason": "popular"},
        {"id": "5", "name": "Chorba Frik", "description": "Soupe traditionnelle au blé concassé", "price": 14.0, "category": "Soupes", "image": None, "isVegetarian": False, "isVegan": False, "isHalal": True, "isGlutenFree": False, "score": 0.75, "reason": "popular"},
        {"id": "6", "name": "Makroud", "description": "Pâtisserie aux dattes et semoule", "price": 10.0, "category": "Desserts", "image": None, "isVegetarian": True, "isVegan": True, "isHalal": True, "isGlutenFree": False, "score": 0.70, "reason": "popular"},
        {"id": "7", "name": "Kammounia", "description": "Ragoût de viande au cumin", "price": 30.0, "category": "Plats Principaux", "image": None, "isVegetarian": False, "isVegan": False, "isHalal": True, "isGlutenFree": True, "score": 0.65, "reason": "popular"},
        {"id": "8", "name": "Fricassé", "description": "Sandwich tunisien frit", "price": 18.0, "category": "Entrées", "image": None, "isVegetarian": False, "isVegan": False, "isHalal": True, "isGlutenFree": False, "score": 0.60, "reason": "popular"},
    ]
    return demo_plats[:limit]


@router.get("/plats", response_model=RecommendationResponse)
async def recommend_plats(
    userId: Optional[str] = Query(None, description="User ID for personalized recommendations"),
    category: Optional[str] = Query(None, description="Filter by category name"),
    dietary: Optional[str] = Query(None, description="Filter: vegetarian, vegan, halal, gluten_free"),
    limit: int = Query(8, ge=1, le=20, description="Number of recommendations"),
    authorization: Optional[str] = Header(None),
):
    """Get personalized plat recommendations. Auth optional; if provided, userId is verified from token."""
    verified_user_id = _extract_user_id_optional(authorization)
    effective_user_id = verified_user_id or userId

    try:
        results = await asyncio.to_thread(
            get_recommendations,
            user_id=effective_user_id,
            category=category,
            dietary=dietary,
            limit=limit,
        )
        return RecommendationResponse(recommendations=results, count=len(results))
    except Exception as e:
        logger.warning(f"Recommendation DB error, using demo data: {e}")
        results = _get_demo_recommendations(limit)
        return RecommendationResponse(recommendations=results, count=len(results))


@router.post("/event-menu", response_model=EventMenuResponse)
async def suggest_event_menu(req: EventMenuRequest, authorization: Optional[str] = Header(None)):
    """Suggest a complete menu for an event. Requires authentication."""
    caller_id = _extract_user_id_optional(authorization)
    if not caller_id:
        raise HTTPException(status_code=401, detail="Authentification requise")

    try:
        result = await asyncio.to_thread(
            get_event_menu_suggestions,
            event_type=req.eventType,
            guest_count=req.guestCount,
            budget_per_person=req.budgetPerPerson,
        )
        return EventMenuResponse(**result)
    except Exception as e:
        logger.warning(f"Event menu DB error, using demo data: {e}")
        return EventMenuResponse(
            eventType=req.eventType,
            guestCount=req.guestCount,
            budgetPerPerson=req.budgetPerPerson,
            starters=[{"id": "1", "name": "Salade Mechouia", "price": 15.0, "description": "Poivrons grillés", "category": "Entrées"}],
            mains=[{"id": "2", "name": "Couscous Royal", "price": 35.0, "description": "Couscous aux sept légumes", "category": "Plats Principaux"}],
            desserts=[{"id": "3", "name": "Baklawa", "price": 12.0, "description": "Pâtisserie aux noix et miel", "category": "Desserts"}],
            estimatedPricePerPerson=62.0,
            totalEstimate=62.0 * req.guestCount,
        )


def _require_admin(authorization: Optional[str]) -> None:
    """Verify admin role from JWT."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentification requise")
    try:
        token = authorization.split(" ")[1]
        decoded = jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
        if decoded.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès administrateur requis")
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide")


@router.get("/evaluate")
async def evaluate_recommender(k: int = Query(5, ge=1, le=20), authorization: Optional[str] = Header(None)):
    """Offline evaluation metrics: Precision@K, MAP@K, Coverage, Diversity."""
    _require_admin(authorization)
    result = evaluate_recommender_offline(k=k)
    return result


@router.get("/explain/{plat_id}")
async def explain_rec(
    plat_id: str,
    userId: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """Explain why a dish was recommended to a user (SHAP-style)."""
    verified_id = _extract_user_id_optional(authorization)
    effective_id = verified_id or userId
    if not effective_id:
        raise HTTPException(status_code=400, detail="User ID required")
    return explain_recommendation(effective_id, plat_id)
