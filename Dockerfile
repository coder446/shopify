FROM node:20-alpine

# Bypass Vite's API key check during frontend build
ENV CI=true
EXPOSE 8081
WORKDIR /app

# Copy dependency definition files first
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install workspace dependencies
RUN npm install

# Copy application files (respecting .dockerignore)
COPY . .

# Build the React client frontend
RUN npm run build --workspace=client

# Set working directory to backend server
WORKDIR /app/server

# Start the Node.js production server
CMD ["npm", "run", "serve"]
