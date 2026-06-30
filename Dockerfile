FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS backend-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

FROM node:20-alpine
WORKDIR /app

COPY --from=frontend-build /app/dist ./dist
COPY --from=backend-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
