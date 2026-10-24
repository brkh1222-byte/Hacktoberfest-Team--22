# Installing the Homework plugin for erxes

Homework adds an exercise library to erxes. Teachers generate in-class
exercises and homework from a lesson's text, PDF or voice notes, review and
edit every question, save sets privately or share them with colleagues in the
organization, copy and rate shared sets, and print student and teacher
versions.

It runs as a standard erxes plugin: one API service that joins your gateway,
and one static UI bundle that core-ui loads. Teachers sign in with their erxes
accounts, data stays in your erxes MongoDB, and erxes permissions control who
may do what.

## Requirements

- erxes 3.3.2 or later (the plugin targets the 3.3.x shared-library baseline)
- The same Redis and MongoDB your erxes gateway and core-api use
- A static host or CDN for the UI files, reachable from your users' browsers
- Teachers enter their own provider API credentials in Homework settings.
  Configure `HOMEWORK_API_KEY_SECRET` to encrypt these credentials at rest.

## What is in the release

| Path           | Contents                                                                           |
| -------------- | ---------------------------------------------------------------------------------- |
| `Dockerfile`   | Builds the API image; installs exact dependency versions from `api/pnpm-lock.yaml` |
| `api/`         | Compiled API (`dist/`) with its lockfile                                           |
| `ui/`          | The UI remote; upload the whole folder                                             |
| `erxes.json`   | Plugin identity (`homework`, remote `homework_ui`, route `/homework`)              |
| `.env.example` | API configuration                                                                  |
| `release.json` | Version metadata                                                                   |

## 1. Publish the UI

Upload everything in `ui/` to your static host, for example under
`https://cdn.example.com/homework_ui/`.

- Upload the hashed chunks first and `remoteEntry.js` last.
- Serve `remoteEntry.js`, `mf-manifest.json` and `mf-stats.json` with
  `Cache-Control: no-store` (or revalidation). Other files may be cached.
- Allow CORS from your erxes UI origin.
- Keep the previous release's chunks during an upgrade so open sessions can
  finish loading.

The UI is not bundled with React, Apollo or the erxes design system: it uses
the copies your erxes host already provides.

## 2. Run the API

```sh
docker build --build-arg UI_ENTRY_URL=https://cdn.example.com/homework_ui/remoteEntry.js -t homework-api:1.0.0 .
docker run -d --name plugin-homework-api --network <erxes-network> \
  --env-file .env homework-api:1.0.0
```

Copy `.env.example` to `.env` and set:

| Variable                                     | Required             | Meaning                                                                                                         |
| -------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | yes                  | The Redis erxes uses; the plugin registers with the gateway through it                                          |
| `MONGO_URL`                                  | yes                  | The MongoDB erxes uses                                                                                          |
| `UI_ENTRY_URL`                               | yes                  | Browser URL of `remoteEntry.js` from step 1                                                                     |
| `LOAD_BALANCER_ADDRESS`                      | no                   | How the gateway reaches the API; defaults to `http://plugin-homework-api:80`                                    |
| `HOMEWORK_API_KEY_SECRET`                    | required for live AI | Base64-encoded 32-byte encryption key for teacher provider credentials; generate with `openssl rand -base64 32` |
| `VERSION`                                    | no                   | `saas` on multi-tenant erxes                                                                                    |

The container listens on port 80 and answers `GET /health`. **Keep that port
on the private network**: the gateway forwards the signed-in user as request
headers, and the API trusts them, so only the gateway may reach it. Your public
ingress must strip `user`, `userid`, `hostname` and `nginx-hostname` headers
from client requests.

## 3. Enable it in erxes

Add `homework` to `ENABLED_PLUGINS` for the gateway and core-api, then restart
both:

```sh
ENABLED_PLUGINS=...,homework
```

**Homework** appears in the erxes sidebar at `/homework`.

## 4. Grant access

Organization owners have full access. For everyone else, an administrator
assigns one of the plugin's permission groups in Settings → Permissions:

| Group           | Can                                                                                |
| --------------- | ---------------------------------------------------------------------------------- |
| Teacher         | Browse, print, generate, save, edit, publish, copy, rate and delete their own sets |
| Homework viewer | Browse and print shared sets                                                       |

The underlying actions are `homeworkSetsRead`, `homeworkSetsManage` and
`homeworkGenerate`. Teachers always edit only their own sets and see other
teachers' sets only when those are published to the organization's library.

## Data

All data is stored in the organization's erxes database:

| Collection               | Contents                                                                    |
| ------------------------ | --------------------------------------------------------------------------- |
| `homework_exercise_sets` | Sets and their questions                                                    |
| `homework_ratings`       | One rating per teacher per set                                              |
| `homework_profiles`      | Each teacher's school, district, subjects and grades                        |
| `homework_uploads`       | Lesson PDFs while they are being used; deleted automatically after 24 hours |

Back them up with the rest of your erxes database. Teachers choose a provider, model and API key in Homework settings. Credentials are encrypted in `homework_profiles` with AES-256-GCM using `HOMEWORK_API_KEY_SECRET`; this secret must be backed up separately and kept private. The plugin sends lesson text and PDFs only to the teacher-selected provider. OpenAI-compatible custom endpoints must use public HTTPS; custom endpoints support lesson text, while PDF support is limited to Anthropic, OpenAI and Gemini provider integrations.

## Local demo

On a machine running erxes locally (gateway on `:4000`, UI on `:3001`, local
MongoDB and Redis), from the plugin's source repository:

```sh
pnpm install
cp .env.example .env    # REDIS_*, MONGO_URL=mongodb://127.0.0.1:27017/erxes
pnpm run dev:api
pnpm run dev:ui
```

Set `ENABLED_PLUGINS=...,homework` in erxes's `.env`, restart the gateway and
core-api, and open `http://localhost:3001/homework`.

## Upgrading

Publish the new `ui/` (keeping old chunks), then replace the API container.
The gateway picks up schema changes when the new API registers.
