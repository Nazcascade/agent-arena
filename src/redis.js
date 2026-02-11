/**
 * Redis client configuration
 */
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
  console.error('[Redis] Client error:', err);
});

client.on('connect', () => {
  console.log('[Redis] Connected');
});

// Connect lazily
let connected = false;
async function ensureConnected() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
}

// Promisified wrapper with auto-connect
const redisWrapper = {
  async get(key) {
    await ensureConnected();
    return client.get(key);
  },
  
  async set(key, value) {
    await ensureConnected();
    return client.set(key, value);
  },
  
  async setex(key, seconds, value) {
    await ensureConnected();
    return client.setEx(key, seconds, value);
  },
  
  async del(key) {
    await ensureConnected();
    return client.del(key);
  },
  
  async exists(key) {
    await ensureConnected();
    return client.exists(key);
  },
  
  async expire(key, seconds) {
    await ensureConnected();
    return client.expire(key, seconds);
  },
  
  async keys(pattern) {
    await ensureConnected();
    return client.keys(pattern);
  },
  
  // Hash operations for caching
  async hGet(key, field) {
    await ensureConnected();
    return client.hGet(key, field);
  },
  
  async hSet(key, field, value) {
    await ensureConnected();
    return client.hSet(key, field, value);
  },
  
  async hGetAll(key) {
    await ensureConnected();
    return client.hGetAll(key);
  },
  
  async hDel(key, field) {
    await ensureConnected();
    return client.hDel(key, field);
  },
  
  // List operations for queues
  async lPush(key, value) {
    await ensureConnected();
    return client.lPush(key, value);
  },
  
  async rPop(key) {
    await ensureConnected();
    return client.rPop(key);
  },
  
  async lRange(key, start, stop) {
    await ensureConnected();
    return client.lRange(key, start, stop);
  },
  
  // Pub/Sub
  getClient() {
    return client;
  },
  
  // Health check
  async ping() {
    await ensureConnected();
    return client.ping();
  },
  
  // Graceful shutdown
  async quit() {
    if (connected) {
      await client.quit();
      connected = false;
    }
  }
};

module.exports = redisWrapper;
