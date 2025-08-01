import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ApiError } from '@monorepo/shared-types';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err);

  let statusCode = 500;
  let apiError: ApiError = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    apiError = {
      code: err.code,
      message: err.message,
      details: err.details
    };
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    apiError = {
      code: 'VALIDATION_ERROR',
      message: err.message
    };
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    apiError = {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    };
  }

  const response: ApiResponse<never> = {
    success: false,
    error: apiError,
    meta: {
      timestamp: new Date(),
      requestId: `req-${Date.now()}`
    }
  };

  res.status(statusCode).json(response);
};