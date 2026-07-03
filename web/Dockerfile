# Stage 1: Build the client and server packages
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache mise

COPY mise.toml app.yaml .gcloudignore ./
COPY Client/package*.json ./Client/
COPY Client/tsconfig*.json Client/vite.config.ts Client/eslint.config.ts Client/components.json ./Client/
COPY Client/src ./Client/src

COPY Server/package*.json ./Server/
COPY Server/tsconfig.json Server/eslint.config.js ./Server/
COPY Server/src ./Server/src

RUN mise trust mise.toml && MISE_TASK_RUN_AUTO_INSTALL=false mise run build

# Stage 2: Create the final lean production image
FROM docker.io/library/node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY Server/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./

# Use a non-root user for security best practices
USER node
EXPOSE 5000
CMD ["node", "server.js"]
