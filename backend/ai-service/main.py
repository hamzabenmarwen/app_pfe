"""AI Service — FastAPI + LangChain + Google Gemini."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from routers import chat, recommendations, forecast, chef, kitchen, optimizer


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    settings = get_settings()
    print(f"[AI] {settings.SITE_NAME} AI Service starting...")
    print(f"   Port: {settings.PORT}")
    print(f"   Gemini API: {'[OK] configured' if settings.GOOGLE_API_KEY else '[!!] missing key'}")
    print("   Vector store will be built on first chat request (lazy loading).")

    yield
    print("[AI] AI Service shutting down.")


app = FastAPI(
    title=f"{get_settings().SITE_NAME} AI Service",
    description=f"Chatbot RAG intelligent et système de recommandation pour {get_settings().SITE_NAME}",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat.router)
app.include_router(recommendations.router)
app.include_router(forecast.router)
app.include_router(chef.router)
app.include_router(kitchen.router)
app.include_router(optimizer.router)


@app.get("/")
async def root():
    return {
        "service": f"{get_settings().SITE_NAME} AI Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "chat": "/api/chat/message",
            "history": "/api/chat/history/{userId}",
            "recommendations": "/api/recommendations/plats",
            "event_menu": "/api/recommendations/event-menu",
            "optimized_event_menu": "/api/optimizer/event-menu",
            "forecast": "/api/forecast/demand",
            "chef_dashboard": "/api/chef/dashboard",
            "kitchen_dashboard": "/api/kitchen/dashboard",
            "kitchen_ingredients": "/api/kitchen/ingredients/demand",
            "kitchen_po_suggestions": "/api/kitchen/purchase-orders/suggestions",
            "kitchen_profitability": "/api/kitchen/profitability",
            "kitchen_anomalies": "/api/kitchen/anomalies",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
