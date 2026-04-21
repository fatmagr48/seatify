FROM node:20-bullseye-slim

WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retries 5 && \
    npm install

# Copy the rest of the application
COPY . .

# Fix permissions for the node_modules directory and pre-create vite-temp
# This ensures the 'node' user can write temporary files during development
RUN mkdir -p /app/node_modules/.vite-temp && \
    chmod -R 777 /app/node_modules && \
    chown -R node:node /app

# Switch to non-root user for improved security (Disabled for development to avoid volume permission issues)
# USER node

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
