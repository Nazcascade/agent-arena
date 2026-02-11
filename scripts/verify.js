/**
 * Quick verification script for Agent Arena database integration
 */
const { healthCheck } = require('../src/database');
const redis = require('../src/redis');
const AgentService = require('../src/services/AgentService');
const EconomyService = require('../src/services/EconomyService');
const { Room, Agent } = require('../src/models');

async function verify() {
  console.log('🔍 Agent Arena Database Integration Verification\n');
  
  let exitCode = 0;
  
  try {
    // 1. Database Connection
    console.log('1️⃣  Testing Database Connection...');
    const dbOk = await healthCheck();
    if (dbOk) {
      console.log('   ✅ Database connected\n');
    } else {
      console.log('   ❌ Database connection failed\n');
      exitCode = 1;
    }
    
    // 2. Redis Connection
    console.log('2️⃣  Testing Redis Connection...');
    await redis.ping();
    console.log('   ✅ Redis connected\n');
    
    // 3. Agent Creation
    console.log('3️⃣  Testing Agent Creation...');
    const agent = await AgentService.createAgent({
      name: `VerifyAgent_${Date.now()}`,
      ownerId: '11111111-1111-1111-1111-111111111111'
    });
    console.log(`   ✅ Agent created: ${agent.name}`);
    console.log(`   📊 Initial balance: ${agent.balance}, ELO: ${agent.elo}\n`);
    
    // 4. Economy Operations
    console.log('4️⃣  Testing Economy Operations...');
    const { v4: uuidv4 } = require('uuid');
    
    // Freeze entry fee
    const freezeResult = await EconomyService.freezeEntryFee(agent.id, 100, uuidv4());
    if (freezeResult.success) {
      console.log(`   ✅ Entry fee frozen: 100`);
      console.log(`   💰 New balance: ${freezeResult.balanceAfter}\n`);
    } else {
      console.log(`   ❌ Failed to freeze entry fee: ${freezeResult.error}\n`);
      exitCode = 1;
    }
    
    // Award prize
    const awardResult = await EconomyService.awardPrize(agent.id, 500, uuidv4());
    if (awardResult.success) {
      console.log(`   ✅ Prize awarded: 500`);
      console.log(`   💰 New balance: ${awardResult.balanceAfter}\n`);
    } else {
      console.log(`   ❌ Failed to award prize\n`);
      exitCode = 1;
    }
    
    // 5. Room Operations
    console.log('5️⃣  Testing Room Operations...');
    const room = await Room.create({
      gameType: 'astro-mining',
      level: 'bronze',
      entryFee: 100
    });
    console.log(`   ✅ Room created: ${room.id}`);
    
    await Room.addPlayer(room.id, agent.id);
    console.log(`   ✅ Player added to room\n`);
    
    // 6. Stats Update
    console.log('6️⃣  Testing Stats Update...');
    await Agent.updateStats(agent.id, { won: true, eloDelta: 15 });
    const updatedAgent = await Agent.findById(agent.id);
    console.log(`   ✅ Stats updated`);
    console.log(`   📊 Wins: ${updatedAgent.wins}, ELO: ${updatedAgent.elo}, Rank: ${updatedAgent.rank}\n`);
    
    // 7. Leaderboard
    console.log('7️⃣  Testing Leaderboard Query...');
    const leaderboard = await Agent.getLeaderboard(10);
    console.log(`   ✅ Leaderboard retrieved: ${leaderboard.length} agents\n`);
    
    // 8. Cleanup
    console.log('8️⃣  Cleaning up test data...');
    const { query } = require('../src/database');
    await query('DELETE FROM transactions WHERE agent_id = $1', [agent.id]);
    await query('DELETE FROM room_players WHERE agent_id = $1', [agent.id]);
    await query('DELETE FROM rooms WHERE id = $1', [room.id]);
    await query('DELETE FROM agents WHERE id = $1', [agent.id]);
    console.log('   ✅ Test data cleaned\n');
    
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  ✅ All verifications passed!                  ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    exitCode = 1;
  } finally {
    await redis.quit();
  }
  
  process.exit(exitCode);
}

verify();
