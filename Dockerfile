# Builds the plugin API image from source. Buyers use the Dockerfile inside
# the release archive (`pnpm run package`) instead; both produce the same image.
#   docker build --build-arg UI_ENTRY_URL=<remoteEntry.js URL> -t <image> .
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
# The whole workspace is copied so the lockfile matches; only the API is installed.
COPY . .
RUN pnpm install --frozen-lockfile --filter homework_api... \
  && pnpm --filter homework_api build \
  && pnpm --filter homework_api deploy --prod /out

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=80
COPY erxes.json ./
COPY --from=build /out/package.json api/package.json
COPY --from=build /out/node_modules api/node_modules
COPY --from=build /out/dist api/dist
ARG UI_ENTRY_URL
ENV UI_ENTRY_URL=$UI_ENTRY_URL
EXPOSE 80
USER node
CMD ["node", "api/dist/main.js"]
