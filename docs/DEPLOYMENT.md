# Agent Arena - Deployment Guide

## Deployment Options

### 1. Docker Compose (Recommended for Production)

#### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 4GB RAM minimum (8GB recommended)
- 20GB disk space

#### Deployment Steps

1. **Prepare the server:**

```bash
# Create deployment directory
mkdir -p /opt/agent-arena
cd /opt/agent-arena

# Clone repository
git clone <repository-url> .
```

2. **Configure environment:**

```bash
cp .env.template .env

# Edit with your production settings
nano .env
```

Required production settings:
```env
NODE_ENV=production
DB_PASSWORD=<strong_random_password>
REDIS_URL=redis://redis:6379
JWT_SECRET=<strong_random_secret_32_chars_min>
FRONTEND_URL=https://your-domain.com
PRIZE_RATE=0.9
```

3. **Deploy with Docker Compose:**

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

4. **Run database migrations:**

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate
```

5. **Verify deployment:**

```bash
# Health check
curl http://localhost:3000/health

# Frontend
curl http://localhost/
```

#### With Monitoring Stack

```bash
# Deploy with Prometheus and Grafana
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Access Grafana at http://your-server:3002
# Default login: admin / admin (or GRAFANA_PASSWORD from .env)
```

### 2. Cloud Deployment (AWS)

#### EC2 + RDS + ElastiCache

1. **Infrastructure Setup:**

```bash
# Create VPC, Subnets, Security Groups
# RDS PostgreSQL instance
# ElastiCache Redis cluster
# EC2 instance (t3.medium or larger)
```

2. **Configure Security Groups:**

| Service | Port | Source |
|---------|------|--------|
| ALB | 80/443 | 0.0.0.0/0 |
| EC2 | 3000 | ALB SG |
| RDS | 5432 | EC2 SG |
| ElastiCache | 6379 | EC2 SG |

3. **Deploy Application:**

```bash
# SSH to EC2
ssh -i key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Clone and deploy
git clone <repo>
cd agent-arena

# Configure environment
cp .env.template .env
# Edit .env with RDS and ElastiCache endpoints

# Deploy without local postgres/redis
docker-compose -f docker-compose.prod.yml up -d backend frontend
```

4. **Setup Application Load Balancer:**

- Target Group: EC2 instance port 80
- Health Check: `/`
- SSL Certificate via ACM

### 3. Kubernetes Deployment

#### Manifest Files

Create `k8s/` directory with:

**namespace.yaml:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: agent-arena
```

**secrets.yaml:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: agent-arena-secrets
  namespace: agent-arena
type: Opaque
stringData:
  DB_PASSWORD: "your_password"
  JWT_SECRET: "your_secret"
```

**postgres.yaml:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: agent-arena
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_USER
          value: agent_arena
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: agent-arena-secrets
              key: DB_PASSWORD
        - name: POSTGRES_DB
          value: agent_arena
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: agent-arena
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

**backend.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: agent-arena
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/agent-arena-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DB_HOST
          value: postgres
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: agent-arena-secrets
              key: DB_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: agent-arena-secrets
              key: JWT_SECRET
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: agent-arena
spec:
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
```

**frontend.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: agent-arena
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/agent-arena-frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: agent-arena
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

**ingress.yaml:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agent-arena
  namespace: agent-arena
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: agent-arena-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3000
```

#### Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n agent-arena

# Run migrations
kubectl exec -it deployment/backend -n agent-arena -- npm run db:migrate
```

### 4. Heroku Deployment

#### Backend

```bash
# Create Heroku app
heroku create agent-arena-api

# Add PostgreSQL and Redis
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate
```

#### Frontend (Static)

```bash
cd frontend

# Build
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist

# Or Vercel
vercel --prod
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure nginx to use certificates
# See frontend/nginx.conf for example
```

### Automatic Renewal

```bash
# Add to crontab
0 12 * * * /usr/bin/certbot renew --quiet
```

## Backup Strategy

### Database Backups

```bash
# Automated daily backup
crontab -e

# Add:
0 2 * * * pg_dump -h localhost -U agent_arena agent_arena | gzip > /backups/agent-arena-$(date +\%Y\%m\%d).sql.gz
```

### Docker Volume Backups

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker run --rm -v agent-arena_postgres_data:/data -v /backups:/backup alpine tar czf /backup/postgres-$DATE.tar.gz -C /data .
docker run --rm -v agent-arena_redis_data:/data -v /backups:/backup alpine tar czf /backup/redis-$DATE.tar.gz -C /data .
```

## Monitoring & Alerting

### Health Checks

- **Backend**: `GET /health` - Returns 200 when healthy
- **Frontend**: `GET /` - Returns 200 when Nginx serving
- **Database**: `pg_isready` via Docker healthcheck
- **Redis**: `redis-cli ping` via Docker healthcheck

### Log Aggregation

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Export logs
docker-compose -f docker-compose.prod.yml logs > logs.txt
```

### Performance Monitoring

With monitoring profile enabled:

- **Prometheus**: http://your-server:9090
- **Grafana**: http://your-server:3002
- **Metrics**: Application metrics available at `/metrics`

## Security Checklist

- [ ] Strong JWT secret (32+ random characters)
- [ ] Database password not using defaults
- [ ] Redis not exposed to public internet
- [ ] Firewall rules configured
- [ ] SSL/TLS enabled
- [ ] Regular security updates
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain

## Rollback Procedure

```bash
# If deployment fails, rollback to previous version

# Docker Compose
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# With specific version
docker-compose -f docker-compose.prod.yml up -d backend=agent-arena:1.0.0

# Database rollback (if migration failed)
docker-compose -f docker-compose.prod.yml exec backend npm run db:rollback
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check environment
docker-compose exec backend env

# Verify database connection
docker-compose exec backend node -e "require('./src/database').healthCheck().then(console.log)"
```

### WebSocket Connection Issues

1. Check firewall allows port 3000
2. Verify Nginx WebSocket proxy configuration
3. Check CORS settings match domain

### Database Connection Failures

1. Verify PostgreSQL is running: `docker-compose ps postgres`
2. Check credentials in `.env`
3. Test connection: `docker-compose exec postgres psql -U agent_arena`

## Maintenance Windows

```bash
# Graceful shutdown
docker-compose -f docker-compose.prod.yml stop -t 30

# Update
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Database maintenance
docker-compose -f docker-compose.prod.yml exec postgres vacuumdb -U agent_arena -a
```