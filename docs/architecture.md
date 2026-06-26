# Build 4B Onboarding and Activation Additions

## Data model
- `customer_onboarding`: canonical onboarding/activation progression state with timestamps, manual review flags, and assignment fields.
- `onboarding_tokens`: opaque token hash storage with expiration, revocation, and replacement linking.
- `onboarding_responses`: auditable typed field responses by section/field key with per-field versioning.
- `onboarding_events`: append-only lifecycle and audit event stream.
- `activation_tasks`: idempotent package-specific activation checklist records.
- `provisioning_runs`: Vendasta dry-run/live attempt ledger with idempotency keys and redacted payload support.

## API surface
- Customer token endpoints:
	- `GET /api/onboarding/[token]`
	- `PATCH /api/onboarding/[token]`
	- `POST /api/onboarding/[token]/submit`
- Admin activation endpoints:
	- `GET /api/admin/activations`
	- `PATCH /api/admin/activations/[onboardingId]`

## Security and controls
- Tokens are random opaque values; only hashes are stored.
- Token validation, expiration, and revocation are enforced server-side.
- API routes apply in-memory rate limiting for access/save/submit requests.
- Admin access requires authenticated admin role or `ADMIN_EMAIL_ALLOWLIST` match.
- RLS allows onboarding table access only to `service_role`; public direct querying is blocked.

## Lifecycle orchestration
- Stripe subscription confirmation hooks create/update onboarding and issue onboarding links.
- Status transitions enforce legal paths and emit onboarding events.
- Brevo lifecycle sync actions are translated from onboarding status and queued as retryable integration jobs.
- Vendasta payload preparation records provisioning runs in dry-run mode by default.
# Build 1–2 Architecture Notes

- Route groups separate the public shell and protected admin shell.
- `lib/env.ts` validates public/runtime environment values with Zod; `lib/env.server.ts` and `lib/supabase/service-role.ts` are server-only.
- `supabase/migrations/0001_foundation.sql` is the source of truth for the Build 2 schema, RLS, functions, indexes, triggers, and seeds.
- Authoritative public writes will be implemented as server endpoints in later builds; direct anonymous table access is intentionally absent.
- Assessment formulas and benchmarks are versioned JSON seeds and constrained to one active row each.
