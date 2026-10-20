FROM oven/bun:1.4.3

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /app/apps/api
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build bunx prisma generate

USER bun
EXPOSE 3001
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/server.ts"]