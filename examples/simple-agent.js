/**
 * 示例 Agent 客户端
 * 
 * 运行方式:
 * node examples/simple-agent.js
 */
const AgentArena = require('../sdk');

// 创建 Agent 实例
const agent = new AgentArena({
  apiKey: 'test_key_001',
  secret: 'test_secret_001',
  serverUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000'
});

// 简单的决策逻辑
function makeDecision(gameState) {
  const me = gameState.players.find(p => p.id === agent.agentId);
  if (!me) return null;

  // 简单的策略：优先采矿，有资源就造矿工
  const availableActions = gameState.availableActions || [];
  
  // 如果在矿点上，采矿
  const mineAction = availableActions.find(a => a.type === 'mine');
  if (mineAction) {
    return { type: 'mine' };
  }

  // 如果有资源，造矿工
  const buildMiner = availableActions.find(a => a.type === 'build' && a.unitType === 'miner');
  if (buildMiner) {
    return { type: 'build', unitType: 'miner' };
  }

  // 否则随机移动
  const moveActions = availableActions.filter(a => a.type === 'move');
  if (moveActions.length > 0) {
    const randomMove = moveActions[Math.floor(Math.random() * moveActions.length)];
    return { type: 'move', direction: randomMove.direction };
  }

  return null;
}

// 事件监听
agent.on('connected', () => {
  console.log('[Agent] 已连接到服务器');
});

agent.on('roomJoined', (room) => {
  console.log('[Agent] 加入房间:', room.id);
  // 自动准备
  agent.ready().then(() => {
    console.log('[Agent] 已准备就绪');
  });
});

agent.on('gameStarted', (data) => {
  console.log('[Agent] 游戏开始!');
  console.log('  对手:', data.players.filter(p => p.id !== agent.agentId).map(p => p.name));
});

agent.on('gameTick', (data) => {
  const state = data.state;
  console.log(`[Agent] Tick - 剩余时间: ${data.timeRemaining}秒`);
  
  // 做出决策
  const action = makeDecision(state);
  if (action) {
    console.log('[Agent] 执行动作:', action);
    agent.sendAction(action);
  }
});

agent.on('gameEnded', (data) => {
  console.log('[Agent] 游戏结束!');
  console.log('  获胜者:', data.winnerId === agent.agentId ? '我!' : data.winnerId);
  agent.disconnect();
  process.exit(0);
});

// 主流程
async function main() {
  try {
    // 连接
    const myInfo = await agent.connect();
    console.log(`[Agent] 登录成功: ${myInfo.name}, 余额: ${myInfo.balance}`);

    // 加入队列
    await agent.joinQueue('astro-mining', 'bronze');

    // 连接 WebSocket
    agent.connectWebSocket();

    // 等待游戏结束
    await new Promise(resolve => setTimeout(resolve, 120000)); // 2分钟超时
    
    console.log('[Agent] 超时退出');
    agent.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('[Agent] 错误:', error.message);
    process.exit(1);
  }
}

main();
