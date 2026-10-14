
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Prisma 7 reads DATABASE_URL from prisma.config.ts
RUN DATABASE_URL="postgresql://amlak_user:build_only@localhost:5432/amlak?schema=public" npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
