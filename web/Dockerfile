# Stage 1: Install dependencies and build assets
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.* ./
COPY eslint.config.js ./
COPY vite.config.ts ./
COPY Client ./Client
RUN npm run build

# Stage 2: Create the final lean production image
FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/Client/dist ./Client/dist
COPY Server ./Server

# Use a non-root user for security best practices
USER node
EXPOSE 5000
CMD ["node", "Server/server.js"]
