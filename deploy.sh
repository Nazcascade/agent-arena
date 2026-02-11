#!/bin/bash
# Agent Arena 一键部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 Agent Arena 部署脚本"
echo "========================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 步骤 1: 检查环境
echo ""
echo "📋 步骤 1: 检查环境..."

if ! command_exists git; then
    echo "${RED}❌ 错误: 未安装 Git${NC}"
    echo "   请先安装 Git: https://git-scm.com/downloads"
    exit 1
fi

echo "${GREEN}✅ Git 已安装${NC}"

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "${RED}❌ 错误: 当前目录不是 agent-arena 项目根目录${NC}"
    echo "   请切换到项目目录: cd ~/.openclaw/workspace/agent-arena"
    exit 1
fi

echo "${GREEN}✅ 项目目录正确${NC}"

# 步骤 2: 检查 Git 配置
echo ""
echo "📋 步骤 2: 检查 Git 配置..."

GIT_USER=$(git config user.name || echo "")
GIT_EMAIL=$(git config user.email || echo "")

if [ -z "$GIT_USER" ] || [ -z "$GIT_EMAIL" ]; then
    echo "${YELLOW}⚠️  Git 用户信息未配置${NC}"
    read -p "请输入你的 Git 用户名: " GIT_USER
    read -p "请输入你的 Git 邮箱: " GIT_EMAIL
    
    git config user.name "$GIT_USER"
    git config user.email "$GIT_EMAIL"
fi

echo "${GREEN}✅ Git 用户: $GIT_USER <$GIT_EMAIL>${NC}"

# 步骤 3: 创建 GitHub 仓库
echo ""
echo "📋 步骤 3: 推送到 GitHub..."

if git remote | grep -q "origin"; then
    echo "${YELLOW}⚠️  远程仓库已存在${NC}"
    read -p "是否重新设置远程仓库? (y/n): " RESET_REMOTE
    if [ "$RESET_REMOTE" = "y" ]; then
        git remote remove origin
    fi
fi

if ! git remote | grep -q "origin"; then
    echo ""
    echo "请在浏览器中访问: https://github.com/new"
    echo "创建新仓库: ${YELLOW}agent-arena${NC}"
    echo ""
    read -p "输入你的 GitHub 用户名: " GITHUB_USER
    
    # 添加远程仓库
    git remote add origin "https://github.com/$GITHUB_USER/agent-arena.git"
    echo "${GREEN}✅ 远程仓库已添加${NC}"
fi

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "${YELLOW}⚠️  检测到未提交的更改${NC}"
    read -p "是否提交所有更改? (y/n): " COMMIT_CHANGES
    if [ "$COMMIT_CHANGES" = "y" ]; then
        git add -A
        git commit -m "更新部署配置"
    fi
fi

# 推送代码
echo ""
echo "正在推送代码到 GitHub..."
git push -u origin main || git push -u origin master

echo "${GREEN}✅ 代码已推送到 GitHub${NC}"

# 步骤 4: 显示下一步
echo ""
echo "🎉 代码推送完成！"
echo ""
echo "${YELLOW}下一步（请在浏览器中完成）:${NC}"
echo ""
echo "1️⃣  部署后端到 Railway:"
echo "   - 访问: https://railway.app/"
echo "   - 点击 New Project → Deploy from GitHub"
echo "   - 选择 agent-arena 仓库"
echo "   - 添加 PostgreSQL 和 Redis 数据库"
echo ""
echo "2️⃣  部署前端到 Vercel:"
echo "   - 访问: https://vercel.com/"
echo "   - Import Project → 选择 agent-arena"
echo "   - Framework: Vite, Root Directory: frontend/"
echo ""
echo "3️⃣  绑定域名 bots-arena.com:"
echo "   - 在 Vercel 添加域名 bots-arena.com"
echo "   - 在域名商添加 A 记录指向 76.76.21.21"
echo ""
echo "📖 详细文档: DEPLOYMENT_GUIDE.md"
echo ""

# 可选: 打开浏览器
read -p "是否打开 Railway 和 Vercel 网站? (y/n): " OPEN_BROWSER
if [ "$OPEN_BROWSER" = "y" ]; then
    if command_exists open; then
        open "https://railway.app/"
        sleep 1
        open "https://vercel.com/"
    elif command_exists xdg-open; then
        xdg-open "https://railway.app/"
        sleep 1
        xdg-open "https://vercel.com/"
    else
        echo "请手动访问上述网址"
    fi
fi

echo ""
echo "${GREEN}🚀 部署准备完成！${NC}"
