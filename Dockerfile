FROM node:24-slim AS builder
WORKDIR /usr/src/app
RUN corepack enable

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /usr/src/app/dist /srv
EXPOSE 80

HEALTHCHECK CMD wget -q --spider http://localhost/ || exit 1
