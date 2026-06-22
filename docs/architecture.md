# Build 1–2 Architecture Notes

- Route groups separate the public shell and protected admin shell.
- `lib/env.ts` validates public/runtime environment values with Zod; `lib/env.server.ts` and `lib/supabase/service-role.ts` are server-only.
- `supabase/migrations/0001_foundation.sql` is the source of truth for the Build 2 schema, RLS, functions, indexes, triggers, and seeds.
- Authoritative public writes will be implemented as server endpoints in later builds; direct anonymous table access is intentionally absent.
- Assessment formulas and benchmarks are versioned JSON seeds and constrained to one active row each.
