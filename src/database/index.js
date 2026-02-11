/**
 * Database configuration and connection pool
 */
const { Pool } = require('pg');

// Database configuration
const config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://agent_arena:arena_secret_2024@localhost:5432/agent_arena',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create pool instance
const pool = new Pool(config);

// Handle pool errors
pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err);
});

/**
 * Execute a single query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[Database] Query executed', { 
      query: text.substring(0, 50) + (text.length > 50 ? '...' : ''), 
      duration: `${duration}ms`,
      rows: result.rowCount 
    });
    return result;
  } catch (error) {
    console.error('[Database] Query error:', { query: text.substring(0, 100), error: error.message });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<PoolClient>}
 */
async function getClient() {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);
  
  // Override release to log
  client.release = () => {
    console.log('[Database] Client released back to pool');
    originalRelease();
  };
  
  return client;
}

/**
 * Execute a transaction
 * @param {Function} callback - Async function receiving client
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Database] Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection
 * @returns {Promise<boolean>}
 */
async function healthCheck() {
  try {
    const result = await query('SELECT NOW() as time');
    console.log('[Database] Connected, server time:', result.rows[0].time);
    return true;
  } catch (error) {
    console.error('[Database] Health check failed:', error.message);
    return false;
  }
}

/**
 * Run migrations from SQL files
 */
async function runMigrations() {
  const fs = require('fs');
  const path = require('path');
  
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  // Create migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  
  // Get list of executed migrations
  const { rows: executed } = await query('SELECT filename FROM migrations ORDER BY id');
  const executedFiles = new Set(executed.map(r => r.filename));
  
  // Read migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of files) {
    if (executedFiles.has(file)) {
      console.log(`[Migration] Skipping ${file} (already executed)`);
      continue;
    }
    
    console.log(`[Migration] Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    await transaction(async (client) => {
      await client.query(sql);
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      );
    });
    
    console.log(`[Migration] ${file} completed`);
  }
  
  console.log('[Migration] All migrations up to date');
}

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  healthCheck,
  runMigrations
};
