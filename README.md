# Даалгаврын сан — Homework Library

The homework product described in `prompt.md` lives in `web/` (Next.js) and `extension/` (Chrome side panel). The original erxes scaffold remains in `api/` and `ui/`.

## Run the homework web app

1. Use Node.js 22 and `pnpm install`.
2. Copy `web/.env.example` to `web/.env.local`. Fill in the Supabase project URL and anonymous key. Secrets belong only in `.env.local`.
3. In a **new Supabase project**, apply `supabase/migrations/202610240001_homework_library.sql` with the SQL editor. It creates the tables, RLS, profile trigger, atomic copy/save functions, and a private PDF storage bucket. It does not reset a database.
4. Enable email/password authentication. Set the Auth Site URL to `http://localhost:3000` for local development. For a hackathon, either configure confirmation email delivery or explicitly disable confirmation in the Supabase dashboard.
5. Run `pnpm dev` and visit `http://localhost:3000`.

`ANTHROPIC_API_KEY` is optional: without it, generation returns a clearly labelled, fixed Mongolian fractions example. Supabase is required for real accounts, storage, and saving; missing configuration shows a Mongolian setup message. The service-role key is used only by the explicit seed script, never by normal app requests.

Run `pnpm run check`, `pnpm run lint`, `pnpm run test`, and `pnpm run build` to validate. Phase notes are in `docs/homework-progress.md`.

### Demo library

Set `SUPABASE_SERVICE_ROLE_KEY` and a private `DEMO_TEACHER_PASSWORD` (at least 12 characters) in `web/.env.local`, then run `pnpm seed`. The script creates four confirmed demo teacher accounts and twenty realistic public sets across mathematics, physics, Mongolian, and English for grades 5–11. It preserves existing rows on reruns and never resets the database. Demo emails are `oyun@homework.example`, `bat@homework.example`, `saran@homework.example`, and `nomin@homework.example`; their password is the value you supplied. Use a dedicated demo Supabase project.

### Web API and provider boundaries

All business logic runs in the web server. Requests carry `Authorization: Bearer <Supabase access token>`; every data route verifies the token with Supabase and uses the anonymous key plus that teacher's token so RLS still applies. No cookie authentication or service-role bypass is used. API CORS allows explicit bearer-token clients without cookies. Endpoints: `GET /api/me`, `GET /api/sets` (bounded 12-row pages), `GET/PATCH/DELETE /api/sets/:id`, `POST /api/sets/:id/copy`, `POST /api/sets/:id/rating`, `POST /api/uploads`, `POST /api/generate`, and `POST /api/generations`.

Database calls live in `web/src/lib/db/`; AI calls are behind `generateExerciseSets` in `web/src/lib/ai/`; voice recognition is behind `SpeechProvider` in `web/src/lib/speech/`. The Claude model is exactly `claude-sonnet-5-5`, as requested. Its live availability must be verified with your Anthropic account; provider failures are shown as a Mongolian error, never disguised as successful AI generation. PDF uploads are private, limited to 10 MiB, and forwarded directly as a Claude document block. The adapter does not parse PDFs locally.

Student exports omit answer keys; teacher exports include them. Open a set's student/teacher print view and use the browser's print-to-PDF destination. Speech recognition availability and `mn-MN` accuracy depend on the browser; text entry always works.

### Chrome side panel

1. Configure `web/.env.local`. `WEB_APP_URL` defaults to `http://localhost:3000`; use an HTTPS origin for deployment. The extension build copies only the public Supabase URL and anonymous key, never the Anthropic or service-role keys.
2. Run `pnpm --filter homework_extension build` (or `pnpm dev:extension` to watch source changes).
3. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`.
4. Click the extension toolbar icon and sign in with the same account used on the web. Sessions are stored in `chrome.storage.local` with access limited to trusted extension contexts.
5. Highlight text on a regular web page, click the toolbar icon to grant temporary active-tab access, and choose **Сонгосон бичвэрийг ашиглах**. If you change to another origin, invoke the toolbar icon again. Chrome internal pages and the Web Store do not allow script injection; the editable text field remains available.

The side panel supports text/voice/PDF generation, editing and saving pairs, public library search and copying, and personal sets. Every set links back to the web app. Rebuild and reload the extension after changing its configuration. It uses only the web API for business operations; another plugin shell can reuse the same endpoints.

### Verification

`pnpm test` runs generation/validation/export tests and executes the actual SQL migration in a local PostgreSQL runtime (PGlite) with minimal Supabase platform schemas. It verifies anonymous denial, public/private access, owner-only changes, protected copy counters, atomic copies and pair saves, ratings, and isolated PDF storage.

`pnpm --filter homework_web exec playwright install chromium` installs the browser for `pnpm --filter homework_web test:browser`. If a system Chrome is already installed, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/google-chrome pnpm --filter homework_web test:browser`. These browser tests use explicitly fake auth/API fixtures for signed-in UI flows and real HTTP requests to verify unauthenticated API rejection; they do not contact a live Supabase or Anthropic account. They cover registration, editing and saving generated pairs, library empty states, desktop/mobile layout, copying, rating, and student/teacher exports.

