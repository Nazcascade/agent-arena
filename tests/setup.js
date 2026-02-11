/**
 * Test setup
 */
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://agent_arena:arena_secret_2024@localhost:5432/agent_arena_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

// Mock console.log during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}
