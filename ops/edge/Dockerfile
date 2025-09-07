# File: ops/edge/Dockerfile
# Edge-only CI image that serves / and /healthz (no backend server required).

FROM node:22-alpine

WORKDIR /app

# Copy just the tiny CI server
COPY ops/edge/ci-dev-server.mjs ./ops/edge/ci-dev-server.mjs

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the minimal HTTP server
CMD ["node", "--enable-source-maps", "./ops/edge/ci-dev-server.mjs"]
