# Multi-stage Dockerfile for the full-stack inventory management system

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Stage 3: Production image
FROM node:18-alpine AS production
WORKDIR /app

# Install sqlite3 and other dependencies
RUN apk add --no-cache sqlite

# Copy backend
COPY --from=backend-builder /app/backend ./backend
WORKDIR /app/backend

# Create data directory and uploads directory
RUN mkdir -p data uploads

# Copy frontend build to be served by backend
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]