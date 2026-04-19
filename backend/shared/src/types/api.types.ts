export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: FieldValidationError[];
}

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
