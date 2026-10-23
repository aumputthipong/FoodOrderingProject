# Build context is the repository root:
#   docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
ENV CI=true
WORKDIR /repo
RUN corepack enable
# Manifests first so the dependency layer is cached.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @canteen/api build
# pnpm >= 10 needs --legacy unless inject-workspace-packages is enabled.
RUN pnpm --filter @canteen/api deploy --prod --legacy /out

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/src/db/migrations ./migrations
COPY --from=build /repo/apps/api/seed/images ./seed/images
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/migrate.js && node dist/seed.js && node dist/server.js"]
