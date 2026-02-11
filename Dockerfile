# Production Dockerfile for Agent Arena Backend
FROM node:20-alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create logs directory
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "src/index.js"]