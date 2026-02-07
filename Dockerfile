# Build stage - not needed for now as we don't have build step
# Runtime stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY webapp/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY webapp/ ./

# Create dictations directory with proper permissions
RUN mkdir -p /app/dictations && \
    chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
