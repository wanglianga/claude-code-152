FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
