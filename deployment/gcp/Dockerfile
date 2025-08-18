FROM node:18-alpine

# Install Docker CLI for running MCP container
RUN apk add --no-cache docker-cli

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY mcp-http-proxy.js ./

# Expose port
EXPOSE 8080

# Start the proxy server
CMD ["npm", "start"]