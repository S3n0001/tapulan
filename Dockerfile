# Tapulan needs a long-running Node process with a persistent, writable disk
# (better-sqlite3 + uploads). Mount a volume at /data and set DATA_DIR to it.
FROM node:20-slim

WORKDIR /app

# native build toolchain for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# where the SQLite database and uploads live — mount a volume here
ENV DATA_DIR=/data
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
