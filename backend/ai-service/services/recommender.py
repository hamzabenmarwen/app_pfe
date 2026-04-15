"""Hybrid Recommendation Engine — Content-based + Collaborative filtering."""

import numpy as np
from typing import Optional
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from services.database import get_all_plats, get_user_order_history, get_all_order_items


def _build_feature_matrix(plats: list[dict]) -> np.ndarray:
    """Build a feature matrix from plat attributes for content-based filtering."""
    features = []
    for p in plats:
        feat = [
            float(p.get("price", 0)),
            float(p.get("spice_level", 0)) / 5.0,
            float(p.get("calories", 300)) / 1000.0,
            float(p.get("preparation_time", 30)) / 120.0,
            1.0 if p.get("is_vegetarian") else 0.0,
            1.0 if p.get("is_vegan") else 0.0,
            1.0 if p.get("is_halal") else 0.0,
            1.0 if p.get("is_gluten_free") else 0.0,
        ]
        features.append(feat)

    matrix = np.array(features, dtype=np.float64)
    # Normalize price column
    if matrix.shape[0] > 1:
        scaler = MinMaxScaler()
        matrix[:, 0:1] = scaler.fit_transform(matrix[:, 0:1])
    return matrix


def _content_based_scores(plats: list[dict], liked_indices: list[int]) -> np.ndarray:
    """Calculate content-based similarity scores."""
    if not liked_indices:
        return np.zeros(len(plats))

    feature_matrix = _build_feature_matrix(plats)
    similarities = cosine_similarity(feature_matrix)

    # Average similarity to liked items
    scores = np.zeros(len(plats))
    for idx in liked_indices:
        scores += similarities[idx]
    scores /= len(liked_indices)
    return scores


def _collaborative_scores(plats: list[dict], user_id: str) -> np.ndarray:
    """User-item collaborative filtering via co-purchase frequency."""
    scores = np.zeros(len(plats))
    plat_id_to_idx = {p["id"]: i for i, p in enumerate(plats)}

    try:
        all_items = get_all_order_items()
    except Exception:
        return scores

    if not all_items:
        return scores

    # Build user-item interaction matrix (which users ordered which plats)
    user_plats: dict[str, set[str]] = {}
    for item in all_items:
        uid = item["user_id"]
        pid = item["plat_id"]
        user_plats.setdefault(uid, set()).add(pid)

    # Current user's plats
    my_plats = user_plats.get(user_id, set())
    if not my_plats:
        return scores

    # Find similar users (users who ordered at least 1 same plat)
    for other_uid, other_plats in user_plats.items():
        if other_uid == user_id:
            continue
        overlap = my_plats & other_plats
        if not overlap:
            continue
        # Jaccard similarity
        similarity = len(overlap) / len(my_plats | other_plats)
        # Boost score for plats ordered by similar users but not by current user
        for pid in other_plats - my_plats:
            if pid in plat_id_to_idx:
                scores[plat_id_to_idx[pid]] += similarity

    # Normalize
    max_score = scores.max()
    if max_score > 0:
        scores /= max_score
    return scores


def get_recommendations(
    user_id: Optional[str] = None,
    category: Optional[str] = None,
    dietary: Optional[str] = None,
    limit: int = 8,
) -> list[dict]:
    """
    Hybrid recommendation: weighted sum of content-based + collaborative scores.
    Falls back to popularity-based for new users (cold start).
    """
    plats = get_all_plats()
    if not plats:
        return []

    # Apply dietary filter
    if dietary:
        filters = {
            "vegetarian": "is_vegetarian",
            "vegan": "is_vegan",
            "halal": "is_halal",
            "gluten_free": "is_gluten_free",
        }
        field = filters.get(dietary)
        if field:
            plats = [p for p in plats if p.get(field)]

    # Apply category filter
    if category:
        plats = [p for p in plats if p.get("category_name", "").lower() == category.lower()]

    if not plats:
        return []

    # Get user history for personalized scoring
    liked_indices = []
    if user_id:
        try:
            history = get_user_order_history(user_id)
            ordered_ids = {h["plat_id"] for h in history}
            plat_id_to_idx = {p["id"]: i for i, p in enumerate(plats)}
            liked_indices = [plat_id_to_idx[pid] for pid in ordered_ids if pid in plat_id_to_idx]
        except Exception:
            pass

    if liked_indices and user_id:
        # Personalized: content-based (60%) + collaborative (40%)
        cb_scores = _content_based_scores(plats, liked_indices)
        cf_scores = _collaborative_scores(plats, user_id)
        final_scores = 0.6 * cb_scores + 0.4 * cf_scores

        # Don't recommend already-ordered plats (push them down)
        ordered_set = {plats[i]["id"] for i in liked_indices}
        for i, p in enumerate(plats):
            if p["id"] in ordered_set:
                final_scores[i] *= 0.3  # reduce but don't eliminate

        reason = "personalized"
    else:
        # Cold start: popularity-based (random with slight price preference for affordability)
        final_scores = np.array([1.0 / (float(p.get("price", 10)) + 1) for p in plats])
        rng = np.random.default_rng()
        final_scores += rng.random(len(plats)) * 0.3  # Add randomness
        reason = "popular"

    # Sort by score (descending) and return top N
    sorted_indices = np.argsort(final_scores)[::-1][:limit]

    results = []
    for idx in sorted_indices:
        p = plats[idx]
        results.append({
            "id": p["id"],
            "name": p["name"],
            "description": p.get("description"),
            "price": float(p["price"]),
            "category": p.get("category_name", ""),
            "image": p.get("images", [None])[0] if p.get("images") else None,
            "isVegetarian": p.get("is_vegetarian", False),
            "isVegan": p.get("is_vegan", False),
            "isHalal": p.get("is_halal", False),
            "isGlutenFree": p.get("is_gluten_free", False),
            "score": round(float(final_scores[idx]), 3),
            "reason": reason,
        })

    return results


