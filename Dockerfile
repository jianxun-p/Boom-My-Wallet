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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/. .

# Use a non-root user for security best practices
USER node
# The application runs on port 3000 by default in the official image
EXPOSE 5000
CMD ["node", "Server/server.js"]


