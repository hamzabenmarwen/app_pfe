import { Request, Response, NextFunction } from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  requestId: string;
  userId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  statusCode: number;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Security events to audit
 */
export enum SecurityEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * In-memory audit log store (should be replaced with persistent storage in production)
 */
const auditLogs: AuditEvent[] = [];
const MAX_LOGS = 10000;

/**
 * Add audit log entry
 */
export function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
  const auditEntry: AuditEvent = {
    ...event,
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
  };
  
  auditLogs.unshift(auditEntry);
  
  // Keep only recent logs
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.pop();
  }
  
  // Log security events to console for monitoring
  if (Object.values(SecurityEvent).includes(event.action as SecurityEvent)) {
    console.log(`[SECURITY AUDIT] ${event.action} | User: ${event.userId || 'anonymous'} | IP: ${event.ip} | Path: ${event.path}`);
  }
}

/**
 * Get recent audit logs (for admin monitoring)
 */
export function getAuditLogs(
  limit: number = 100,
  filter?: { userId?: string; action?: string; startDate?: Date; endDate?: Date }
): AuditEvent[] {
  let logs = auditLogs;
  
  if (filter?.userId) {
    logs = logs.filter(l => l.userId === filter.userId);
  }
  
  if (filter?.action) {
    logs = logs.filter(l => l.action === filter.action);
  }
  
  if (filter?.startDate) {
    logs = logs.filter(l => new Date(l.timestamp) >= filter.startDate!);
  }
  
  if (filter?.endDate) {
    logs = logs.filter(l => new Date(l.timestamp) <= filter.endDate!);
  }
  
  return logs.slice(0, limit);
}

/**
 * Middleware to track requests for auditing
 */
export function auditMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  
  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logAuditEvent({
      requestId: req.requestId || 'unknown',
      userId: (req as any).user?.userId,
      action: 'API_REQUEST',
      resource: req.path.split('/')[2] || 'unknown',
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      success: res.statusCode < 400,
      metadata: {
        duration,
        query: req.query,
      },
    });
  });
  
  next();
}

/**
 * Log security-specific events
 */
export function logSecurityEvent(
  event: SecurityEvent,
  req: RequestWithId,
  metadata?: Record<string, any>
): void {
  logAuditEvent({
    requestId: req.requestId || 'unknown',
    userId: (req as any).user?.userId,
    action: event,
    resource: 'security',
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent'),
    statusCode: 200,
    success: event.includes('SUCCESS') || event.includes('COMPLETE'),
    metadata,
  });
}

function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
