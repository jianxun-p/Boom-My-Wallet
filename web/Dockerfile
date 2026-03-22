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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/Client/static ./Client/static
COPY Server ./Server
COPY boommywallet-config.json ./

# Use a non-root user for security best practices
USER node
EXPOSE 5000
CMD ["node", "Server/server.js"]
