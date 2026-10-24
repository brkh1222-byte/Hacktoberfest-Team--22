# Homework — erxes plugin

Homework turns a lesson into ready-to-use practice. A teacher enters what they
taught (typed text, a PDF, or Mongolian voice dictation) and gets two editable
sets: quick in-class checks and independent homework, each with answers and
explanations. Sets can be kept private or published to the organization's
library, where colleagues copy, rate and print them as student or teacher
worksheets.

It is a standard erxes plugin: teachers use their erxes accounts, data lives
in the organization's erxes database, and access is granted through erxes
permissions.

| Part | Path | Stack | Dev port |
| --- | --- | --- | --- |
| API | `api` | Node.js 22, erxes-api-shared `startPlugin`, tenant-scoped Mongoose models, Anthropic SDK | 3399 |
| UI | `ui` | React 18 Module Federation remote (Rspack), erxes-ui, Tailwind | 3099 |
| Identity | `erxes.json` | Plugin name `homework`, remote `homework_ui`, route `/homework` | |

## Selling and installing

`pnpm run package` runs the tests, builds both parts and writes
`release/homework-<version>/` plus a `.tar.gz` of it. That archive is the
product: an API Dockerfile with a frozen lockfile, the static UI remote and
the buyer's guide. The buyer brings their own erxes, MongoDB, Redis, CDN and
(optionally) Anthropic key; see [docs/installation.md](docs/installation.md).

## Develop against a local erxes

```sh
pnpm install
cp .env.example .env     # REDIS_*, MONGO_URL=mongodb://127.0.0.1:27017/erxes
pnpm run dev:api         # registers with the erxes gateway through Redis
pnpm run dev:ui          # serves http://localhost:3099/remoteEntry.js
```

In the erxes checkout's `.env`, set `ENABLED_PLUGINS=...,homework`, restart
the gateway and core-api, and open `http://localhost:3001/homework`. Without
`ANTHROPIC_API_KEY` or `GEMINI_API_KEY`, generation returns a labelled sample, so the whole flow
can be demoed offline.

| Script | What it does |
| --- | --- |
| `pnpm run dev:api` / `dev:ui` | Plugin API and UI in watch mode |
| `pnpm run codegen` | Print the API schema, generate UI GraphQL types |
| `pnpm test` | API tests (throwaway `homework_test` database on local MongoDB) and web tests |
| `pnpm run check` / `lint` / `build` | Type-check, lint and build every package |
| `pnpm run package` | Build the distributable release |

## How it fits erxes

- **GraphQL**: `homework*` queries and mutations on the shared supergraph
  (`api/src/modules/homework/graphql`).
- **Data**: `homework_exercise_sets`, `homework_ratings`, `homework_profiles`
  and `homework_uploads` (24-hour TTL), created through `generateModels`.
- **Permissions**: `homeworkSetsRead`, `homeworkSetsManage`,
  `homeworkGenerate`, with default *Teacher* and *Homework viewer* groups.
  Resolvers check them, and the models enforce ownership.
- **Uploads**: PDFs go through the gateway proxy at `/pl:homework/upload`.

Details are in [docs/erxes-integration.md](docs/erxes-integration.md); the
rules for changing the code are in [AGENTS.md](AGENTS.md).

## Standalone web app and Chrome extension

`web/` (Next.js with its own MongoDB and accounts) and `extension/` (a Chrome
side panel for that web app) are the earlier standalone version. They still
run (`pnpm dev`, `pnpm seed`, `pnpm run dev:extension`; see `web/.env.mongodb.example`)
but are not part of the erxes plugin or its release.
