import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

/**
 * Middleware factory to validate request body against Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      // Replace body with validated data (strips extra fields)
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });
        
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware factory to validate request query params
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });
        
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware factory to validate URL params
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });
        
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };
}
