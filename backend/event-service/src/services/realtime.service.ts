interface RealtimePayload {
  event: string;
  data?: Record<string, any>;
  rooms?: string[];
  broadcastToAdmins?: boolean;
}

export async function emitRealtimeEvent(payload: RealtimePayload): Promise<void> {
  const realtimeUrl = process.env.REALTIME_EMIT_URL || 'http://localhost:3000/internal/realtime/emit';
  const internalKey = process.env.REALTIME_INTERNAL_KEY || 'traiteurpro-realtime-key';

  try {
    await fetch(realtimeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Realtime emit failed (event-service):', (error as Error).message);
  }
}
