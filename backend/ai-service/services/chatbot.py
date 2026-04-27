"""RAG Chatbot — LangChain + Google Gemini + FAISS persistent vector store.

Architecture (v2):
  1. Indexation: DB data -> Documents -> Chunking -> Embeddings -> FAISS (persistent)
  2. Query:     User question -> Intent Classification -> Metadata-Filtered Retrieval
                -> Relevance Reranking -> LLM Generation -> Response

Improvements over v1 (in-memory numpy):
  - FAISS persistent vector store (survives restarts, scales to 100k+ docs)
  - Query intent classification (menu / event / allergen / general)
  - Metadata-filtered retrieval (category & intent aware search)
  - Cross-result reranking for top-k precision
  - Retrieval quality metrics logging (latency, scores, intent distribution)
  - Conversation summarization for long histories
"""

import asyncio
import logging
import os
import time
import threading
from collections import OrderedDict
from typing import Optional

try:
    import faiss
    FAISS_AVAILABLE = True
except Exception:
    faiss = None  # type: ignore
    FAISS_AVAILABLE = False
    logging.getLogger(__name__).warning("FAISS unavailable — chatbot will use basic LLM without RAG")
import numpy as np
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from config import get_settings
from services.database import get_all_plats, get_all_categories, get_all_allergens

logger = logging.getLogger(__name__)

MAX_CONVERSATIONS = 200
MAX_HISTORY_PER_USER = 20
FAISS_INDEX_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "faiss_db")

# ──────────────────────────────────────────────
# Thread-safe LRU conversation store
# ──────────────────────────────────────────────
_conversations: OrderedDict[str, list[dict]] = OrderedDict()
_conv_lock = threading.Lock()

# ──────────────────────────────────────────────
# FAISS vector store (persistent)
# ──────────────────────────────────────────────
_faiss_vectorstore = None  # langchain FAISS wrapper
_embeddings_model = None
_vectorstore_ready = False

# ──────────────────────────────────────────────
# Retrieval quality metrics
# ──────────────────────────────────────────────
_metrics: dict = {
    "total_queries": 0,
    "avg_retrieval_time_ms": 0.0,
    "avg_top_score": 0.0,
    "queries_by_intent": {},
}
_metrics_lock = threading.Lock()


# ──────────────────────────────────────────────
# Query intent classification
# ──────────────────────────────────────────────
INTENT_KEYWORDS = {
    "menu": ["plat", "menu", "manger", "commander", "prix", "coût", "cher", "pas cher",
             "végétarien", "végan", "halal", "sans gluten", "épicé", "calorie", "ingrédient",
             "catégorie", "entrée", "dessert", "principal", "salade", "soupe"],
    "event": ["événement", "mariage", "anniversaire", "cocktail", "conférence", "fête",
              "réception", "corporate", "invités", "devis", "buffet", "service à table",
              "serveur", "personnel", "location", "matériel"],
    "allergen": ["allergène", "allergie", "allergique", "gluten", "lactose", "arachide",
                 "noix", "œuf", "oeuf", "poisson", "crustacé", "soja"],
    "general": ["horaire", "heure", "ouvert", "fermé", "livraison", "contact",
                "adresse", "téléphone", "email", "paiement", "espèce"],
}


def classify_intent(query: str) -> str:
    """Classify user query into intent category for targeted retrieval."""
    query_lower = query.lower()
    scores = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in query_lower)
        scores[intent] = score

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "general"
    return best


def _get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        _embeddings_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
        )
    return _embeddings_model


def _get_faiss_vectorstore():
    """Get or lazily create the FAISS vectorstore."""
    global _faiss_vectorstore
    if _faiss_vectorstore is not None:
        return _faiss_vectorstore

    embeddings_model = _get_embeddings()
    os.makedirs(FAISS_INDEX_DIR, exist_ok=True)

    # Try loading from disk
    index_path = os.path.join(FAISS_INDEX_DIR, "index.faiss")
    pkl_path = os.path.join(FAISS_INDEX_DIR, "index.pkl")
    if os.path.exists(index_path) and os.path.exists(pkl_path):
        try:
            from langchain_community.vectorstores import FAISS as LCFAISS
            _faiss_vectorstore = LCFAISS.load_local(
                FAISS_INDEX_DIR,
                embeddings_model,
                allow_dangerous_deserialization=True,
            )
            logger.info(f"FAISS index loaded from disk: {FAISS_INDEX_DIR}")
            return _faiss_vectorstore
        except Exception as e:
            logger.warning(f"Failed to load FAISS from disk: {e}, will rebuild")

    return None