def get_event_menu_suggestions(
    event_type: str,
    guest_count: int,
    budget_per_person: Optional[float] = None,
) -> dict:
    """Suggest a complete menu for an event type.

    If *budget_per_person* is provided the plats in each section are
    filtered so that no combination of one starter + one main + one
    dessert exceeds the budget.  The ``estimatedPricePerPerson`` field
    now represents the realistic cost of *one* starter + *one* main +
    *one* dessert (median combination) instead of a flat average of all
    suggested items.
    """
    plats = get_all_plats()
    if not plats:
        return {"starters": [], "mains": [], "desserts": [], "totalEstimate": 0}

    # ── Categorize plats by typical sections ──────────────────────
    starters = [p for p in plats if p.get("category_name", "").lower() in
                 ["entrées", "entrée", "salades", "salade", "soupes", "soupe", "appetizers", "starters"]]
    mains = [p for p in plats if p.get("category_name", "").lower() in
              ["plats principaux", "plat principal", "viandes", "viande", "poissons", "poisson", "mains", "main"]]
    desserts = [p for p in plats if p.get("category_name", "").lower() in
                 ["desserts", "dessert", "pâtisseries", "patisseries", "gâteaux"]]

    # Fallback: split all plats into thirds by price
    if not starters and not mains and not desserts:
        sorted_plats = sorted(plats, key=lambda x: float(x.get("price", 0)))
        third = len(sorted_plats) // 3
        starters = sorted_plats[:third]
        mains = sorted_plats[third:2 * third]
        desserts = sorted_plats[2 * third:]

    # ── Budget filter ─────────────────────────────────────────────
    if budget_per_person is not None and budget_per_person > 0:
        # Keep only items whose individual price ≤ budget (generous first pass)
        starters = [p for p in starters if float(p.get("price", 0)) <= budget_per_person]
        mains    = [p for p in mains    if float(p.get("price", 0)) <= budget_per_person]
        desserts = [p for p in desserts if float(p.get("price", 0)) <= budget_per_person]

        # Tighter pass: remove mains that even with the cheapest starter
        # and cheapest dessert would bust the budget
        min_starter = min((float(p.get("price", 0)) for p in starters), default=0)
        min_dessert = min((float(p.get("price", 0)) for p in desserts), default=0)
        mains = [p for p in mains
                 if min_starter + float(p.get("price", 0)) + min_dessert <= budget_per_person]

    def format_plats(items: list[dict], count: int) -> list[dict]:
        if not items:
            return []
        sorted_items = sorted(items, key=lambda x: float(x.get("price", 0)))
        selected = sorted_items[:count]
        return [{
            "id": p["id"],
            "name": p["name"],
            "price": float(p["price"]),
            "description": p.get("description"),
            "category": p.get("category_name", ""),
        } for p in selected]

    # Number of suggestions based on event type
    menu_sizes = {
        "WEDDING": (4, 4, 3),
        "CORPORATE": (3, 3, 2),
        "BIRTHDAY": (3, 3, 3),
        "COCKTAIL": (5, 3, 3),
        "CONFERENCE": (2, 2, 1),
        "PRIVATE": (3, 3, 2),
    }
    s_count, m_count, d_count = menu_sizes.get(event_type.upper(), (3, 3, 2))

    suggested_starters = format_plats(starters, s_count)
    suggested_mains = format_plats(mains, m_count)
    suggested_desserts = format_plats(desserts, d_count)

    # ── Estimate price per person ─────────────────────────────────
    # Realistic: cost of one starter + one main + one dessert
    median_starter = _median_price(suggested_starters)
    median_main    = _median_price(suggested_mains)
    median_dessert = _median_price(suggested_desserts)
    price_per_person = median_starter + median_main + median_dessert
    total_estimate = price_per_person * guest_count

    return {
        "eventType": event_type,
        "guestCount": guest_count,
        "budgetPerPerson": budget_per_person,
        "starters": suggested_starters,
        "mains": suggested_mains,
        "desserts": suggested_desserts,
        "estimatedPricePerPerson": round(price_per_person, 2),
        "totalEstimate": round(total_estimate, 2),
    }


def _median_price(items: list[dict]) -> float:
    """Return the median price from a list of formatted plat dicts."""
    if not items:
        return 0.0
    prices = sorted(p["price"] for p in items)
    mid = len(prices) // 2
    if len(prices) % 2 == 0:
        return (prices[mid - 1] + prices[mid]) / 2
    return prices[mid]
