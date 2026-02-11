#!/bin/bash
# Agent Arena 全自动部署脚本（无需浏览器交互）
# 使用方法: ./deploy-auto.sh <github_token>

set -e

GITHUB_TOKEN="${1:-$GITHUB_TOKEN}"
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 请提供 GitHub Token"
    echo "用法: ./deploy-auto.sh <github_token>"
    exit 1
fi

echo "🚀 Agent Arena 全自动部署"
echo "=========================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取 GitHub 用户名
echo "📋 获取 GitHub 用户信息..."
GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/user | grep -o '"login":"[^"]*' | cut -d'"' -f4)

if [ -z "$GITHUB_USER" ]; then
    echo "${RED}❌ GitHub Token 无效${NC}"
    exit 1
fi

echo "${GREEN}✅ GitHub 用户: $GITHUB_USER${NC}"

# 检查/创建仓库
echo ""
echo "📦 检查 GitHub 仓库..."
REPO_EXISTS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$GITHUB_USER/agent-arena | grep -o '"id"' || echo "")

if [ -z "$REPO_EXISTS" ]; then
    echo "创建仓库..."
    curl -s -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/user/repos \
        -d '{"name":"agent-arena","private":false}' > /dev/null
    echo "${GREEN}✅ 仓库创建成功${NC}"
else
    echo "${GREEN}✅ 仓库已存在${NC}"
fi

# 配置 Git 并推送
echo ""
echo "📤 推送代码到 GitHub..."
cd "$(dirname "$0")"

git remote remove origin 2>/dev/null || true
git remote add origin "https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/agent-arena.git"
git push -u origin main 2>&1 | grep -v "^remote:" || true

echo "${GREEN}✅ 代码推送完成${NC}"

# 显示部署链接
echo ""
echo "============================"
echo "🎉 代码已推送到 GitHub！"
echo "============================"
echo ""
echo "仓库地址: ${BLUE}https://github.com/$GITHUB_USER/agent-arena${NC}"
echo ""
echo "${YELLOW}请在手机/其他设备上完成以下步骤:${NC}"
echo ""
echo "1️⃣  Railway 部署后端:"
echo "   访问: https://railway.app/new"
echo "   点击 'Deploy from GitHub repo'"
echo "   选择 agent-arena 仓库"
echo "   添加 PostgreSQL 和 Redis 数据库"
echo ""
echo "2️⃣  Vercel 部署前端:"
echo "   访问: https://vercel.com/new"
echo "   导入 GitHub 仓库 agent-arena"
echo "   Framework: Vite"
echo "   Root Directory: frontend/"
echo ""
echo "3️⃣  绑定域名:"
echo "   在 Vercel 添加域名 bots-arena.com"
echo "   DNS A 记录指向 76.76.21.21"
echo ""
echo "============================"
echo ""

# 尝试自动打开浏览器
if command -v open >/dev/null 2>&1; then
    echo "正在打开部署页面..."
    open "https://railway.app/new"
    sleep 2
    open "https://vercel.com/new"
fi

echo "${GREEN}✅ 准备完成！${NC}"
