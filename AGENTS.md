# homework

Homework plugin for erxes: exercise and homework sets generated from a
lesson, shared in a tenant library, printed as worksheets

An erxes plugin outside the erxes monorepo: `api/` (Node.js 22,
erxes-api-shared startPlugin + tenant-scoped Mongoose models (Node.js)) and `ui/` (React 18 Module Federation remote). `erxes.json`
is the single source of the plugin's identity and ports.

## Commands

- `pnpm install`
- `pnpm run dev:api` / `pnpm run dev:ui`
- `pnpm run codegen`
- `pnpm run check`, `pnpm run lint`, `pnpm run build`, `pnpm run fmt`
- `pnpm test` (API tests use a throwaway `homework_test` database on local MongoDB)
- `pnpm run package` builds the sellable release in `release/` (see `docs/installation.md`)
- `docker build --build-arg UI_ENTRY_URL=<remoteEntry.js URL> -t <image> .`

Run `check`, `lint`, `test` and `build` before calling a change done.

`web/` and `extension/` are the earlier standalone Next.js app and Chrome
extension. They are not part of the erxes plugin or its release.

## Naming invariants

See `docs/erxes-integration.md`. In short:

- `erxes.json` `name` (`homework`) drives Redis keys, `ENABLED_PLUGINS`, the
  docker host `plugin-homework-api` and the CDN folder `homework_ui`.
- `ui.name` (`homework`) is `CONFIG.name`, the page expose `./homework`,
  and the API permission identity. Keep the public name, including dashes;
  `ui.remote` (`homework_ui`) is what core-api derives from `name`.
- Change names only in `erxes.json`, and only all together.

## Contracts

- `api/src/main.ts` boots through erxes-api-shared `startPlugin`, which owns
  gateway registration (including `UI_ENTRY_URL`), `/health`, `/graphql`,
  gateway-header parsing and — in production — the router-update BullMQ job.
- Tenant data goes through `generateModels(subdomain, context)` onto `context.models`;
  never connect to Mongo directly. `checkPermission(action)` is on the context.
- Ownership lives in the models (`api/src/modules/homework/db/models`): reads
  by id match public or own sets only, writes match `ownerId`. Keep new
  queries behind those statics rather than raw `find` calls in resolvers.
- PDF uploads use `uploadRouter` at `/upload`, reached as
  `<gateway>/pl:homework/upload`; it checks `homeworkGenerate` itself.
- Prefix every GraphQL type with `Homework` and every operation and root
  field with `homework`; the supergraph is shared by all plugins.
- `ui/src/config.tsx` exports `CONFIG`; `ui/src/Main.tsx` exports `Homework`;
  the only baseline exposes are `./config` and `./homework`. The plugin owns
  `/homework/settings` and its sidebar through `AppLayout`; the host does not
  mount a separate settings expose. Keep `ui/rspack.config.ts` in sync with
  `erxes.json`. Add notification widgets only when implementing notifications.
- `api/src/print-schema.ts` prints `typeDefs` from `api/src/graphql/schema.ts` to `api/generated/schema.graphql`.
- `erxes-ui`, `ui-modules` and `erxes-api-shared` are the npm packages
  `@erxes/ui`, `@erxes/ui-modules` and `@erxes/api-shared`, installed under
  those import names with exact npm aliases. The tested cohort is
  `3.3.2`; update all three together and validate the deployment.

## Rules

- No `any`; named exports (default export only where a tool requires it, e.g.
  `rspack.config.ts`).
- The `hostShared` list in `ui/rspack.config.ts` (`react`, `react-dom`,
  `react-router`, `react-router-dom`, `@apollo/client`, `jotai`,
  `react-i18next`, `erxes-ui`, `ui-modules`) mirrors core-ui's shared
  singletons: they stay `import: false` and are never bundled — the host
  provides them at runtime. Keep the list in sync with core-ui's
  `coreLibraries`.
- `erxes-ui`/`ui-modules` imports resolve to the shared singleton at runtime,
  so the installed versions should match the host's — they only decide what
  TypeScript and Rspack resolve against.
- UI classes use the `homework:` Tailwind prefix and the host tokens
  (`bg-background`, `text-muted-foreground`, `border-border`, …).
- Authorize in the API using `context.user`; the UI route guard is not a
  security boundary. Platform data resolvers must also await
  `checkPermission(action)` and use tenant-bound models and bounded pagination.
  Forwarded identity/tenant headers are trusted gateway assertions, not
  authentication: keep API ports private and strip client identity headers at
  the public ingress. See the integration docs before deployment.
- Every query has loading, error and empty states; refetch or update the
  Apollo cache after each mutation.
- GraphQL documents are `gql()` from `~/gql` — generated into `ui/src/gql/`
  by `codegen` from `api/generated/schema.graphql` — written as a function
  call on a static string with no `${}` interpolation.
- Apollo hooks infer their types from the document: no `useQuery<T>` or
  `useMutation<T>` generics and no handwritten response interfaces; derive
  types from the generated `*Query` types.
- `api/generated` and `ui/src/gql` are gitignored; `check`, `build` and
  `dev:ui` run `codegen` first. Run `pnpm run codegen` after changing a
  document or the schema.
