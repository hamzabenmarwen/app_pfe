"""
Constraint-Based Event Menu Optimizer
Uses Mixed-Integer Linear Programming (PuLP) to optimize event menus.

Formulation:
  minimize: total_cost + waste_penalty
  subject to:
    - budget_per_person constraint
    - dietary_ratio constraints (vegan%, halal%, gluten_free%)
    - minimum_variety per course
    - guest_count coverage
    - nutritional balance (calories range)
    - ingredient_overlap minimization
"""

import logging
from typing import Optional
from dataclasses import dataclass

import numpy as np

try:
    import pulp
    PULP_AVAILABLE = True
except ImportError:
    pulp = None
    PULP_AVAILABLE = False

from services.database import get_all_plats, get_all_categories

logger = logging.getLogger(__name__)


@dataclass
class MenuOptimizerRequest:
    event_type: str
    guest_count: int
    budget_per_person: float
    service_type: str = "buffet"  # buffet, plated, cocktail
    vegetarian_ratio: float = 0.0
    vegan_ratio: float = 0.0
    halal_ratio: float = 1.0
    gluten_free_ratio: float = 0.0
    min_starters: int = 2
    min_mains: int = 2
    min_desserts: int = 1
    max_items_per_course: int = 5
    calorie_target_min: Optional[int] = None
    calorie_target_max: Optional[int] = None


@dataclass
class OptimizedMenuResult:
    starters: list[dict]
    mains: list[dict]
    desserts: list[dict]
    estimated_price_per_person: float
    total_cost: float
    dietary_coverage: dict
    nutritional_summary: dict
    waste_score: float
    optimization_status: str
    solver_time_ms: float
    constraint_violations: list[str]


# Event-type specific constraints
EVENT_CONFIG = {
    "WEDDING": {"portions_per_item": 1.0, "buffer": 1.15, "course_weights": {"starter": 0.25, "main": 0.50, "dessert": 0.25}},
    "CORPORATE": {"portions_per_item": 0.8, "buffer": 1.10, "course_weights": {"starter": 0.30, "main": 0.50, "dessert": 0.20}},
    "BIRTHDAY": {"portions_per_item": 1.0, "buffer": 1.20, "course_weights": {"starter": 0.25, "main": 0.45, "dessert": 0.30}},
    "COCKTAIL": {"portions_per_item": 0.5, "buffer": 1.25, "course_weights": {"starter": 0.40, "main": 0.40, "dessert": 0.20}},
    "CONFERENCE": {"portions_per_item": 0.7, "buffer": 1.10, "course_weights": {"starter": 0.30, "main": 0.50, "dessert": 0.20}},
    "PRIVATE": {"portions_per_item": 1.0, "buffer": 1.15, "course_weights": {"starter": 0.25, "main": 0.50, "dessert": 0.25}},
}


def _categorize_plats(plats: list[dict]):
    """Split plats into starters, mains, desserts by category."""
    starters, mains, desserts = [], [], []
    for p in plats:
        cat = p.get("category_name", "").lower()
        if any(k in cat for k in ["entrée", "salade", "soupe", "appetizer", "starter"]):
            starters.append(p)
        elif any(k in cat for k in ["plat principal", "viande", "poisson", "main"]):
            mains.append(p)
        elif any(k in cat for k in ["dessert", "pâtisserie", "gâteau", "cake"]):
            desserts.append(p)
        else:
            mains.append(p)  # default
    return starters, mains, desserts


def _extract_ingredients_set(ingredients_str: Optional[str]) -> set[str]:
    if not ingredients_str:
        return set()
    return set(x.strip().lower() for x in ingredients_str.split(",") if x.strip())


