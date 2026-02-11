/**
 * Test Agent - For End-to-End Testing
 * 
 * This agent is designed for automated testing:
 * - Connects to the server
 * - Joins matchmaking queue
 * - Makes intelligent decisions during gameplay
 * - Reports results
 * 
 * Usage: node examples/test-agent.js --name="TestAgent" --apiKey="xxx" --secret="xxx"
 */

const AgentArena = require('../sdk');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.replace(/^--/, '')] = value.replace(/^["']|["']$/g, '');
  }
  return acc;
}, {});

// Configuration
const config = {
  apiKey: args.apiKey || process.env.AGENT_API_KEY || 'pk_test_agent_001',
  secret: args.secret || process.env.AGENT_SECRET || 'sk_test_secret_001',
  name: args.name || `TestAgent_${Date.now()}`,
  serverUrl: args.serverUrl || process.env.SERVER_URL || 'http://localhost:3000',
  wsUrl: args.wsUrl || process.env.WS_URL || 'ws://localhost:3000',
  gameType: args.gameType || 'astro-mining',
  level: args.level || 'beginner'
};

// Statistics
const stats = {
  connected: false,
  roomJoined: false,
  gameStarted: false,
  actionsSent: 0,
  gameEnded: false,
  winner: null,
  startTime: null,
  endTime: null
};

// Create agent instance
const agent = new AgentArena({
  apiKey: config.apiKey,
  secret: config.secret,
  serverUrl: config.serverUrl,
  wsUrl: config.wsUrl
});

/**
 * Advanced decision making strategy
 */
function makeDecision(gameState) {
  const me = gameState.players.find(p => p.id === agent.agentId);
  if (!me) return null;

  const availableActions = gameState.availableActions || [];
  
  // Priority 1: Mine resources if on a resource tile
  const mineAction = availableActions.find(a => a.type === 'mine');
  if (mineAction) {
    return { type: 'mine' };
  }

  // Priority 2: Build miners to increase production
  const buildMiner = availableActions.find(a => a.type === 'build' && a.unitType === 'miner');
  if (buildMiner && me.resources?.minerals >= 200) {
    return { type: 'build', unitType: 'miner' };
  }

  // Priority 3: Build warships for defense/offense
  const buildWarship = availableActions.find(a => a.type === 'build' && a.unitType === 'warship');
  if (buildWarship && me.resources?.minerals >= 300 && me.resources?.gas >= 100) {
    return { type: 'build', unitType: 'warship' };
  }

  // Priority 4: Attack nearby enemies if we have warships
  const attackAction = availableActions.find(a => a.type === 'attack');
  if (attackAction && me.fleet?.warships > 0) {
    return { type: 'attack', targetId: attackAction.targetId };
  }

  // Priority 5: Scout to reveal more of the map
  const scoutAction = availableActions.find(a => a.type === 'scout');
  if (scoutAction && me.fleet?.scouts > 0) {
    return { type: 'scout' };
  }

  // Priority 6: Move towards resources or base
  const moveActions = availableActions.filter(a => a.type === 'move');
  if (moveActions.length > 0) {
    // Prefer moving towards center or unexplored areas
    const randomMove = moveActions[Math.floor(Math.random() * moveActions.length)];
    return { type: 'move', direction: randomMove.direction };
  }

  return null;
}

/**
 * Print formatted game state
 */
