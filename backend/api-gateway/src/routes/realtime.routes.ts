import { Router } from 'express';
import { emitRealtime } from '../realtime/socket';

const router = Router();

router.post('/emit', (req, res) => {
  const internalKey = process.env.REALTIME_INTERNAL_KEY || 'traiteurpro-realtime-key';
  const providedKey = req.header('x-internal-key');

  if (providedKey !== internalKey) {
    res.status(401).json({ success: false, error: 'Unauthorized internal event emission' });
    return;
  }

  const { event, data, rooms = [], broadcastToAdmins = false } = req.body || {};

  if (!event || typeof event !== 'string') {
    res.status(400).json({ success: false, error: 'event is required' });
    return;
  }

  const targetRooms = Array.isArray(rooms) ? [...rooms] : [];

  if (data?.userId) {
    targetRooms.push(`user:${data.userId}`);
  }

  if (broadcastToAdmins) {
    targetRooms.push('role:ADMIN');
  }

  const uniqueRooms = [...new Set(targetRooms)];
  emitRealtime(event, data, uniqueRooms);

  res.json({
    success: true,
    event,
    rooms: uniqueRooms,
  });
});

export default router;
