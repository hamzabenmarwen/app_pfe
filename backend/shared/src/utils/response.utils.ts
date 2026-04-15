import { Response } from 'express';
import { ApiResponse, PaginatedResponse, Pagination } from '../types/api.types';

export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  error: string,
  statusCode = 400
): Response {
  const response: ApiResponse = {
    success: false,
    error,
  };
  return res.status(statusCode).json(response);
}

export function validationErrorResponse(
  res: Response,
  errors: { field: string; message: string }[]
): Response {
  const response: ApiResponse = {
    success: false,
    error: 'Validation failed',
    errors,
  };
  return res.status(400).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  pagination: Pagination
): Response {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination,
  };
  return res.status(200).json(response);
}

export function calculatePagination(
  page: number,
  limit: number,
  total: number
): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