def _build_documents() -> list[Document]:
    """Build LangChain documents from database content."""
    docs = []
    plats = get_all_plats()
    categories = get_all_categories()
    allergens = get_all_allergens()

    # General info document
    cat_names = [c["name"] for c in categories]
    docs.append(Document(
        page_content=(
            f"{get_settings().SITE_NAME} est un service traiteur haut de gamme basé à Sfax, Tunisie. "
            f"Nous proposons des plats pour la vente quotidienne et pour les événements "
            f"(mariages, réceptions d'entreprise, anniversaires, cocktails, conférences, fêtes privées). "
            f"Nos catégories de plats sont : {', '.join(cat_names)}. "
            f"Nous proposons {len(plats)} plats au total. "
            f"Nous livrons en Tunisie. "
            f"Les commandes doivent être passées au minimum 48h à l'avance. "
            f"Nous acceptons les paiements en espèces. "
            f"Pour les événements, un devis personnalisé est fourni gratuitement. "
            f"Horaires : Lun-Sam 08h-20h, Dim 09h-14h. "
            f"Contact : assiestte.sfaxienne@gmail.com"
        ),
        metadata={"type": "info", "intent": "general"}
    ))

    # Per-category summary
    for cat in categories:
        cat_plats = [p for p in plats if p["category_id"] == cat["id"]]
        if cat_plats:
            names = [p["name"] for p in cat_plats]
            price_range = f"{min(p['price'] for p in cat_plats):.2f} - {max(p['price'] for p in cat_plats):.2f} DT"
            docs.append(Document(
                page_content=(
                    f"Catégorie '{cat['name']}' : {cat.get('description', '')}. "
                    f"Contient {len(cat_plats)} plats : {', '.join(names)}. "
                    f"Gamme de prix : {price_range}."
                ),
                metadata={"type": "category", "category": cat["name"], "intent": "menu"}
            ))

    # Per-plat document
    for p in plats:
        features = []
        if p["is_vegetarian"]:
            features.append("végétarien")
        if p["is_vegan"]:
            features.append("végan")
        if p["is_halal"]:
            features.append("halal")
        if p["is_gluten_free"]:
            features.append("sans gluten")

        allergen_text = ", ".join(p.get("allergens", [])) if p.get("allergens") else "aucun allergène déclaré"
        feat_text = ", ".join(features) if features else "standard"

        content = (
            f"Plat : {p['name']}. "
            f"Catégorie : {p['category_name']}. "
            f"Description : {p.get('description', 'Non disponible')}. "
            f"Prix : {p['price']:.2f} DT. "
            f"Temps de préparation : {p.get('preparation_time', 'Non spécifié')} minutes. "
            f"Régime : {feat_text}. "
            f"Allergènes : {allergen_text}. "
            f"Niveau d'épice : {p['spice_level']}/5. "
            f"Calories : {p.get('calories', 'Non spécifié')} kcal. "
            f"Ingrédients : {p.get('ingredients', 'Non spécifié')}."
        )
        docs.append(Document(
            page_content=content,
            metadata={
                "type": "plat",
                "plat_id": p["id"],
                "category": p["category_name"],
                "intent": "menu",
            }
        ))

    # Allergen info
    if allergens:
        names = [a["name"] for a in allergens]
        docs.append(Document(
            page_content=(
                f"Liste des allergènes répertoriés : {', '.join(names)}. "
                f"Chaque plat indique ses allergènes. Si vous avez des allergies, "
                f"veuillez vérifier les détails de chaque plat ou nous contacter."
            ),
            metadata={"type": "allergens", "intent": "allergen"}
        ))

    # Event info
    docs.append(Document(
        page_content=(
            f"{get_settings().SITE_NAME} propose l'organisation d'événements sur mesure : "
            "Mariages (formule complète, entrée-plat-dessert, service à table ou buffet), "
            "Réceptions d'entreprise (cocktails, pauses café, déjeuners d'affaires), "
            "Anniversaires (menus enfants et adultes, gâteaux personnalisés), "
            "Cocktails dînatoires (pièces salées et sucrées, variées et raffinées), "
            "Conférences (pauses café, snacks, plateaux repas), "
            "Fêtes privées (barbecue, brunch, soirées à thème). "
            "Demandez un devis gratuit avec le nombre d'invités et le type de service souhaité. "
            "Le personnel de service (serveurs, chef) est disponible en option. "
            "Location de vaisselle et matériel disponible."
        ),
        metadata={"type": "events", "intent": "event"}
    ))

    return docs


