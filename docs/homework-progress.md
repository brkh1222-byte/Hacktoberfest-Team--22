# Homework Library implementation

The requested product is added in `web/` and `extension/` alongside the erxes scaffold. It uses separate Supabase authentication and data. No existing database is reset.

## Phase 1

Next.js, TypeScript, Tailwind, a typed Supabase client, Mongolian strings, and the SQL migration are scaffolded. Run `pnpm dev` for the web app on port 3000. Copy `web/.env.example` to `web/.env.local` and apply the SQL migration to a Supabase project. Authentication and the library arrive in the next phases. No credentials are supplied or invented.

## Phase 2

Added email/password login, registration with teacher details, a protected personal collection, and authenticated bearer-token API routes. Supabase verifies tokens on the server; the UI guard is only a convenience. Run `pnpm dev`, register at `/register`, and visit `/my-sets`. Accounts and persistence are real Supabase operations; missing Supabase configuration produces setup guidance. No auth bypass or mock accounts are enabled.

## Phase 3

Added `/generate`, private PDF uploads, direct Claude document inputs, `mn-MN` speech recognition with editable textarea fallback, two-set editing, and atomic private/public saves. Run `pnpm dev` and open `/generate` after signing in. `claude-sonnet-5-5` is isolated in `web/src/lib/ai/generate.ts`; malformed JSON gets one retry. Without the Anthropic key, the UI explicitly labels the fixed Mongolian fractions fixture as a mock. Supabase and browser speech recognition are not mocked.

## Phase 4

Added the searchable public library, filters and sorting, set details, owner editing and publication controls, atomic copying, ratings, answer-key toggles, text export, and student/teacher print views. Run `pnpm dev` and visit `/library`. Run `pnpm seed` only after configuring the service-role key and your demo password to create four demo teachers and twenty public sets. Seed data is fictional instructional content; ratings/copy counts are real and are not artificially inflated. Live Supabase verification still requires project credentials.
