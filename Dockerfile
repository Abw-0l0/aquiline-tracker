FROM node:18-alpine AS base
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY server.js ./

ENV NODE_ENV=production
EXPOSE 3000

USER node

CMD ["node", "server.js"]
