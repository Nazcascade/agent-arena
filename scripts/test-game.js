/**
 * 游戏逻辑测试
 */
const AstroMiningGame = require('../src/games/AstroMiningGame');

console.log('=== Agent Arena 游戏测试 ===\n');

// 创建测试玩家
const players = [
  { id: 'agent_001', name: 'AlphaBot' },
  { id: 'agent_002', name: 'BetaBot' }
];

// 创建游戏实例
const game = new AstroMiningGame('test-room-001', players, {
  mapSize: 8,
  duration: 60 // 1分钟测试
});

console.log('✓ 游戏实例创建成功');
console.log(`  - 玩家数: ${players.length}`);
console.log(`  - 地图大小: ${game.mapSize}x${game.mapSize}`);
console.log(`  - 游戏时长: ${game.duration}秒`);

// 查看初始状态
const initialState = game.getPublicState();
console.log('\n✓ 初始状态:');
console.log(`  - 玩家初始资源:`, initialState.players.map(p => `${p.name}: ${p.resources.minerals}矿/${p.resources.gas}气`));
console.log(`  - 初始舰队:`, initialState.players[0].fleet);

// 测试动作
console.log('\n=== 测试游戏动作 ===');

// Agent 1 移动
let result = game.processAction('agent_001', { type: 'move', direction: 'right' });
console.log(`\n✓ Agent 1 向右移动: ${result.success ? '成功' : '失败'}`);

// Agent 1 采矿 (应该失败，因为不在矿点上)
result = game.processAction('agent_001', { type: 'mine' });
console.log(`✓ Agent 1 尝试采矿: ${result.success ? '成功' : '失败'}`);
if (!result.success) console.log(`  原因: ${result.error}`);

// 查看可用动作
const playerState = game.playerStates.get('agent_001');
const availableActions = game.getAvailableActions('agent_001');
console.log(`\n✓ Agent 1 可用动作 (${availableActions.length}个):`);
availableActions.forEach((action, i) => {
  console.log(`  ${i + 1}. ${action.type}${action.direction ? ` (${action.direction})` : ''}`);
});

// 开始游戏 (但不启动定时器，手动 tick)
game.start();
console.log('\n✓ 游戏开始！');

// 模拟几个 tick
console.log('\n=== 模拟游戏进程 ===');
for (let i = 0; i < 5; i++) {
  game.gameLoop();
  console.log(`Tick ${i + 1}: 剩余时间 ${game.timeRemaining}秒`);
}

console.log('\n✓ 测试完成！');
console.log('\n要启动完整服务器，请运行:');
console.log('  npm install');
console.log('  npm run dev');
