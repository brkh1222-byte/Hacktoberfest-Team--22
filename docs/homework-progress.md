# Homework Library

This workspace adds a Mongolian teacher exercise library and Chrome extension alongside the erxes scaffold. The web app persists accounts and lesson sets in local MongoDB and keeps private PDF uploads on disk. It does not require Supabase or a hosted database project.

For local startup, see the root README: install dependencies, start local MongoDB, copy `web/.env.mongodb.example` to `web/.env.local`, set a private `AUTH_SECRET`, then start the web app. Optional demo data can be created with `pnpm seed`.

Teacher passwords are hashed with scrypt. API bearer tokens are signed by the server and expire after seven days. Lesson pair saves are atomic as one MongoDB document. Upload records bind local PDF paths to their owner, and upload files are stored outside git. The extension keeps only the user session token in Chrome storage and talks to the web API.

Live Anthropic generation requires the team's own `ANTHROPIC_API_KEY`. The README documents local API and MongoDB deployment considerations.