def build_vectorstore(force_refresh: bool = False):
    """Build or refresh the FAISS persistent vector store."""
    global _faiss_vectorstore, _vectorstore_ready

    if not FAISS_AVAILABLE:
        logger.warning("FAISS not available, skipping vectorstore build")
        return

    if force_refresh:
        import shutil
        if os.path.exists(FAISS_INDEX_DIR):
            shutil.rmtree(FAISS_INDEX_DIR)
            logger.info("Existing FAISS index deleted for refresh")
        _faiss_vectorstore = None
        _vectorstore_ready = False

    if _vectorstore_ready:
        return

    # Try loading from disk first
    vs = _get_faiss_vectorstore()
    if vs is not None:
        _faiss_vectorstore = vs
        _vectorstore_ready = True
        logger.info(f"FAISS vectorstore loaded from disk")
        return

    # Build from scratch
    from langchain_community.vectorstores import FAISS as LCFAISS

    docs = _build_documents()
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    split_docs = splitter.split_documents(docs)

    # Ensure metadata values are simple types
    for doc in split_docs:
        for key in list(doc.metadata.keys()):
            if doc.metadata[key] is None:
                doc.metadata[key] = ""

    embeddings_model = _get_embeddings()

    _faiss_vectorstore = LCFAISS.from_documents(split_docs, embeddings_model)

    # Save to disk for persistence
    os.makedirs(FAISS_INDEX_DIR, exist_ok=True)
    _faiss_vectorstore.save_local(FAISS_INDEX_DIR)

    _vectorstore_ready = True
    logger.info(f"FAISS vector store built: {len(split_docs)} chunks from {len(docs)} source documents")


def _similarity_search(query: str, intent: str, k: int = 7) -> list[tuple[str, float]]:
    """Search FAISS with intent-aware metadata filtering and reranking."""
    build_vectorstore()

    if _faiss_vectorstore is None:
        return []

    start_time = time.time()

    # Intent-filtered search using FAISS similarity_search_with_score
    search_kwargs = {"k": k}
    if intent != "general":
        search_kwargs["filter"] = {"intent": intent}

    try:
        results = _faiss_vectorstore.similarity_search_with_score(query, **search_kwargs)
    except Exception:
        # Fallback without filter
        results = _faiss_vectorstore.similarity_search_with_score(query, k=k)

    # Also fetch unfiltered results for cross-intent context
    try:
        general_results = _faiss_vectorstore.similarity_search_with_score(query, k=min(3, k))
    except Exception:
        general_results = []

    retrieval_time = (time.time() - start_time) * 1000

    # Merge + deduplicate + convert L2 distances to similarity scores
    seen = set()
    scored_docs = []
    for doc, dist in list(results) + list(general_results):
        text = doc.page_content
        if text not in seen:
            seen.add(text)
            # FAISS returns L2 distance; convert to similarity (higher = better)
            score = 1.0 / (1.0 + float(dist))
            scored_docs.append((text, score))

    # Rerank by relevance score
    scored_docs.sort(key=lambda x: x[1], reverse=True)
    top_docs = scored_docs[:k]

    # Log retrieval quality metrics
    avg_score = float(np.mean([s for _, s in top_docs])) if top_docs else 0.0
    top_score = top_docs[0][1] if top_docs else 0.0
    with _metrics_lock:
        _metrics["total_queries"] += 1
        n = _metrics["total_queries"]
        _metrics["avg_retrieval_time_ms"] = (
            _metrics["avg_retrieval_time_ms"] * (n - 1) + retrieval_time
        ) / n
        _metrics["avg_top_score"] = (
            _metrics["avg_top_score"] * (n - 1) + top_score
        ) / n
        _metrics["queries_by_intent"][intent] = _metrics["queries_by_intent"].get(intent, 0) + 1

    logger.info(
        f"Retrieval: intent={intent}, docs={len(top_docs)}, "
        f"top_score={top_score:.3f}, avg={avg_score:.3f}, "
        f"time={retrieval_time:.1f}ms"
    )

    return top_docs


def get_retrieval_metrics() -> dict:
    """Return current retrieval quality metrics."""
    with _metrics_lock:
        return dict(_metrics)


def _get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=get_settings().GOOGLE_API_KEY,
        temperature=0.7,
        max_output_tokens=1024,
        max_retries=3,
    )


SYSTEM_PROMPT = f"""Tu es l'assistant intelligent de {get_settings().SITE_NAME}, un service traiteur haut de gamme basé à Sfax, Tunisie.

Ton rôle :
- Aider les clients à choisir des plats adaptés à leurs goûts et besoins alimentaires
- Conseiller sur les menus pour événements (mariages, entreprise, anniversaires, etc.)
- Répondre aux questions sur les prix, allergènes, ingrédients, temps de préparation
- Suggérer des plats selon les contraintes (végétarien, sans gluten, halal, budget, etc.)
- Informer sur les services disponibles (livraison, personnel, matériel)

Règles :
- Réponds TOUJOURS en français
- Sois chaleureux, professionnel et concis
- Utilise les informations du contexte pour donner des réponses précises
- Si tu ne trouves pas l'information, indique-le honnêtement et recommande de contacter le traiteur
- Ne fais pas de prix si tu ne les connais pas, dirige vers un devis
- Utilise des emojis occasionnellement pour être plus convivial
- Les prix sont en Dinars Tunisiens (DT)
- Quand tu recommandes des plats, mentionne le nom exact et le prix"""