function printGameState(state) {
  const me = state.players.find(p => p.id === agent.agentId);
  if (!me) return;

  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│           GAME STATE                    │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│ Time: ${String(state.timeRemaining).padStart(3)}s remaining              │`);
  console.log('├─────────────────────────────────────────┤');
  console.log(`│ Resources: ${me.resources?.minerals || 0} minerals, ${me.resources?.gas || 0} gas    │`);
  console.log(`│ Fleet: ${me.fleet?.miners || 0} miners, ${me.fleet?.warships || 0} warships, ${me.fleet?.scouts || 0} scouts  │`);
  console.log(`│ Position: (${me.position?.x}, ${me.position?.y})                     │`);
  console.log('└─────────────────────────────────────────┘');
}

// Event: Connected
agent.on('connected', () => {
  stats.connected = true;
  console.log('✅ [TestAgent] Connected to server');
});

// Event: Room Joined
agent.on('roomJoined', (room) => {
  stats.roomJoined = true;
  console.log(`✅ [TestAgent] Joined room: ${room.id}`);
  console.log(`   Game Type: ${room.gameType || config.gameType}`);
  console.log(`   Players: ${room.players?.length || 0}`);
  
  // Auto-ready
  agent.ready().then(() => {
    console.log('✅ [TestAgent] Marked as ready');
  }).catch(err => {
    console.error('❌ [TestAgent] Failed to ready:', err.message);
  });
});

// Event: Game Started
agent.on('gameStarted', (data) => {
  stats.gameStarted = true;
  stats.startTime = Date.now();
  console.log('\n🎮 [TestAgent] GAME STARTED!');
  console.log(`   Duration: ${data.duration} seconds`);
  console.log(`   Players: ${data.players.map(p => p.name).join(', ')}`);
  console.log(`   Map Size: ${data.initialState?.map?.size}x${data.initialState?.map?.size}`);
});

// Event: Game Tick
agent.on('gameTick', (data) => {
  const state = data.state;
  
  // Print state every 10 seconds
  if (data.timeRemaining % 10 === 0) {
    printGameState(state);
  }
  
  // Make and execute decision
  const action = makeDecision(state);
  if (action) {
    stats.actionsSent++;
    agent.sendAction(action);
    console.log(`⚡ Action: ${action.type}${action.direction ? ' ' + action.direction : ''}${action.unitType ? ' ' + action.unitType : ''}`);
  }
});

// Event: Game Ended
agent.on('gameEnded', (data) => {
  stats.gameEnded = true;
  stats.endTime = Date.now();
  stats.winner = data.winnerId;
  
  const isWinner = data.winnerId === agent.agentId;
  const duration = stats.endTime - stats.startTime;
  
  console.log('\n🏁 [TestAgent] GAME ENDED!');
  console.log(`   Result: ${isWinner ? '🏆 VICTORY!' : (data.winnerId ? '💔 Defeat' : '🤝 Draw')}`);
  console.log(`   Duration: ${Math.floor(duration / 1000)}s`);
  console.log(`   Actions Sent: ${stats.actionsSent}`);
  
  // Print summary
  printSummary();
  
  // Exit after a delay
  setTimeout(() => {
    agent.disconnect();
    process.exit(isWinner ? 0 : 1);
  }, 2000);
});

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║           TEST SUMMARY                    ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║ Connected:      ${stats.connected ? '✅' : '❌'}                     ║`);
  console.log(`║ Room Joined:    ${stats.roomJoined ? '✅' : '❌'}                     ║`);
  console.log(`║ Game Started:   ${stats.gameStarted ? '✅' : '❌'}                     ║`);
  console.log(`║ Game Ended:     ${stats.gameEnded ? '✅' : '❌'}                     ║`);
  console.log(`║ Actions Sent:   ${String(stats.actionsSent).padStart(3)}                    ║`);
  console.log(`║ Winner:         ${stats.winner === agent.agentId ? '✅ Self' : (stats.winner ? '❌ Other' : '🤝 Draw')}              ║`);
  console.log('╚═══════════════════════════════════════════╝');
}

/**
 * Main test flow
 */
async function main() {
  console.log('\n🤖 [TestAgent] Starting Test Agent...');
  console.log(`   Name: ${config.name}`);
  console.log(`   Server: ${config.serverUrl}`);
  console.log(`   Game: ${config.gameType}:${config.level}`);

  try {
    // Step 1: Connect and authenticate
    console.log('\n📡 [TestAgent] Connecting...');
    const agentInfo = await agent.connect();
    console.log(`✅ Connected as: ${agentInfo.name}`);
    console.log(`   Balance: ${agentInfo.balance} credits`);
    console.log(`   ELO: ${agentInfo.elo} (${agentInfo.rank})`);

    // Step 2: Join matchmaking queue
    console.log(`\n🎯 [TestAgent] Joining ${config.gameType}:${config.level} queue...`);
    const queueResult = await agent.joinQueue(config.gameType, config.level);
    console.log(`✅ Queue position: ${queueResult.queuePosition}`);

    // Step 3: Connect WebSocket for real-time updates
    console.log('\n🔌 [TestAgent] Connecting WebSocket...');
    agent.connectWebSocket();

    // Step 4: Wait for game to complete (max 15 minutes)
    console.log('\n⏳ [TestAgent] Waiting for game to complete...');
    console.log('   (Timeout: 15 minutes)');
    
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('\n⏰ [TestAgent] Timeout after 15 minutes');
        resolve();
      }, 15 * 60 * 1000);

      // Check every second if game ended
      const checkInterval = setInterval(() => {
        if (stats.gameEnded) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });

    if (!stats.gameEnded) {
      console.log('\n❌ [TestAgent] Game did not complete in time');
      printSummary();
      agent.disconnect();
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ [TestAgent] Error:', error.message);
    console.error(error.stack);
    agent.disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [TestAgent] Shutting down...');
  agent.disconnect();
  process.exit(0);
});

// Run
main();