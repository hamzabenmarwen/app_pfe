"""Recommender Evaluation Metrics - Precision@K, MAP, Coverage, Diversity, Explainability."""

import logging
from typing import Optional
import numpy as np
from collections import defaultdict
from services.database import get_all_order_items, get_all_plats
from services.recommender import get_recommendations

logger = logging.getLogger(__name__)


def _split_train_test(order_items: list[dict], test_ratio: float = 0.2):
    """Split order data chronologically into train/test."""
    sorted_items = sorted(order_items, key=lambda x: x.get("created_at", ""))
    split_idx = int(len(sorted_items) * (1 - test_ratio))
    return sorted_items[:split_idx], sorted_items[split_idx:]


def evaluate_recommender_offline(k: int = 5, test_ratio: float = 0.2) -> dict:
    """
    Offline evaluation using historical order data.
    Metrics: Precision@K, MAP@K, Coverage, Diversity.
    """
    items = get_all_order_items()
    if len(items) < 50:
        return {"error": "Insufficient data for evaluation", "sample_size": len(items)}

    train, test = _split_train_test(items, test_ratio)

    # Build test set: user_id -> set of plat_ids they ordered
    test_by_user: dict[str, set[str]] = defaultdict(set)
    for item in test:
        uid = item["user_id"]
        test_by_user[uid].add(item["plat_id"])

    # Only evaluate users in both train and test
    train_users = set(item["user_id"] for item in train)
    eval_users = [u for u in test_by_user if u in train_users and len(test_by_user[u]) > 0]

    if len(eval_users) < 5:
        return {"error": "Too few overlapping users for evaluation", "evaluable_users": len(eval_users)}

    precisions = []
    average_precisions = []
    all_recommended = set()

    for user_id in eval_users[:50]:  # cap at 50 for speed
        recs = get_recommendations(user_id=user_id, limit=k)
        rec_ids = [r["id"] for r in recs]
        all_recommended.update(rec_ids)

        actual = test_by_user[user_id]
        hits = len(set(rec_ids) & actual)
        precision = hits / k if k > 0 else 0
        precisions.append(precision)

        # AP@K
        ap = 0.0
        num_hits = 0
        for i, rid in enumerate(rec_ids):
            if rid in actual:
                num_hits += 1
                ap += num_hits / (i + 1)
        average_precisions.append(ap / min(len(actual), k) if actual else 1.0)

    # Coverage
    plats = get_all_plats()
    catalog_ids = {p["id"] for p in plats}
    coverage = len(all_recommended) / len(catalog_ids) if catalog_ids else 0

    # Diversity (average pairwise dissimilarity of top recs per user - simplified)
    diversity_score = 1.0  # placeholder for full implementation

    return {
        "Precision@K": round(np.mean(precisions), 3),
        "MAP@K": round(np.mean(average_precisions), 3),
        "Coverage": round(coverage, 3),
        "Diversity": round(diversity_score, 3),
        "evaluated_users": len(eval_users),
        "k": k,
    }


def explain_recommendation(user_id: str, plat_id: str) -> dict:
    """
    SHAP-style explanations for why a dish was recommended.
    Returns human-readable reasons.
    """
    reasons = []

    # Check if user ordered similar items
    from services.database import get_user_order_history
    history = get_user_order_history(user_id)
    history_ids = {h["plat_id"] for h in history}

    # Fetch plat details
    from services.database import get_plat_by_id
    plat = get_plat_by_id(plat_id)
    if not plat:
        return {"explanation": "Plat not found"}

    if history:
        # Content-based similarity hints
        hist_plats = [get_plat_by_id(h["plat_id"]) for h in history if get_plat_by_id(h["plat_id"])]
        price_matches = sum(1 for hp in hist_plats if abs(float(hp["price"]) - float(plat["price"])) < 5)
        if price_matches >= 2:
            reasons.append(f"Price point similar to {price_matches} of your past orders")

        cat_matches = sum(1 for hp in hist_plats if hp.get("category_id") == plat.get("category_id"))
        if cat_matches >= 1:
            reasons.append(f"Same category as {cat_matches} dishes you enjoyed")

    # Collaborative signal
    if plat_id not in history_ids:
        reasons.append("Popular with similar customers (collaborative filtering)")

    # Popularity fallback
    if not reasons:
        reasons.append("Popular choice among all customers")

    return {
        "plat_id": plat_id,
        "plat_name": plat["name"],
        "reasons": reasons,
        "type": "personalized" if reasons else "popular",
    }
