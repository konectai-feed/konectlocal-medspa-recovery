# KonectLocal Med Spa Recovery Platform

Build 1–2 foundation for the KonectLocal Med Spa Revenue Recovery Assessment.

## Stack
- Next.js App Router with strict TypeScript
- Tailwind CSS and accessible primitives
- Supabase Auth/Postgres clients split between browser, server, and service-role modules
- Zod environment validation
- Vitest, Playwright, ESLint, Prettier

## Local setup
1. Copy `.env.example` to `.env.local` and set Supabase values.
2. Install dependencies: `npm install`.
3. Run the app: `npm run dev`.

## Supabase setup
Run migrations in order from `supabase/migrations` against an empty Supabase project. The first migration enables extensions, creates application tables, helper functions, indexes, triggers, RLS policies, and seeds active formula/benchmark versions.

## Checks
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:rls`
- `npm run test:e2e`
- `npm run build`

## Deployment
Deploy to Vercel with the variables in `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` must be configured only as a server-side secret and is imported solely from `lib/supabase/service-role.ts`.

## Security notes
Public mutations are intended to go through Next.js Route Handlers using server-side validation. The browser Supabase client receives only the project URL and anon key. Report links store token hashes only. No patient records or medical information are modeled.
