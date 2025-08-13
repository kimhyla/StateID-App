FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV PORT=8787
EXPOSE 8787
RUN chown -R node:node /app
USER node
CMD ["node","src/server.js"]