After building the extension, `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/google-chrome pnpm --filter homework_web test:extension` loads it in a fresh Chrome profile and checks the service worker, side panel, and narrow layout. Live speech quality, email delivery, and Claude generation require the team's configured services and a microphone.

The erxes UI remains on React 18 and its host-provided singletons; its TypeScript paths explicitly resolve React 18 types to keep it separate from the standalone React 19 app.

## Original erxes scaffold

Lesson plugin for erxes

An erxes plugin that lives outside the erxes monorepo and joins an erxes stack.
The shared-library baseline is erxes 3.3.2. Dashed plugin names
use the same public permission identity in the API and UI; the host must support
normalized remote discovery and dashed page-module loading (see integration docs).

| Part   | Path         | Stack                                                                              | Dev port |
| ------ | ------------ | ---------------------------------------------------------------------------------- | -------- |
| API    | `api`        | Node.js 22, erxes-api-shared startPlugin + tenant-scoped Mongoose models (Node.js) | 3399     |
| UI     | `ui`         | React 18 Module Federation remote (Rspack), Tailwind CSS                           | 3099     |
| Shared | `erxes.json` | Plugin identity and ports read by both parts                                       |          |

The UI uses erxes's `erxes-ui`/`ui-modules` design system, installed from npm
(`@erxes/ui`, `@erxes/ui-modules`; see
[docs/erxes-integration.md](docs/erxes-integration.md#shared-libraries)). The
host supplies them at runtime via Module Federation singletons — they are
installed only so TypeScript and Rspack can resolve the imports.

## Develop

```sh
pnpm install
cp .env.example .env
pnpm run dev:api   # registers with the erxes gateway through Redis
pnpm run dev:ui    # serves http://localhost:3099/remoteEntry.js
```

`check`, `build` and `dev:ui` run `codegen` first, so the generated GraphQL
types always match the printed API schema.

In the erxes checkout `.env`, add the plugin and restart the gateway and
core-api so they pick it up:

```sh
ENABLED_PLUGINS=...,lesson
```

Then open `http://localhost:3001/lesson` (settings: `/lesson/settings`).
Both processes must use the same Redis as erxes; `UI_ENTRY_URL` must be
reachable by the browser, not merely by the API container. Requests reach the
API through the gateway (`/graphql`), which forwards the signed-in user and
tenant. Those headers are not independently authenticated: keep the API on
a private gateway-only network and strip user/tenant headers at public ingress.

## Scripts

| Script             | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `pnpm run dev:api` | API in watch mode                               |
| `pnpm run dev:ui`  | UI remote dev server                            |
| `pnpm run codegen` | Print the API schema, generate UI GraphQL types |
| `pnpm run build`   | Production build of every part                  |
| `pnpm run check`   | Type-check every part                           |
| `pnpm run lint`    | oxlint                                          |
| `pnpm run fmt`     | oxfmt                                           |

## Deploy

- **API**: `docker build --build-arg UI_ENTRY_URL=<remoteEntry.js URL> -t <image> .`
  Run `pnpm install` first and commit its lockfile before building the image.
  The image serves the API on port 80 and registers itself on start
  (`plugin-lesson-api:80` unless `LOAD_BALANCER_ADDRESS` is set).
- **UI**: upload `ui/dist` to a static host or CDN. Upload hashed assets
  first and `remoteEntry.js` last with `Cache-Control: no-store`. Without
  `UI_ENTRY_URL`, erxes falls back to `https://plugins.erxes.io/<release>/lesson_ui/remoteEntry.js`;
  this generator does not upload there. Set your own browser-reachable URL,
  serve all emitted chunks with CORS for the erxes origin, and use immutable
  caching only for content-hashed assets (not stable-named expose chunks).

See [docs/erxes-integration.md](docs/erxes-integration.md) for how the plugin
plugs into erxes and [AGENTS.md](AGENTS.md) for the rules to keep it working.
