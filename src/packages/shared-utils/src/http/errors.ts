export class HttpApiError extends Error {
  constructor(
    message: string,
    public endpoint: string,
    public statusCode?: number,
    public responseData?: any,
    public attemptNumber?: number
  ) {
    super(message);
    this.name = 'HttpApiError';
    Object.setPrototypeOf(this, HttpApiError.prototype);
  }
}

export class NetworkError extends HttpApiError {
  constructor(message: string, endpoint: string, attemptNumber?: number) {
    super(message, endpoint, undefined, undefined, attemptNumber);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class AuthenticationError extends HttpApiError {
  constructor(message: string, endpoint: string, responseData?: any) {
    super(message, endpoint, 401, responseData);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class RateLimitError extends HttpApiError {
  constructor(message: string, endpoint: string, responseData?: any) {
    super(message, endpoint, 429, responseData);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class CircuitBreakerError extends HttpApiError {
  constructor(endpoint: string) {
    super(`Circuit breaker is open for endpoint: ${endpoint}`, endpoint);
    this.name = 'CircuitBreakerError';
    Object.setPrototypeOf(this, CircuitBreakerError.prototype);
  }
}