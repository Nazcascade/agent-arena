#!/bin/bash
# Agent Arena 快速启动脚本（本地测试 + ngrok 公网访问）
# 使用方法: ./quick-start.sh

set -e

echo "🚀 Agent Arena 快速启动脚本"
echo "============================="
echo ""
echo "此脚本将："
echo "  1. 启动本地后端服务 (端口 3000)"
echo "  2. 启动本地前端服务 (端口 5173)"
echo "  3. 使用 ngrok 暴露公网访问链接"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查 ngrok
if ! command -v ngrok &> /dev/null; then
echo "${YELLOW}⚠️  ngrok 未安装${NC}"
    echo ""
    echo "请选择安装方式:"
    echo "  1) macOS (Homebrew): brew install ngrok"
    echo "  2) 手动下载: https://ngrok.com/download"
    echo ""
    read -p "是否尝试自动安装 ngrok? (y/n): " INSTALL_NGROK
    
    if [ "$INSTALL_NGROK" = "y" ]; then
        if command -v brew &> /dev/null; then
            echo "正在使用 Homebrew 安装 ngrok..."
            brew install ngrok
        else
            echo "${RED}❌ 未检测到 Homebrew，请手动安装 ngrok${NC}"
            exit 1
        fi
    else
        echo "请安装 ngrok 后重新运行此脚本"
        exit 1
    fi
fi

# 检查 ngrok 是否已配置
if ! ngrok config check &> /dev/null; then
    echo "${YELLOW}⚠️  ngrok 未配置${NC}"
    echo ""
    echo "请到 https://dashboard.ngrok.com/get-started/your-authtoken 获取 token"
    read -p "输入你的 ngrok authtoken: " NGROK_TOKEN
    ngrok config add-authtoken "$NGROK_TOKEN"
fi

# 启动后端
echo ""
echo "📦 启动后端服务..."
cd "$(dirname "$0")"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}⚠️  正在安装后端依赖...${NC}"
    npm install
fi

# 启动后端（后台运行）
echo "${GREEN}✅ 启动后端服务 (端口 3000)${NC}"
node src/index.js &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 检查后端是否成功启动
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "${RED}❌ 后端启动失败${NC}"
    exit 1
fi

# 启动前端
echo ""
echo "📦 启动前端服务..."
cd frontend

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}⚠️  正在安装前端依赖...${NC}"
    npm install
fi

# 设置 API URL 为本地
export VITE_API_URL=http://localhost:3000

echo "${GREEN}✅ 启动前端服务 (端口 5173)${NC}"
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 5

# 检查前端是否成功启动
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "${RED}❌ 前端启动失败${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 启动 ngrok
echo ""
echo "🌐 启动 ngrok 公网访问..."
echo ""

# 创建 ngrok 配置文件
cat > /tmp/ngrok-agent-arena.yml << 'EOF'
version: "2"
authtoken: ""
tunnels:
  backend:
    proto: http
    addr: 3000
    domain: ""
  frontend:
    proto: http
    addr: 5173
    domain: ""
EOF

echo "${YELLOW}正在启动 ngrok...${NC}"
echo ""

# 启动 ngrok（前端）
ngrok http 5173 --log=stdout > /tmp/ngrok-frontend.log &
NGROK_FRONTEND_PID=$!

# 启动 ngrok（后端）
ngrok http 3000 --log=stdout > /tmp/ngrok-backend.log &
NGROK_BACKEND_PID=$!

# 等待 ngrok 启动
sleep 5

# 获取 ngrok URL
echo "${GREEN}✅ ngrok 已启动！${NC}"
echo ""
echo "============================="
echo "🔗 访问链接："
echo "============================="
echo ""

# 尝试获取 URL
FRONTEND_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1 || echo "")
BACKEND_URL=$(curl -s http://127.0.0.1:4041/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1 || echo "")

if [ -n "$FRONTEND_URL" ]; then
    echo "  🎮 前端: ${BLUE}${FRONTEND_URL}${NC}"
else
    echo "  🎮 前端: ${BLUE}http://localhost:5173${NC} (本地)"
    echo "         检查 ngrok 状态: http://127.0.0.1:4040"
fi

if [ -n "$BACKEND_URL" ]; then
    echo "  ⚙️  后端: ${BLUE}${BACKEND_URL}${NC}"
else
    echo "  ⚙️  后端: ${BLUE}http://localhost:3000${NC} (本地)"
    echo "         检查 ngrok 状态: http://127.0.0.1:4041"
fi

echo ""
echo "============================="
echo "📊 管理面板："
echo "============================="
echo ""
echo "  ngrok 前端: http://127.0.0.1:4040"
echo "  ngrok 后端: http://127.0.0.1:4041"
echo ""
echo "============================="
echo "⚠️  按 Ctrl+C 停止所有服务"
echo "============================="
echo ""

# 等待用户中断
trap "echo ''; echo '${YELLOW}🛑 正在停止服务...${NC}'; kill $BACKEND_PID $FRONTEND_PID $NGROK_FRONTEND_PID $NGROK_BACKEND_PID 2>/dev/null; exit 0" INT

wait
