/**
 * Custom application error classes for standardized error handling
 * across all microservices.
 */

export enum ErrorCode {
  // Authentication & Authorization Errors (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Client Errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
  timestamp: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, string[]>,
    isOperational = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(requestId?: string): ErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      message: this.message,
      details: this.details,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }
}

// Specific error classes for common scenarios

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      ErrorCode.NOT_FOUND,
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404
    );
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      400,
      details
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(ErrorCode.TOO_MANY_REQUESTS, message, 429);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(ErrorCode.DATABASE_ERROR, message, 500, undefined, false);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      message || `External service '${service}' unavailable`,
      503,
      undefined,
      false
    );
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(ErrorCode.INTERNAL_ERROR, message, 500, undefined, false);
  }
}
