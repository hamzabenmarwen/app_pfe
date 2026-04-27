"""Pydantic schemas for request/response models."""

from pydantic import BaseModel, Field
from typing import Optional


# ── Chat ──
class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    userId: Optional[str] = None


class ChatMessageResponse(BaseModel):
    reply: str
    userId: str


class ChatHistoryResponse(BaseModel):
    messages: list[dict]
    userId: str
    total: int = 0
    page: int = 1
    limit: int = 20
    totalPages: int = 1


# ── Recommendations ──
class RecommendationRequest(BaseModel):
    userId: Optional[str] = None
    category: Optional[str] = None
    dietary: Optional[str] = None
    limit: int = Field(default=8, ge=1, le=20)


class PlatRecommendation(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price: float
    category: str
    image: Optional[str]
    isVegetarian: bool
    isVegan: bool
    isHalal: bool
    isGlutenFree: bool
    score: float
    reason: str


class RecommendationResponse(BaseModel):
    recommendations: list[PlatRecommendation]
    count: int


class EventMenuRequest(BaseModel):
    eventType: str = Field(..., min_length=1)
    guestCount: int = Field(..., ge=1)
    budgetPerPerson: Optional[float] = None


class EventMenuResponse(BaseModel):
    eventType: str
    guestCount: int
    starters: list[dict]
    mains: list[dict]
    desserts: list[dict]
    estimatedPricePerPerson: float
    totalEstimate: float


class OptimizedMenuRequest(BaseModel):
    event_type: str
    guest_count: int = Field(..., ge=1)
    budget_per_person: float = Field(..., gt=0)
    service_type: str = "buffet"
    vegetarian_ratio: float = 0.0
    vegan_ratio: float = 0.0
    halal_ratio: float = 1.0
    gluten_free_ratio: float = 0.0
    min_starters: int = 2
    min_mains: int = 2
    min_desserts: int = 1
    max_items_per_course: int = 5


class OptimizedMenuResponse(BaseModel):
    event_type: str
    guest_count: int
    budget_per_person: float
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
