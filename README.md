# Homework Library

A Mongolian teacher workspace and Chrome side panel for generating, organizing, and sharing lesson exercises. The Next.js API uses local MongoDB and stores private PDF uploads on disk. No Supabase account or migration is required.

## Local setup

1. Install Node.js 22 and pnpm, then run `pnpm install`.
2. Start MongoDB. With Docker Compose installed, run `docker compose up -d mongodb`; the service only binds to localhost and persists data in a named volume. Alternatively, start a local `mongod` listening on `127.0.0.1:27017`.
3. Copy `web/.env.mongodb.example` to `web/.env.local`. Set `AUTH_SECRET` to a private random value of at least 32 bytes. For example, generate one with `openssl rand -base64 48`. Keep this file private. Set `ANTHROPIC_API_KEY` if live exercise generation is required; generation otherwise uses the app's clearly labelled sample response.
4. Run `pnpm run dev:ui` (or `pnpm --filter homework_web dev`) and open `http://localhost:3000`. Create a teacher account at `/register`.

MongoDB creates the database and collections when the first account is registered. PDFs are kept in `data/uploads` by default and are excluded from git; set `DATA_DIR` to choose another private directory. Back up both the MongoDB database and this upload directory.

## Seed demo content

Set `DEMO_TEACHER_PASSWORD` in `web/.env.local` to a password with at least 12 characters, then run `pnpm seed`. The script creates four fictional demo teachers and twenty public sets, preserving existing rows on reruns. Demo emails are `oyun@homework.example`, `bat@homework.example`, `saran@homework.example`, and `nomin@homework.example`.

## Commands

- `pnpm run dev:ui` starts the web application.
- `pnpm run dev:api` starts the erxes plugin API scaffold.
- `pnpm run check`, `pnpm run lint`, and `pnpm run build` validate workspace types, style, and production builds.
- `pnpm --filter homework_extension build` builds the Chrome extension. Load `extension/dist` as an unpacked extension. `WEB_APP_URL` defaults to `http://localhost:3000` and must be HTTPS outside localhost.
- `pnpm test` runs unit tests; `pnpm --filter homework_web test:browser` runs browser workflows.

## Local deployment notes

The app uses the `MONGODB_URI` connection only on the web server. Never expose MongoDB or the Next.js API port directly to the public internet without an authenticated ingress. Use HTTPS for remote clients, a private database bind/network, persistent backups, a strong private `AUTH_SECRET`, and a private `DATA_DIR` for uploaded PDFs. The included compose file intentionally exposes MongoDB only on loopback and is for local development.

## API and design

Authentication is handled by the app using scrypt password hashes and signed seven-day bearer tokens. Protected API routes verify the signature and load the teacher from MongoDB. Each generated pair is kept in one MongoDB document, so saving both sets is atomic on a standalone local MongoDB instance. PDF files are validated and owner-bound through MongoDB upload records. The browser app and extension share the API; the extension stores only the signed session token in Chrome local storage.

The erxes plugin identity and deployment contract are documented in `docs/erxes-integration.md`. The homework workspace is separate from the erxes plugin packages.
