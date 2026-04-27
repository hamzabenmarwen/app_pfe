"""Chat router — handles chatbot conversations."""

import uuid
import asyncio
import logging
import jwt
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from models.schemas import ChatMessageRequest, ChatMessageResponse, ChatHistoryResponse
from services.chatbot import chat, get_history, clear_history, build_vectorstore, get_retrieval_metrics
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def _decode_token(authorization: Optional[str]) -> Optional[dict]:
    """Decode and verify a Bearer JWT token. Returns the payload or None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _extract_user_id_from_token(authorization: Optional[str] = None) -> Optional[str]:
    """Extract userId from a verified Bearer JWT token."""
    payload = _decode_token(authorization)
    return payload.get("userId") if payload else None


def _require_admin(authorization: Optional[str]) -> None:
    """Verify that the request comes from an admin user."""
    payload = _decode_token(authorization)
    if payload is None:
        raise HTTPException(status_code=401, detail="Authentification requise")
    if payload.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(req: ChatMessageRequest, authorization: Optional[str] = Header(None)):
    """Send a message to the AI chatbot and get a response."""
    user_id = req.userId or _extract_user_id_from_token(authorization) or f"anonymous-{uuid.uuid4().hex[:8]}"

    try:
        reply = await chat(user_id, req.message)
        return ChatMessageResponse(reply=reply, userId=user_id)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Désolé, une erreur s'est produite. Veuillez réessayer."
        )


@router.get("/history/{user_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    user_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Messages per page"),
    authorization: Optional[str] = Header(None),
):
    """Get conversation history for a user. Requires the same user or admin."""
    caller_id = _extract_user_id_from_token(authorization)
    if not caller_id:
        raise HTTPException(status_code=401, detail="Authentification requise")
    if caller_id != user_id:
        _require_admin(authorization)

    all_messages = get_history(user_id)
    total = len(all_messages)

    # Pagination
    start = (page - 1) * limit
    end = start + limit
    paginated = all_messages[start:end]

    return ChatHistoryResponse(
        messages=paginated,
        userId=user_id,
        total=total,
        page=page,
        limit=limit,
        totalPages=(total + limit - 1) // limit if total > 0 else 1,
    )


@router.delete("/history/{user_id}")
async def clear_chat_history(user_id: str, authorization: Optional[str] = Header(None)):
    """Clear conversation history for a user. Requires the same user or admin."""
    caller_id = _extract_user_id_from_token(authorization)
    if not caller_id:
        raise HTTPException(status_code=401, detail="Authentification requise")
    if caller_id != user_id:
        _require_admin(authorization)
    clear_history(user_id)
    return {"message": "Historique supprimé", "userId": user_id}


@router.post("/refresh-knowledge")
async def refresh_knowledge(authorization: Optional[str] = Header(None)):
    """Refresh the vector store with latest menu data. Admin only."""
    _require_admin(authorization)
    try:
        await asyncio.to_thread(build_vectorstore, True)
        return {"message": "Base de connaissances mise à jour avec succès"}
    except Exception as e:
        logger.error(f"Knowledge refresh error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")


@router.get("/metrics")
async def get_metrics(authorization: Optional[str] = Header(None)):
    """Get retrieval quality metrics. Admin only."""
    _require_admin(authorization)
    return get_retrieval_metrics()
