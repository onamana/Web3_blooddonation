FROM node:24-bookworm-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY backend/contracts ./contracts
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=4000 CERTIFICATE_DB_PATH=/data/certificates.sqlite
EXPOSE 4000
CMD ["node", "src/server.js"]
