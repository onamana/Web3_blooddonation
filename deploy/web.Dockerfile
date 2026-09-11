FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG CERTIFICATE_CONTRACT_ADDRESS
ENV VITE_API_BASE_URL=/api VITE_DEMO_MODE=false VITE_CHAIN_ID=0xaa36a7
ENV VITE_CERTIFICATE_CONTRACT_ADDRESS=$CERTIFICATE_CONTRACT_ADDRESS
RUN npm run build
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
