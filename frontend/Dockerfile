# Multi-stage build for frontend
# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build argument for API URL - will be replaced at runtime
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Install envsubst for runtime environment variable substitution
RUN apk add --no-cache gettext

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy environment template for runtime config
COPY env-config.js.template /usr/share/nginx/html/env-config.js.template

# Create startup script for runtime environment injection
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-generate-env-config.sh && \
    echo 'echo "window._env_ = { API_BASE: \"${API_BASE:-}\", VITE_GOOGLE_MAPS_API_KEY: \"${VITE_GOOGLE_MAPS_API_KEY:-}\" };" > /usr/share/nginx/html/env-config.js' >> /docker-entrypoint.d/40-generate-env-config.sh && \
    chmod +x /docker-entrypoint.d/40-generate-env-config.sh

# Expose frontend port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Nginx will be started by the base image's entrypoint

