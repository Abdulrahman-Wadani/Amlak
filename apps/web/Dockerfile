FROM oven/bun:1.4.3
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN chown -R bun /app
WORKDIR /app/apps/web
USER bun
EXPOSE 5173
CMD ["bunx", "vp", "dev"]
