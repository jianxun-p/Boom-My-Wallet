# Stage 1: Install dependencies and build assets
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the final lean production image
FROM node:24-alpine AS production
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/boommywallet-config.json ./
COPY --from=build /app/Client/static ./Client/static
COPY --from=build /app/Server ./Server

# Use a non-root user for security best practices
USER node
EXPOSE 5000
CMD ["node", "Server/server.js"]
