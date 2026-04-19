import {
  AppError,
  ErrorCode,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  InternalError,
} from '../../errors/AppError';

describe('AppError', () => {
  it('should create a basic AppError with correct properties', () => {
    const error = new AppError(
      ErrorCode.BAD_REQUEST,
      'Bad request',
      400,
      { field: ['error'] },
      true
    );

    expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    expect(error.message).toBe('Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: ['error'] });
    expect(error.isOperational).toBe(true);
    expect(error.stack).toBeDefined();
  });

  it('should convert to JSON response', () => {
    const error = new AppError(ErrorCode.NOT_FOUND, 'Not found', 404);
    const json = error.toJSON('req-123');

    expect(json).toEqual({
      success: false,
      error: 'Not found',
      code: ErrorCode.NOT_FOUND,
      message: 'Not found',
      requestId: 'req-123',
      timestamp: expect.any(String),
    });
  });
});

describe('Specific Error Classes', () => {
  it('UnauthorizedError should have correct defaults', () => {
    const error = new UnauthorizedError();
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication required');
  });

  it('ForbiddenError should have correct defaults', () => {
    const error = new ForbiddenError();
    expect(error.code).toBe(ErrorCode.FORBIDDEN);
    expect(error.statusCode).toBe(403);
  });

  it('NotFoundError should format message with resource', () => {
    const error = new NotFoundError('User', '123');
    expect(error.message).toBe("User with id '123' not found");
    expect(error.statusCode).toBe(404);
  });

  it('NotFoundError should handle missing id', () => {
    const error = new NotFoundError('User');
    expect(error.message).toBe('User not found');
  });

  it('ValidationError should store details', () => {
    const details = { email: ['Invalid format'], password: ['Too short'] };
    const error = new ValidationError(details);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.details).toEqual(details);
    expect(error.statusCode).toBe(400);
  });

  it('ConflictError should have correct defaults', () => {
    const error = new ConflictError('Resource already exists');
    expect(error.code).toBe(ErrorCode.CONFLICT);
    expect(error.statusCode).toBe(409);
  });

  it('RateLimitError should have correct defaults', () => {
    const error = new RateLimitError();
    expect(error.code).toBe(ErrorCode.TOO_MANY_REQUESTS);
    expect(error.statusCode).toBe(429);
  });

  it('DatabaseError should be non-operational', () => {
    const error = new DatabaseError();
    expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(error.isOperational).toBe(false);
    expect(error.statusCode).toBe(500);
  });

  it('InternalError should be non-operational', () => {
    const error = new InternalError();
    expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(error.isOperational).toBe(false);
  });
});
