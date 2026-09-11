FROM node:24-bookworm-slim
WORKDIR /app
COPY did/package*.json ./
RUN npm ci --omit=dev
COPY did/src ./src
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=5001 DID_DB_PATH=/data/credentials.sqlite DID_SEED_DEMO=false
EXPOSE 5001
CMD ["node", "src/server.js"]