def _summarize_history(history: list[dict]) -> str:
    """Summarize long conversation history into compact context."""
    if len(history) <= 6:
        return ""

    older = history[:-6]
    topics = set()
    for msg in older:
        content = msg["content"].lower()
        if any(kw in content for kw in ["végétarien", "végan", "halal", "sans gluten"]):
            topics.add("préférences alimentaires")
        if any(kw in content for kw in ["mariage", "événement", "anniversaire"]):
            topics.add("planification d'événement")
        if any(kw in content for kw in ["prix", "budget", "cher"]):
            topics.add("questions de prix")
        if any(kw in content for kw in ["allergi", "allergène"]):
            topics.add("préoccupations allergènes")

    if topics:
        return f"[Résumé de la conversation précédente : le client a discuté de {', '.join(topics)}]"
    return ""


async def chat(user_id: str, message: str) -> str:
    """Process a chat message using intent-aware RAG pipeline."""
    # Step 1: Classify intent
    intent = classify_intent(message)
    logger.info(f"User {user_id[:8]}... intent={intent}: {message[:80]}")

    # Step 2: Retrieve relevant context via FAISS
    # Always attempt retrieval when FAISS is available. _similarity_search()
    # will lazily build/load the vector store on first use.
    if FAISS_AVAILABLE:
        try:
            scored_docs = await asyncio.to_thread(_similarity_search, message, intent, 5)
            context_parts = [doc for doc, _score in scored_docs]
            context = "\n\n".join(context_parts)
            if not context:
                context = "(Aucun contexte pertinent trouvé dans la base vectorielle.)"
        except Exception as retrieval_error:
            logger.warning(f"Retrieval failed, fallback to LLM-only response: {retrieval_error}")
            context = "(Base vectorielle temporairement indisponible — réponds du mieux possible avec tes connaissances.)"
    else:
        context = "(Pas de base de données vectorielle disponible — réponds du mieux possible avec tes connaissances.)"

    # Step 3: Build conversation with history summarization
    with _conv_lock:
        history = list(_conversations.get(user_id, []))
        if user_id in _conversations:
            _conversations.move_to_end(user_id)

    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    summary = _summarize_history(history)
    if summary:
        messages.append(SystemMessage(content=summary))

    for msg in history[-10:]:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))

    # Build user message with retrieval context + intent hint
    intent_hints = {
        "menu": "Le client pose une question sur le menu ou les plats.",
        "event": "Le client s'intéresse à l'organisation d'un événement.",
        "allergen": "Le client a des préoccupations liées aux allergènes.",
        "general": "Le client pose une question générale sur le service.",
    }

    user_message = f"""[Intention détectée : {intent_hints.get(intent, '')}]

Contexte du menu (informations de la base de données vectorielle) :
{context}

Question du client : {message}"""

    messages.append(HumanMessage(content=user_message))

    # Step 4: Generate response with retry
    llm = _get_llm()
    answer = ""
    last_error = None
    for attempt in range(2):
        try:
            logger.info(f"Calling Gemini (attempt {attempt + 1}/2)")
            response = await llm.ainvoke(messages)
            answer = response.content
            logger.info(f"Gemini responded ({len(answer)} chars)")
            break
        except Exception as e:
            last_error = e
            error_str = str(e)
            logger.warning(f"Gemini error (attempt {attempt + 1}): {error_str[:200]}")
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait = 3 * (attempt + 1)
                logger.info(f"Rate limited, waiting {wait}s...")
                await asyncio.sleep(wait)
            else:
                break

    if not answer:
        if last_error:
            logger.error(f"All attempts failed. Last error: {last_error}")
        answer = ("Désolé, je rencontre un problème technique momentané. "
                  "Veuillez réessayer dans quelques instants. 🙏")

    # Step 5: Save conversation with LRU eviction
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": answer})
    if len(history) > MAX_HISTORY_PER_USER:
        history = history[-MAX_HISTORY_PER_USER:]

    with _conv_lock:
        _conversations[user_id] = history
        _conversations.move_to_end(user_id)
        while len(_conversations) > MAX_CONVERSATIONS:
            evicted_key, _ = _conversations.popitem(last=False)
            logger.debug(f"LRU evicted conversation for user {evicted_key}")

    return answer


def get_history(user_id: str) -> list[dict]:
    """Get conversation history for a user (thread-safe)."""
    with _conv_lock:
        return list(_conversations.get(user_id, []))


def clear_history(user_id: str):
    """Clear conversation history for a user (thread-safe)."""
    with _conv_lock:
        _conversations.pop(user_id, None)
