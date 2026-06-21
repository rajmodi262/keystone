# Deploying Keystone (Vercel + Neon)

Free, ~10 minutes. Neon provides Postgres **with pgvector**; Vercel hosts the Next.js app.

## 1. Database — Neon

1. Create a project at <https://neon.tech> (free tier).
2. From the dashboard, copy **two** connection strings:
   - **Pooled** (has `-pooler` in the host) → used by the app at runtime → `DATABASE_URL`
   - **Direct** (no `-pooler`) → used for migrations → `DIRECT_URL`
   Both end with `?sslmode=require`.
3. Apply the schema + demo data (run locally, pointed at the **direct** URL):
   ```bash
   DATABASE_URL="<neon-direct-url>" npx prisma migrate deploy
   DATABASE_URL="<neon-direct-url>" npm run db:seed
   ```
   The migration enables the `vector` extension automatically.

## 2. App — Vercel

1. <https://vercel.com> → **Add New… → Project** → import `rajmodi262/keystone`.
2. Framework preset: **Next.js** (auto-detected). Leave build/output defaults.
3. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | the Neon **pooled** URL |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` (any 32+ char secret) |
   | `NEXTAUTH_URL` | `https://<your-project>.vercel.app` |
   | `OPENAI_API_KEY` | *(optional)* real embeddings + LLM conflicts |
4. **Deploy.** First build runs `prisma generate` (postinstall) then `next build`.
5. After the first deploy, set `NEXTAUTH_URL` to the real assigned domain and **Redeploy** (so auth callbacks match).

## Notes
- Sign in to the live demo with `demo@keystone.dev` / `password123` (from the seed).
- Prisma uses the pooled URL at runtime (serverless-safe) and the direct URL only for migrations.
- `vector(1536)` embeddings work on Neon out of the box.
