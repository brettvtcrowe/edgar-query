# Standalone deployment without Docker-in-Docker
# This uses a direct MCP server approach instead of spawning containers

FROM stefanoamorelli/sec-edgar-mcp:latest AS mcp

FROM node:20-alpine

WORKDIR /app

# Copy MCP server files from the official image
COPY --from=mcp /app /mcp

# Install Python for MCP server (if needed)
RUN apk add --no-cache python3 py3-pip

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