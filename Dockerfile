FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY --from=frontend-build /app/dist ./dist
COPY server/ ./server/
RUN cd server && npm install --omit=dev && npm cache clean --force

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
