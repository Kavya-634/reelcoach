FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.server.json ./
COPY server ./server
COPY src/instagram/types.ts ./src/instagram/types.ts
RUN npm run build:server

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/.server-dist ./.server-dist
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 8080
CMD ["node", ".server-dist/server/index.js"]
