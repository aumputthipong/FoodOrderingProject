# Build context is the repository root:
#   docker build -f apps/web/Dockerfile .
FROM node:24-slim AS build
ENV CI=true
WORKDIR /repo
RUN corepack enable
# Manifests first so the dependency layer is cached.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@canteen/web..."
COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/shared packages/shared
ARG VITE_DEMO_HINT=
ENV VITE_DEMO_HINT=$VITE_DEMO_HINT
RUN pnpm --filter @canteen/web build

FROM nginx:1.28-alpine AS runtime
COPY apps/web/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY apps/web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
