FROM docker.arvancloud.ir/library/node:20-alpine
WORKDIR /app

COPY hermes/package*.json ./
RUN npm install

COPY hermes/tsconfig.json ./
COPY hermes/src ./src

RUN npx tsc

ENV NODE_ENV=production
ENV HERMES_PORT=3002
ENV WORKSPACE_PATH=/workspace

EXPOSE 3002

CMD ["node", "dist/index.js"]
