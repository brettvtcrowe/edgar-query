# Production MCP HTTP Bridge using official mcp/sec-edgar image
FROM node:20-alpine

WORKDIR /app

# Install Docker CLI for spawning official mcp/sec-edgar containers
RUN apk add --no-cache docker-cli python3 py3-pip

# Pull the official MCP image for offline use
RUN docker pull mcp/sec-edgar:latest || echo "Docker daemon not available during build"

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Install production dependencies
RUN npm ci --only=production

# Environment setup
ENV MCP_SERVER_PATH=/mcp
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "dist/server.js"]