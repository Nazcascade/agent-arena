/**
 * Database migration script
 */
const { runMigrations, healthCheck } = require('../src/database');

async function main() {
  console.log('=== Agent Arena Database Migration ===\n');
  
  try {
    // Check connection
    console.log('Checking database connection...');
    const healthy = await healthCheck();
    if (!healthy) {
      console.error('❌ Database connection failed');
      console.log('\nMake sure PostgreSQL is running:');
      console.log('  docker-compose up -d postgres');
      process.exit(1);
    }
    
    // Run migrations
    console.log('\nRunning migrations...\n');
    await runMigrations();
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
