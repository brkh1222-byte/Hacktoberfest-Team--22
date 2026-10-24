# Homework plugin API for erxes. Built from the release folder:
#   docker build --build-arg UI_ENTRY_URL=https://cdn.example.com/homework_ui/remoteEntry.js -t homework-api .
# Dependencies install inside the image from the shipped lockfile, so the
# versions are exactly the ones this release was tested with.
FROM node:22-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate

COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml api/
RUN cd api && pnpm install --prod --frozen-lockfile

COPY erxes.json ./
COPY api/dist api/dist

ENV NODE_ENV=production PORT=80
ARG UI_ENTRY_URL
ENV UI_ENTRY_URL=$UI_ENTRY_URL
EXPOSE 80
USER node
CMD ["node", "api/dist/main.js"]
