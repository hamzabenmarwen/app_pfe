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
