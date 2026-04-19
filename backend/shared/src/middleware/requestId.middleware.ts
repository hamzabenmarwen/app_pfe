import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
  requestId: string;
  startTime: number;
}

/**
 * Middleware to assign unique request IDs for distributed tracing
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Attach to request object
  (req as RequestWithId).requestId = requestId;
  (req as RequestWithId).startTime = Date.now();
  
  // Expose in response headers for client tracing
  res.setHeader('X-Request-Id', requestId);
  
  next();
}

/**
 * Get request ID from request object
 */
export function getRequestId(req: Request): string | undefined {
  return (req as RequestWithId).requestId;
}

/**
 * Get request duration in milliseconds
 */
export function getRequestDuration(req: Request): number {
  const startTime = (req as RequestWithId).startTime;
  return startTime ? Date.now() - startTime : 0;
}
