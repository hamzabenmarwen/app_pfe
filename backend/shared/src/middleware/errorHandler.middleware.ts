import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, ErrorResponse } from '../errors/AppError';

interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Global error handling middleware
 * Converts all errors to standardized response format
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const typedReq = req as RequestWithId;
  const requestId = typedReq.requestId;
  
  // Log error with request context
  const errorLog = {
    requestId,
    path: typedReq.path,
    method: typedReq.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  if (err instanceof AppError && err.isOperational) {
    // Operational errors (expected) - log at warn level
    console.warn('[Operational Error]', errorLog);
    
    res.status(err.statusCode).json(err.toJSON(requestId));
    return;
  }

  // Programming or unknown errors - log at error level
  console.error('[Unexpected Error]', errorLog);

  // Send generic error response to client (don't leak details)
  const response: ErrorResponse = {
    success: false,
    error: 'Internal server error',
    code: ErrorCode.INTERNAL_ERROR,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred',
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development' && err.stack) {
    (response as any).stack = err.stack;
  }

  res.status(500).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates need for try-catch blocks in controllers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(
  req: Request,
  res: Response
): void {
  const typedReq = req as RequestWithId;
  const response: ErrorResponse = {
    success: false,
    error: `Route ${typedReq.method} ${typedReq.path} not found`,
    code: ErrorCode.NOT_FOUND,
    message: 'The requested resource does not exist',
    requestId: typedReq.requestId,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}
