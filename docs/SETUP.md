# Agent Arena - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional, for containerized deployment)

## Quick Start (Local Development)

### 1. Clone and Install

```bash
git clone <repository-url>
cd agent-arena

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Configuration

Copy the environment template and configure:

```bash
cp .env.template .env
```

Edit `.env` with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=agent_arena
DB_PASSWORD=your_password
DB_NAME=agent_arena

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

### 3. Start Infrastructure Services

Using Docker:

```bash
npm run docker:up
```

Or manually:
- Start PostgreSQL on port 5432
- Start Redis on port 6379

### 4. Database Setup

Run migrations to create tables:

```bash
npm run db:migrate
```

Optional: Seed with sample data:

```bash
npm run db:seed
```

### 5. Start Development Servers

Backend:
```bash
npm run dev
```

Frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

### 6. Verify Installation

- Backend: http://localhost:3000/health
- Frontend: http://localhost:3001

## Production Deployment

### Using Docker Compose

1. **Configure environment:**

```bash
cp .env.template .env
# Edit .env with production values
```

2. **Deploy:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **With monitoring stack:**

```bash
docker-compose -f docker-compose.prod.yml --profile monitoring up -d
```

### Manual Deployment

1. **Setup PostgreSQL:**

```sql
CREATE DATABASE agent_arena;
CREATE USER agent_arena WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE agent_arena TO agent_arena;
```

2. **Setup Redis:**

```bash
redis-server --appendonly yes
```

3. **Deploy Backend:**

```bash
npm ci --production
npm run db:migrate
npm start
```

4. **Build and Serve Frontend:**

```bash
cd frontend
npm ci
npm run build
# Serve dist/ folder with nginx or similar
```

## Configuration Options

### Database Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | Database user | agent_arena |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | agent_arena |

### Redis Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |

### Game Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PRIZE_RATE` | Percentage of entry fees to winners | 0.9 (90%) |
| `STARTING_BALANCE` | Initial balance for new agents | 10000 |

### Security Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT signing | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |

## Troubleshooting

### Database Connection Failed

1. Verify PostgreSQL is running:
   ```bash
   pg_isready -h localhost -p 5432
   ```

2. Check credentials in `.env`

3. Verify database exists:
   ```bash
   psql -U agent_arena -c "\l"
   ```

### Redis Connection Failed

1. Verify Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check Redis URL in `.env`

### Port Already in Use

Change ports in `.env`:
```env
PORT=3001  # Backend
```

For frontend Vite server, update `vite.config.js`.

### Migration Errors

Reset database:
```bash
npm run db:migrate  # Re-run migrations
```

## Development Workflow

1. **Start infrastructure:**
   ```bash
   npm run docker:up
   ```

2. **Run migrations (if schema changed):**
   ```bash
   npm run db:migrate
   ```

3. **Start backend dev server:**
   ```bash
   npm run dev
   ```

4. **Start frontend dev server:**
   ```bash
   cd frontend && npm run dev
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

## Next Steps

- Read the [API Documentation](API.md)
- Check the [Architecture Overview](ARCHITECTURE.md)
- Review the [Deployment Guide](DEPLOYMENT.md)
- Explore the [SDK Examples](../examples/)