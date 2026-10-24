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

## Original erxes scaffold

Lesson plugin for erxes

An erxes plugin that lives outside the erxes monorepo and joins an erxes stack.
The shared-library baseline is erxes 3.3.2. Dashed plugin names
use the same public permission identity in the API and UI; the host must support
normalized remote discovery and dashed page-module loading (see integration docs).

| Part   | Path         | Stack                                                    | Dev port    |
| ------ | ------------ | -------------------------------------------------------- | ----------- |
| API    | `api`        | Node.js 22, erxes-api-shared startPlugin + tenant-scoped Mongoose models (Node.js)                             | 3399 |
| UI     | `ui`         | React 18 Module Federation remote (Rspack), Tailwind CSS | 3099  |
| Shared | `erxes.json` | Plugin identity and ports read by both parts             |             |

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

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
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
