import { Response } from 'express';
import { RequestWithId } from '../middleware/requestId.middleware';
import { AppError } from '../errors/AppError';

/**
 * Base controller providing common response methods and error handling
 */
export abstract class BaseController {
  /**
   * Send success response
   */
  protected ok<T>(res: Response, data: T, message?: string): void {
    res.status(200).json({
      success: true,
      data,
      message,
    });
  }

  /**
   * Send created response
   */
  protected created<T>(res: Response, data: T, message?: string): void {
    res.status(201).json({
      success: true,
      data,
      message: message || 'Resource created successfully',
    });
  }

  /**
   * Send no content response
   */
  protected noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Send paginated response
   */
  protected paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
  ): void {
    res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Get request ID for logging/tracing
   */
  protected getRequestId(req: RequestWithId): string | undefined {
    return req.requestId;
  }

  /**
   * Handle async operations with automatic error catching
   */
  protected async handle<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }
}
