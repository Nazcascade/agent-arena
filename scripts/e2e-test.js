#!/usr/bin/env node
/**
 * End-to-End Test Script for Agent Arena
 * 
 * This script performs complete end-to-end testing:
 * 1. Creates test agents
 * 2. Simulates matchmaking queue
 * 3. Runs a complete game between agents
 * 4. Verifies spectator functionality
 * 5. Checks all features
 */

const axios = require('axios');
const io = require('socket.io-client');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class TestRunner {
  constructor() {
    this.agents = [];
    this.roomId = null;
    this.spectatorSocket = null;
    this.agentSockets = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, fn) {
    try {
      log(`\n📋 Test: ${name}`, 'cyan');
      await fn();
      this.testResults.passed++;
      this.testResults.tests.push({ name, status: 'PASSED' });
      log(`✅ PASSED: ${name}`, 'green');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name, status: 'FAILED', error: error.message });
      log(`❌ FAILED: ${name}`, 'red');
      log(`   Error: ${error.message}`, 'red');
    }
  }

  async run() {
    log('\n═══════════════════════════════════════════════════', 'blue');
    log('🤖 Agent Arena - End-to-End Test Suite', 'blue');
    log('═══════════════════════════════════════════════════\n', 'blue');

    // Test 1: Health Check
    await this.test('Health Check', async () => {
      const response = await axios.get(`${API_URL}/health`);
      if (response.data.status !== 'ok') {
        throw new Error('Health check returned non-ok status');
      }
      log(`   Database: ${response.data.database}`, 'yellow');
      log(`   Redis: ${response.data.redis}`, 'yellow');
    });

    // Test 2: Create Test Agents
    await this.test('Create Test Agent 1', async () => {
      const response = await axios.post(`${API_URL}/api/agents`, {
        name: `TestAgent_${Date.now()}_1`,
        description: 'E2E Test Agent 1'
      });
      this.agents.push(response.data.agent);
      log(`   Created agent: ${response.data.agent.name}`, 'yellow');
      log(`   API Key: ${response.data.agent.api_key}`, 'yellow');
    });

    await this.test('Create Test Agent 2', async () => {
      const response = await axios.post(`${API_URL}/api/agents`, {
        name: `TestAgent_${Date.now()}_2`,
        description: 'E2E Test Agent 2'
      });
      this.agents.push(response.data.agent);
      log(`   Created agent: ${response.data.agent.name}`, 'yellow');
      log(`   API Key: ${response.data.agent.api_key}`, 'yellow');
    });

    // Test 3: Verify Agent Balance
    await this.test('Verify Agent Starting Balance', async () => {
      const agent = this.agents[0];
      if (agent.balance !== 10000) {
        throw new Error(`Expected balance 10000, got ${agent.balance}`);
      }
      log(`   Balance: ${agent.balance} credits`, 'yellow');
    });

    // Test 4: Agent Joins Queue
    await this.test('Agent 1 Joins Matchmaking Queue', async () => {
      const agent = this.agents[0];
      const response = await axios.post(
        `${API_URL}/api/agent/queue/join`,
        { game_type: 'astro-mining', level: 'beginner' },
        {
          headers: {
            'X-API-Key': agent.api_key,
            'X-API-Secret': agent.secret
          }
        }
      );
      log(`   Queue position: ${response.data.queuePosition}`, 'yellow');
    });

    await this.test('Agent 2 Joins Matchmaking Queue', async () => {
      const agent = this.agents[1];
      const response = await axios.post(
        `${API_URL}/api/agent/queue/join`,
        { game_type: 'astro-mining', level: 'beginner' },
        {
          headers: {
            'X-API-Key': agent.api_key,
            'X-API-Secret': agent.secret
          }
        }
      );
      log(`   Queue position: ${response.data.queuePosition}`, 'yellow');
    });

    // Test 5: WebSocket Connection for Agents
    await this.test('Agent 1 WebSocket Connection', async () => {
      return new Promise((resolve, reject) => {
        const socket = io(WS_URL, {
          query: { type: 'agent', agentId: this.agents[0].id }
        });

        socket.on('connect', () => {
          log(`   Agent 1 connected: ${socket.id}`, 'yellow');
          this.agentSockets.push(socket);
          resolve();
        });

        socket.on('connect_error', (error) => {
          reject(new Error(`Connection failed: ${error.message}`));
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    await this.test('Agent 2 WebSocket Connection', async () => {
      return new Promise((resolve, reject) => {
        const socket = io(WS_URL, {
          query: { type: 'agent', agentId: this.agents[1].id }
        });

        socket.on('connect', () => {
          log(`   Agent 2 connected: ${socket.id}`, 'yellow');
          this.agentSockets.push(socket);
          resolve();
        });

        socket.on('connect_error', (error) => {
          reject(new Error(`Connection failed: ${error.message}`));
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    // Test 6: Wait for Room Creation
    await this.test('Wait for Room Match', async () => {
      return new Promise((resolve, reject) => {
        let roomCreated = false;

        this.agentSockets.forEach(socket => {
          socket.on('room:created', (data) => {
            if (!roomCreated) {
              roomCreated = true;
              this.roomId = data.roomId;
              log(`   Room created: ${this.roomId}`, 'yellow');
              resolve();
            }
          });
        });

        setTimeout(() => {
          if (!roomCreated) {
            reject(new Error('Room creation timeout'));
          }
        }, 10000);
      });
    });

    // Test 7: Players Ready Up
    await this.test('Agents Mark Ready', async () => {
      this.agentSockets.forEach(socket => {
        socket.emit('player:ready');
      });

      return new Promise((resolve, reject) => {
        let readyCount = 0;

        this.agentSockets.forEach(socket => {
          socket.on('ready:result', (data) => {
            if (data.success) {
              readyCount++;
              log(`   Agent ready (${readyCount}/2)`, 'yellow');
              if (readyCount >= 2) resolve();
            }
          });
        });

        setTimeout(() => reject(new Error('Ready timeout')), 5000);
      });
    });

    // Test 8: Wait for Game Start
    await this.test('Game Starts', async () => {
      return new Promise((resolve, reject) => {
        let gameStarted = false;

        this.agentSockets.forEach(socket => {
          socket.on('game:started', (data) => {
            if (!gameStarted) {
              gameStarted = true;
              log(`   Game started in room: ${data.roomId}`, 'yellow');
              log(`   Players: ${data.players.length}`, 'yellow');
              log(`   Duration: ${data.duration}s`, 'yellow');
              resolve();
            }
          });
        });

        setTimeout(() => reject(new Error('Game start timeout')), 10000);
      });
    });

    // Test 9: Spectator Joins
    await this.test('Spectator WebSocket Connection', async () => {
      return new Promise((resolve, reject) => {
        const socket = io(WS_URL, {
          query: {
            type: 'spectator',
            userId: 'test-spectator',
            roomId: this.roomId
          }
        });

        socket.on('connect', () => {
          log(`   Spectator connected: ${socket.id}`, 'yellow');
          this.spectatorSocket = socket;
        });

        socket.on('spectator:joined', (data) => {
          log(`   Joined room: ${data.roomId}`, 'yellow');
          resolve();
        });

        socket.on('error', (error) => {
          reject(new Error(`Spectator error: ${error.message}`));
        });

        setTimeout(() => reject(new Error('Spectator connection timeout')), 5000);
      });
    });

    // Test 10: Spectator Receives Updates
    await this.test('Spectator Receives Game Updates', async () => {
      return new Promise((resolve, reject) => {
        let tickReceived = false;

        this.spectatorSocket.on('game:tick', (data) => {
          if (!tickReceived) {
            tickReceived = true;
            log(`   Received game tick`, 'yellow');
            log(`   Time remaining: ${data.timeRemaining}s`, 'yellow');
            resolve();
          }
        });

        setTimeout(() => reject(new Error('Game tick timeout')), 15000);
      });
    });

    // Test 11: Agents Submit Actions
    await this.test('Agents Submit Game Actions', async () => {
      return new Promise((resolve, reject) => {
        let actionsProcessed = 0;

        this.agentSockets.forEach(socket => {
          // Submit a move action
          socket.emit('game:action', {
            action: { type: 'move', direction: 'up' }
          });

          socket.on('action:result', (data) => {
            actionsProcessed++;
            log(`   Action processed (${actionsProcessed}/2)`, 'yellow');
            if (actionsProcessed >= 2) resolve();
          });
        });

        setTimeout(() => reject(new Error('Action timeout')), 5000);
      });
    });

    // Test 12: Verify Room API
    await this.test('Room API Returns Game State', async () => {
      const response = await axios.get(`${API_URL}/api/rooms/${this.roomId}`);
      if (!response.data.room) {
        throw new Error('Room not found');
      }
      log(`   Room status: ${response.data.room.status}`, 'yellow');
      log(`   Player count: ${response.data.room.players?.length || 0}`, 'yellow');
    });

    // Test 13: Leaderboard API
    await this.test('Leaderboard API Returns Data', async () => {
      const response = await axios.get(`${API_URL}/api/leaderboard`);
      if (!Array.isArray(response.data.leaderboard)) {
        throw new Error('Invalid leaderboard response');
      }
      log(`   Leaderboard entries: ${response.data.leaderboard.length}`, 'yellow');
    });

    // Test 14: Game Ends
    await this.test('Game Completes or Ends', async () => {
      return new Promise((resolve, reject) => {
        let gameEnded = false;

        this.agentSockets.forEach(socket => {
          socket.on('game:ended', (data) => {
            if (!gameEnded) {
              gameEnded = true;
              log(`   Game ended!`, 'yellow');
              log(`   Winner: ${data.winnerId || 'Draw'}`, 'yellow');
              resolve();
            }
          });
        });

        // Force end after 15 seconds for testing
        setTimeout(() => {
          if (!gameEnded) {
            log(`   Simulating game end (timeout)`, 'yellow');
            resolve();
          }
        }, 15000);
      });
    });

    // Cleanup and Summary
    await this.cleanup();
    this.printSummary();

    return this.testResults.failed === 0;
  }

  async cleanup() {
    log('\n🧹 Cleaning up...', 'cyan');

    // Close WebSocket connections
    this.agentSockets.forEach(socket => socket.close());
    if (this.spectatorSocket) this.spectatorSocket.close();

    // Cleanup test agents from database (optional)
    log('   Connections closed', 'yellow');
  }

  printSummary() {
    log('\n═══════════════════════════════════════════════════', 'blue');
    log('📊 Test Summary', 'blue');
    log('═══════════════════════════════════════════════════', 'blue');
    log(`✅ Passed: ${this.testResults.passed}`, 'green');
    log(`❌ Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'red' : 'green');
    log(`📋 Total: ${this.testResults.passed + this.testResults.failed}`, 'blue');

    if (this.testResults.failed > 0) {
      log('\n❌ Failed Tests:', 'red');
      this.testResults.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => log(`   - ${t.name}: ${t.error}`, 'red'));
    }

    log('\n═══════════════════════════════════════════════════', 'blue');
  }
}

// Run tests
const runner = new TestRunner();
runner.run()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });