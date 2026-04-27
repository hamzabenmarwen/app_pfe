"""
Menu Optimizer Router
Mathematical optimization for event menus using PuLP (MILP).
"""

import logging
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import jwt

from config import get_settings
from models.schemas import OptimizedMenuRequest, OptimizedMenuResponse
from services.menu_optimizer import optimize_event_menu, MenuOptimizerRequest

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/optimizer", tags=["Menu Optimization"])


def _verify_token(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        return jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
    except Exception:
        return None


@router.post("/event-menu", response_model=OptimizedMenuResponse)
async def optimize_event_menu_endpoint(req: OptimizedMenuRequest, authorization: Optional[str] = Header(None)):
    """
    AI-optimized event menu using constraint satisfaction (MILP).
    
    Minimizes cost while satisfying:
    - Budget per person
    - Dietary ratios (vegan%, halal%, gluten-free%)
    - Minimum variety per course
    - Guest count coverage
    - Ingredient overlap minimization (reduces waste)
    """
    user = _verify_token(authorization)
    
    opt_req = MenuOptimizerRequest(
        event_type=req.event_type,
        guest_count=req.guest_count,
        budget_per_person=req.budget_per_person,
        service_type=req.service_type,
        vegetarian_ratio=req.vegetarian_ratio,
        vegan_ratio=req.vegan_ratio,
        halal_ratio=req.halal_ratio,
        gluten_free_ratio=req.gluten_free_ratio,
        min_starters=req.min_starters,
        min_mains=req.min_mains,
        min_desserts=req.min_desserts,
        max_items_per_course=req.max_items_per_course,
    )
    
    try:
        result = optimize_event_menu(opt_req)
        return OptimizedMenuResponse(
            event_type=req.event_type,
            guest_count=req.guest_count,
            budget_per_person=req.budget_per_person,
            starters=result.starters,
            mains=result.mains,
            desserts=result.desserts,
            estimated_price_per_person=result.estimated_price_per_person,
            total_cost=result.total_cost,
            dietary_coverage=result.dietary_coverage,
            nutritional_summary=result.nutritional_summary,
            waste_score=result.waste_score,
            optimization_status=result.optimization_status,
            solver_time_ms=result.solver_time_ms,
            constraint_violations=result.constraint_violations,
        )
    except Exception as e:
        logger.error(f"Menu optimization error: {e}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")
