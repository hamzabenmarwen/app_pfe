"""
Conversation persistence service for AI chatbot.
Replaces in-memory storage with persistent database storage.
"""

import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict

from services.database import get_db_connection

logger = logging.getLogger(__name__)

@dataclass
class ConversationMessage:
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata or {}
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationMessage':
        return cls(
            role=data['role'],
            content=data['content'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            metadata=data.get('metadata', {})
        )

@dataclass
class Conversation:
    id: str
    user_id: Optional[str]
    session_id: str
    messages: List[ConversationMessage]
    created_at: datetime
    updated_at: datetime
    intent_distribution: Dict[str, int]
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'messages': [m.to_dict() for m in self.messages],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'intent_distribution': self.intent_distribution,
            'metadata': self.metadata or {}
        }


class ConversationRepository:
    """
    Repository for conversation persistence using PostgreSQL.
    """
    
    def __init__(self):
        self._ensure_table_exists()
    
    def _ensure_table_exists(self) -> None:
        """Create conversations table if it doesn't exist."""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS ai_conversations (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255),
            session_id VARCHAR(255) NOT NULL,
            messages JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            intent_distribution JSONB DEFAULT '{}',
            metadata JSONB DEFAULT '{}'
        );
        
        CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
            ON ai_conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_session_id 
            ON ai_conversations(session_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
            ON ai_conversations(updated_at DESC);
        """
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(create_table_sql)
                    conn.commit()
                    logger.info("[Conversation] Database table ensured")
        except Exception as e:
            logger.error(f"[Conversation] Failed to create table: {e}")
            raise
    
    def save_conversation(self, conversation: Conversation) -> None:
        """Save or update a conversation."""
        upsert_sql = """
        INSERT INTO ai_conversations (
            id, user_id, session_id, messages, created_at, updated_at, 
            intent_distribution, metadata
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            messages = EXCLUDED.messages,
            updated_at = EXCLUDED.updated_at,
            intent_distribution = EXCLUDED.intent_distribution,
            metadata = EXCLUDED.metadata;
        """
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(upsert_sql, (
                        conversation.id,
                        conversation.user_id,
                        conversation.session_id,
                        json.dumps([m.to_dict() for m in conversation.messages]),
                        conversation.created_at,
                        conversation.updated_at,
                        json.dumps(conversation.intent_distribution),
                        json.dumps(conversation.metadata or {})
                    ))
                    conn.commit()
                    logger.debug(f"[Conversation] Saved conversation {conversation.id}")
        except Exception as e:
            logger.error(f"[Conversation] Failed to save conversation: {e}")
            raise
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Retrieve a conversation by ID."""
        select_sql = """
        SELECT id, user_id, session_id, messages, created_at, updated_at,
               intent_distribution, metadata
        FROM ai_conversations WHERE id = %s;
        """
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(select_sql, (conversation_id,))
                    row = cur.fetchone()
                    
                    if not row:
                        return None
                    
                    return self._row_to_conversation(row)
        except Exception as e:
            logger.error(f"[Conversation] Failed to get conversation: {e}")
            return None
    
    def get_conversations_by_user(
        self, 
        user_id: str, 
        limit: int = 50,
        offset: int = 0
    ) -> List[Conversation]:
        """Get conversations for a user, most recent first."""
        select_sql = """
        SELECT id, user_id, session_id, messages, created_at, updated_at,
               intent_distribution, metadata
        FROM ai_conversations 
        WHERE user_id = %s
        ORDER BY updated_at DESC
        LIMIT %s OFFSET %s;
        """
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(select_sql, (user_id, limit, offset))
                    rows = cur.fetchall()
                    return [self._row_to_conversation(row) for row in rows]
        except Exception as e:
            logger.error(f"[Conversation] Failed to get user conversations: {e}")
            return []
    
    def get_conversation_by_session(self, session_id: str) -> Optional[Conversation]:
        """Get conversation by session ID."""
        select_sql = """
        SELECT id, user_id, session_id, messages, created_at, updated_at,
               intent_distribution, metadata
        FROM ai_conversations 
        WHERE session_id = %s
        ORDER BY updated_at DESC
        LIMIT 1;
        """
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(select_sql, (session_id,))
                    row = cur.fetchone()
                    
                    if not row:
                        return None
                    
                    return self._row_to_conversation(row)
        except Exception as e:
            logger.error(f"[Conversation] Failed to get session conversation: {e}")
            return None
    
    def add_message(
        self, 
        conversation_id: str, 
        message: ConversationMessage,
        intent: Optional[str] = None
    ) -> bool:
        """Add a message to an existing conversation."""
        try:
            conversation = self.get_conversation(conversation_id)
            if not conversation:
                return False
            
            conversation.messages.append(message)
            conversation.updated_at = datetime.now()
            
            # Update intent distribution
            if intent:
                conversation.intent_distribution[intent] = \
                    conversation.intent_distribution.get(intent, 0) + 1
            
            self.save_conversation(conversation)
            return True
        except Exception as e:
            logger.error(f"[Conversation] Failed to add message: {e}")
            return False
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        delete_sql = "DELETE FROM ai_conversations WHERE id = %s;"
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(delete_sql, (conversation_id,))
                    conn.commit()
                    return cur.rowcount > 0
        except Exception as e:
            logger.error(f"[Conversation] Failed to delete conversation: {e}")
            return False
    
    def cleanup_old_conversations(self, days: int = 30) -> int:
        """Remove conversations older than specified days."""
        cleanup_sql = """
        DELETE FROM ai_conversations 
        WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '%s days';
        """
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(cleanup_sql, (days,))
                    deleted_count = cur.rowcount
                    conn.commit()
                    logger.info(f"[Conversation] Cleaned up {deleted_count} old conversations")
                    return deleted_count
        except Exception as e:
            logger.error(f"[Conversation] Failed to cleanup old conversations: {e}")
            return 0
    
    def _row_to_conversation(self, row: tuple) -> Conversation:
        """Convert database row to Conversation object."""
        return Conversation(
            id=row[0],
            user_id=row[1],
            session_id=row[2],
            messages=[ConversationMessage.from_dict(m) for m in row[3]],
            created_at=row[4],
            updated_at=row[5],
            intent_distribution=row[6] or {},
            metadata=row[7] or {}
        )


# Global repository instance
_conversation_repo: Optional[ConversationRepository] = None

def get_conversation_repository() -> ConversationRepository:
    """Get or create the conversation repository singleton."""
    global _conversation_repo
    if _conversation_repo is None:
        _conversation_repo = ConversationRepository()
    return _conversation_repo


# Backward-compatible functions for chatbot.py
def get_conversation_history(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get conversation history for a user (backward compatible)."""
    repo = get_conversation_repository()
    conversations = repo.get_conversations_by_user(user_id, limit=1)
    
    if not conversations:
        return []
    
    # Return last N messages as dict list
    messages = conversations[0].messages[-limit:]
    return [
        {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat()}
        for m in messages
    ]

def save_user_message(user_id: str, message: str, session_id: str) -> None:
    """Save a user message (backward compatible)."""
    repo = get_conversation_repository()
    
    # Get or create conversation
    conversation = repo.get_conversation_by_session(session_id)
    
    if not conversation:
        conversation = Conversation(
            id=session_id,
            user_id=user_id,
            session_id=session_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            intent_distribution={}
        )
    
    # Add user message
    user_msg = ConversationMessage(
        role='user',
        content=message,
        timestamp=datetime.now()
    )
    conversation.messages.append(user_msg)
    conversation.updated_at = datetime.now()
    
    repo.save_conversation(conversation)

def save_assistant_message(user_id: str, message: str, session_id: str) -> None:
    """Save an assistant message (backward compatible)."""
    repo = get_conversation_repository()
    
    conversation = repo.get_conversation_by_session(session_id)
    if not conversation:
        return
    
    assistant_msg = ConversationMessage(
        role='assistant',
        content=message,
        timestamp=datetime.now()
    )
    conversation.messages.append(assistant_msg)
    conversation.updated_at = datetime.now()
    
    repo.save_conversation(conversation)
