/**
 * Database connection tests
 */
const { healthCheck, query, transaction, runMigrations } = require('../src/database');

describe('Database', () => {
  beforeAll(async () => {
    // Ensure migrations are run
    await runMigrations();
  });

  describe('healthCheck', () => {
    it('should return true when connected', async () => {
      const result = await healthCheck();
      expect(result).toBe(true);
    });
  });

  describe('query', () => {
    it('should execute simple query', async () => {
      const result = await query('SELECT 1 as num');
      expect(result.rows[0].num).toBe(1);
    });

    it('should execute query with parameters', async () => {
      const result = await query('SELECT $1::int as num, $2::text as str', [42, 'test']);
      expect(result.rows[0].num).toBe(42);
      expect(result.rows[0].str).toBe('test');
    });
  });

  describe('transaction', () => {
    it('should commit successful transaction', async () => {
      const result = await transaction(async (client) => {
        const { rows } = await client.query('SELECT 1 as num');
        return rows[0].num;
      });
      expect(result).toBe(1);
    });

    it('should rollback failed transaction', async () => {
      await expect(
        transaction(async (client) => {
          await client.query('SELECT 1');
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });
});
