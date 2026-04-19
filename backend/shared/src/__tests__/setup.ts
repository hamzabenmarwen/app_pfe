/**
 * Jest setup file - runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-for-production-min-32-char';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production-min-32-char';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
