"""Database service — reads from catalog & order PostgreSQL databases."""

import psycopg2
import psycopg2.extras
import psycopg2.pool
from config import get_settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Connection pools (thread-safe, reuse connections)
# ──────────────────────────────────────────────
_catalog_pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None
_order_pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None


def _get_catalog_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _catalog_pool
    if _catalog_pool is None or _catalog_pool.closed:
        dsn = get_settings().CATALOG_DATABASE_URL
        _catalog_pool = psycopg2.pool.ThreadedConnectionPool(minconn=1, maxconn=10, dsn=dsn)
        logger.info("Catalog DB connection pool created")
    return _catalog_pool


def _get_order_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _order_pool
    if _order_pool is None or _order_pool.closed:
        dsn = get_settings().ORDER_DATABASE_URL
        _order_pool = psycopg2.pool.ThreadedConnectionPool(minconn=1, maxconn=10, dsn=dsn)
        logger.info("Order DB connection pool created")
    return _order_pool


def _get_catalog_conn():
    return _get_catalog_pool().getconn()


def _release_catalog_conn(conn):
    try:
        _get_catalog_pool().putconn(conn)
    except Exception:
        pass


def _get_order_conn():
    return _get_order_pool().getconn()


def _release_order_conn(conn):
    try:
        _get_order_pool().putconn(conn)
    except Exception:
        pass


# ──────────────────────────────────────────────
# Catalog queries
# ──────────────────────────────────────────────

def get_all_plats() -> list[dict]:
    """Fetch every plat with its category and allergens."""
    conn = _get_catalog_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    p.id, p.name, p.description, p.price::float,
                    p.preparation_time, p.is_available, p.is_vegetarian,
                    p.is_vegan, p.is_halal, p.is_gluten_free,
                    p.spice_level, p.calories, p.ingredients, p.images,
                    c.name AS category_name, c.id AS category_id
                FROM plats p
                JOIN categories c ON c.id = p.category_id
                WHERE p.is_available = true AND c.is_active = true
                ORDER BY c.display_order, p.name
            """)
            plats = cur.fetchall()

        # Attach allergens
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT pa.plat_id, a.name AS allergen_name
                FROM plat_allergens pa
                JOIN allergens a ON a.id = pa.allergen_id
            """)
            allergen_rows = cur.fetchall()

        allergen_map: dict[str, list[str]] = {}
        for row in allergen_rows:
            pid = row["plat_id"]
            allergen_map.setdefault(pid, []).append(row["allergen_name"])

        for plat in plats:
            plat["allergens"] = allergen_map.get(plat["id"], [])

        return [dict(p) for p in plats]
    finally:
        _release_catalog_conn(conn)


def get_all_categories() -> list[dict]:
    conn = _get_catalog_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, description
                FROM categories
                WHERE is_active = true
                ORDER BY display_order
            """)
            return [dict(r) for r in cur.fetchall()]
    finally:
        _release_catalog_conn(conn)


def get_all_allergens() -> list[dict]:
    conn = _get_catalog_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name, icon FROM allergens ORDER BY name")
            return [dict(r) for r in cur.fetchall()]
    finally:
        _release_catalog_conn(conn)


# ──────────────────────────────────────────────
# Order queries (for recommendations)
# ──────────────────────────────────────────────

def get_user_order_history(user_id: str) -> list[dict]:
    """Get plat IDs ordered by a specific user."""
    conn = _get_order_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT oi.plat_id, oi.plat_name, oi.quantity, o.created_at
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.user_id = %s AND o.status != 'CANCELLED'
                ORDER BY o.created_at DESC
                LIMIT 100
            """, (user_id,))
            return [dict(r) for r in cur.fetchall()]
    finally:
        _release_order_conn(conn)


def get_all_order_items() -> list[dict]:
    """Get all order items for collaborative filtering."""
    conn = _get_order_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT o.user_id, oi.plat_id, oi.quantity
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.status != 'CANCELLED'
            """)
            return [dict(r) for r in cur.fetchall()]
    finally:
        _release_order_conn(conn)


def get_plat_by_id(plat_id: str) -> Optional[dict]:
    conn = _get_catalog_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.*, c.name AS category_name
                FROM plats p
                JOIN categories c ON c.id = p.category_id
                WHERE p.id = %s
            """, (plat_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        _release_catalog_conn(conn)
