"""AI Service — FastAPI + LangChain + Google Gemini."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from routers import chat, recommendations


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    settings = get_settings()
    print(f"🤖 {settings.SITE_NAME} AI Service starting...")
    print(f"   Port: {settings.PORT}")
    print(f"   Gemini API: {'✅ configured' if settings.GOOGLE_API_KEY else '❌ missing key'}")
    print("   Vector store will be built on first chat request (lazy loading).")

    yield
    print("🤖 AI Service shutting down.")


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
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
