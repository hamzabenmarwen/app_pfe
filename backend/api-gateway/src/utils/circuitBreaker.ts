/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when services are unavailable
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Service unavailable, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold: number;      // Failures before opening circuit
  resetTimeout: number;          // Time before attempting reset (ms)
  halfOpenMaxCalls: number;      // Test calls in half-open state
  successThreshold: number;      // Successes needed to close circuit
}

interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  totalCalls: number;
  rejectedCalls: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private halfOpenCalls: number = 0;
  private totalCalls: number = 0;
  private rejectedCalls: number = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly serviceName: string,
    options?: Partial<CircuitBreakerOptions>
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenMaxCalls: 3,
      successThreshold: 2,
      ...options,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        this.rejectedCalls++;
        throw new CircuitBreakerError(
          `Service '${this.serviceName}' is unavailable. Circuit breaker is OPEN.`
        );
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
        this.rejectedCalls++;
        throw new CircuitBreakerError(
          `Service '${this.serviceName}' is being tested. Too many half-open calls.`
        );
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    console.log(`[CircuitBreaker] ${this.serviceName} manually reset to CLOSED`);
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.transitionToClosed();
      }
    } else {
      // In closed state, reset failures on success
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.failures >= this.options.failureThreshold) {
      this.transitionToOpen();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.halfOpenCalls = 0;
    this.successes = 0;
    console.warn(`[CircuitBreaker] ${this.serviceName} circuit OPENED due to ${this.failures} failures`);
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenCalls = 0;
    this.successes = 0;
    console.log(`[CircuitBreaker] ${this.serviceName} circuit HALF-OPEN, testing service...`);
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.halfOpenCalls = 0;
    this.successes = 0;
    console.log(`[CircuitBreaker] ${this.serviceName} circuit CLOSED, service recovered`);
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  getOrCreate(
    serviceName: string,
    options?: Partial<CircuitBreakerOptions>
  ): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, options));
    }
    return this.breakers.get(serviceName)!;
  }

  getMetrics(): Record<string, ReturnType<CircuitBreaker['getMetrics']>> {
    const metrics: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }

  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  reset(serviceName: string): void {
    this.breakers.get(serviceName)?.reset();
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