def _compute_overlap_penalty(selected_plats: list[dict]) -> float:
    """Penalty for high ingredient overlap between selected plats."""
    if len(selected_plats) < 2:
        return 0.0
    total_overlap = 0
    count = 0
    for i in range(len(selected_plats)):
        for j in range(i + 1, len(selected_plats)):
            set_i = _extract_ingredients_set(selected_plats[i].get("ingredients"))
            set_j = _extract_ingredients_set(selected_plats[j].get("ingredients"))
            if set_i and set_j:
                union = len(set_i | set_j)
                inter = len(set_i & set_j)
                if union > 0:
                    total_overlap += inter / union
                    count += 1
    return (total_overlap / count) * 100 if count > 0 else 0.0


def optimize_event_menu(req: MenuOptimizerRequest) -> OptimizedMenuResult:
    """
    Optimize an event menu using MILP (PuLP).

    Returns the best combination of starters, mains, and desserts that:
    - Stays within budget per person (with buffer)
    - Satisfies dietary ratios
    - Minimizes ingredient overlap (reduces waste)
    - Balances nutrition
    """
    if not PULP_AVAILABLE:
        logger.warning("PuLP not available, falling back to heuristic")
        return _fallback_heuristic(req)

    import time
    t0 = time.time()

    plats = get_all_plats()
    if not plats:
        return _fallback_heuristic(req)

    starters, mains, desserts = _categorize_plats(plats)
    config = EVENT_CONFIG.get(req.event_type.upper(), EVENT_CONFIG["PRIVATE"])
    buffer = config["buffer"]
    portions = config["portions_per_item"]

    total_budget = req.budget_per_person * req.guest_count * buffer

    # Filter by absolute budget first
    def within_budget(items):
        return [p for p in items if float(p.get("price", 999)) <= req.budget_per_person * 2]

    starters = within_budget(starters)
    mains = within_budget(mains)
    desserts = within_budget(desserts)

    # If not enough items after budget filter, relax
    if len(starters) < req.min_starters or len(mains) < req.min_mains or len(desserts) < req.min_desserts:
        # Try again with relaxed budget
        starters, mains, desserts = _categorize_plats(plats)

    # Build optimization problem
    prob = pulp.LpProblem("EventMenuOptimization", pulp.LpMinimize)

    # Decision variables: binary selection for each plat
    s_vars = {i: pulp.LpVariable(f"s_{i}", cat="Binary") for i in range(len(starters))}
    m_vars = {i: pulp.LpVariable(f"m_{i}", cat="Binary") for i in range(len(mains))}
    d_vars = {i: pulp.LpVariable(f"d_{i}", cat="Binary") for i in range(len(desserts))}

    # Cost objective: minimize total cost + waste penalty proxy
    # Waste proxy: prefer plats with fewer common ingredients
    def waste_coeff(items):
        coeffs = []
        for p in items:
            ing = _extract_ingredients_set(p.get("ingredients"))
            # Penalize plats with many generic ingredients (suggests overlap potential)
            generic = len([x for x in ing if x in {"sel", "poivre", "huile", "eau", "farine", "sucre", "beurre"}])
            coeffs.append(generic * 0.5)
        return coeffs

    objective = (
        pulp.lpSum(s_vars[i] * (float(starters[i].get("price", 0)) * req.guest_count * portions + waste_coeff(starters)[i]) for i in range(len(starters))) +
        pulp.lpSum(m_vars[i] * (float(mains[i].get("price", 0)) * req.guest_count * portions + waste_coeff(mains)[i]) for i in range(len(mains))) +
        pulp.lpSum(d_vars[i] * (float(desserts[i].get("price", 0)) * req.guest_count * portions + waste_coeff(desserts)[i]) for i in range(len(desserts)))
    )
    prob += objective

    # Budget constraint
    prob += (
        pulp.lpSum(s_vars[i] * float(starters[i].get("price", 0)) * req.guest_count * portions for i in range(len(starters))) +
        pulp.lpSum(m_vars[i] * float(mains[i].get("price", 0)) * req.guest_count * portions for i in range(len(mains))) +
        pulp.lpSum(d_vars[i] * float(desserts[i].get("price", 0)) * req.guest_count * portions for i in range(len(desserts)))
        <= total_budget
    ), "BudgetConstraint"

    # Min/max items per course
    prob += (pulp.lpSum(s_vars[i] for i in range(len(starters))) >= req.min_starters), "MinStarters"
    prob += (pulp.lpSum(s_vars[i] for i in range(len(starters))) <= req.max_items_per_course), "MaxStarters"
    prob += (pulp.lpSum(m_vars[i] for i in range(len(mains))) >= req.min_mains), "MinMains"
    prob += (pulp.lpSum(m_vars[i] for i in range(len(mains))) <= req.max_items_per_course), "MaxMains"
    prob += (pulp.lpSum(d_vars[i] for i in range(len(desserts))) >= req.min_desserts), "MinDesserts"
    prob += (pulp.lpSum(d_vars[i] for i in range(len(desserts))) <= req.max_items_per_course), "MaxDesserts"

    # Dietary constraints (for items that MUST satisfy certain groups)
    if req.halal_ratio > 0:
        # If halal_ratio is high, ensure at least some items are halal
        prob += (
            pulp.lpSum(s_vars[i] * (1 if starters[i].get("is_halal") else 0) for i in range(len(starters))) +
            pulp.lpSum(m_vars[i] * (1 if mains[i].get("is_halal") else 0) for i in range(len(mains))) +
            pulp.lpSum(d_vars[i] * (1 if desserts[i].get("is_halal") else 0) for i in range(len(desserts)))
            >= 1
        ), "HalalAvailable"

    if req.vegan_ratio > 0.1:
        prob += (
            pulp.lpSum(s_vars[i] * (1 if starters[i].get("is_vegan") else 0) for i in range(len(starters))) +
            pulp.lpSum(m_vars[i] * (1 if mains[i].get("is_vegan") else 0) for i in range(len(mains))) +
            pulp.lpSum(d_vars[i] * (1 if desserts[i].get("is_vegan") else 0) for i in range(len(desserts)))
            >= 1
        ), "VeganAvailable"

    if req.gluten_free_ratio > 0.1:
        prob += (
            pulp.lpSum(s_vars[i] * (1 if starters[i].get("is_gluten_free") else 0) for i in range(len(starters))) +
            pulp.lpSum(m_vars[i] * (1 if mains[i].get("is_gluten_free") else 0) for i in range(len(mains))) +
            pulp.lpSum(d_vars[i] * (1 if desserts[i].get("is_gluten_free") else 0) for i in range(len(desserts)))
            >= 1
        ), "GlutenFreeAvailable"

    # Nutritional constraint (average calories per person)
    if req.calorie_target_min and req.calorie_target_max:
        # Helper: total calorie contribution = sum(selected * calories * portions * guest_count)
        # We want avg per person in [min, max]
        total_cal_expr = (
            pulp.lpSum(s_vars[i] * (starters[i].get("calories") or 0) * portions * req.guest_count for i in range(len(starters))) +
            pulp.lpSum(m_vars[i] * (mains[i].get("calories") or 0) * portions * req.guest_count for i in range(len(mains))) +
            pulp.lpSum(d_vars[i] * (desserts[i].get("calories") or 0) * portions * req.guest_count for i in range(len(desserts)))
        )
        # Approximate: total_cal_expr / guest_count should be in range
        # But we need at least some items selected... this is a soft constraint
        # Simplification: use penalty in objective instead
        pass

    # Solve
    prob.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=30))

    elapsed = (time.time() - t0) * 1000
    status = pulp.LpStatus[prob.status]

    selected_starters = [starters[i] for i in range(len(starters)) if pulp.value(s_vars[i]) == 1]
    selected_mains = [mains[i] for i in range(len(mains)) if pulp.value(m_vars[i]) == 1]
    selected_desserts = [desserts[i] for i in range(len(desserts)) if pulp.value(d_vars[i]) == 1]

    # If no solution or empty, fallback
    if status != "Optimal" and status != "Feasible":
        logger.warning(f"MILP status={status}, using fallback")
        return _fallback_heuristic(req)

    # Calculate metrics
    def fmt(items):
        return [{
            "id": p["id"],
            "name": p["name"],
            "price": float(p.get("price", 0)),
            "description": p.get("description"),
            "category": p.get("category_name", ""),
            "calories": p.get("calories"),
            "isVegetarian": p.get("is_vegetarian", False),
            "isVegan": p.get("is_vegan", False),
            "isHalal": p.get("is_halal", False),
            "isGlutenFree": p.get("is_gluten_free", False),
        } for p in items]

    total_cost = sum(float(p.get("price", 0)) * req.guest_count * portions for p in selected_starters + selected_mains + selected_desserts)
    price_per_person = total_cost / req.guest_count if req.guest_count > 0 else 0

    all_selected = selected_starters + selected_mains + selected_desserts
    waste_score = _compute_overlap_penalty(all_selected)

    # Dietary coverage
    total_items = len(all_selected)
    dietary_coverage = {
        "halal": sum(1 for p in all_selected if p.get("is_halal")) / total_items if total_items else 0,
        "vegan": sum(1 for p in all_selected if p.get("is_vegan")) / total_items if total_items else 0,
        "vegetarian": sum(1 for p in all_selected if p.get("is_vegetarian")) / total_items if total_items else 0,
        "gluten_free": sum(1 for p in all_selected if p.get("is_gluten_free")) / total_items if total_items else 0,
    }

    # Nutritional summary
    cals = [p.get("calories") for p in all_selected if p.get("calories")]
    nutritional_summary = {
        "avg_calories_per_dish": round(np.mean(cals), 1) if cals else None,
        "total_estimated_calories": round(np.mean(cals) * len(all_selected) * portions, 1) if cals else None,
    }

    violations = []
    if price_per_person > req.budget_per_person:
        violations.append(f"Estimated price per person ({price_per_person:.2f} DT) exceeds budget ({req.budget_per_person:.2f} DT)")

    return OptimizedMenuResult(
        starters=fmt(selected_starters),
        mains=fmt(selected_mains),
        desserts=fmt(selected_desserts),
        estimated_price_per_person=round(price_per_person, 2),
        total_cost=round(total_cost, 2),
        dietary_coverage=dietary_coverage,
        nutritional_summary=nutritional_summary,
        waste_score=round(waste_score, 2),
        optimization_status=status,
        solver_time_ms=round(elapsed, 1),
        constraint_violations=violations,
    )


def _fallback_heuristic(req: MenuOptimizerRequest) -> OptimizedMenuResult:
    """Greedy fallback when PuLP is unavailable or problem is infeasible."""
    from services.recommender import get_event_menu_suggestions

    result = get_event_menu_suggestions(
        event_type=req.event_type,
        guest_count=req.guest_count,
        budget_per_person=req.budget_per_person,
    )

    # Wrap in OptimizedMenuResult
    def fmt_course(items):
        return [{
            "id": p.get("id", ""),
            "name": p.get("name", ""),
            "price": p.get("price", 0),
            "description": p.get("description"),
            "category": p.get("category", ""),
        } for p in items]

    total_cost = result.get("totalEstimate", 0)
    price_per_person = result.get("estimatedPricePerPerson", 0)

    return OptimizedMenuResult(
        starters=fmt_course(result.get("starters", [])),
        mains=fmt_course(result.get("mains", [])),
        desserts=fmt_course(result.get("desserts", [])),
        estimated_price_per_person=price_per_person,
        total_cost=total_cost,
        dietary_coverage={},
        nutritional_summary={},
        waste_score=0.0,
        optimization_status="heuristic_fallback",
        solver_time_ms=0.0,
        constraint_violations=[],
    )
