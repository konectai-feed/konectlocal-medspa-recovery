create table public.customer_onboarding (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  activation_id uuid references public.activation_records(id) on delete set null,
  lead_id uuid not null references public.leads(id) on delete restrict,
  assessment_id uuid references public.assessments(id) on delete set null,
  package_key text not null,
  status text not null default 'required' check (
    status in (
      'required',
      'started',
      'in_progress',
      'submitted',
      'activation_review',
      'configuration',
      'ready_for_launch',
      'active',
      'delayed',
      'cancelled'
    )
  ),
  completion_percent integer not null default 0 check (completion_percent >= 0 and completion_percent <= 100),
  current_step text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  launch_ready_at timestamptz,
  activated_at timestamptz,
  delayed_at timestamptz,
  cancelled_at timestamptz,
  delay_reason text,
  cancellation_reason text,
  manual_review_required boolean not null default false,
  assigned_to uuid references auth.users(id) on delete set null,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customer_onboarding_active_purchase_idx
  on public.customer_onboarding(purchase_id)
  where cancelled_at is null;

create index customer_onboarding_status_idx
  on public.customer_onboarding(status, created_at desc);

create table public.onboarding_tokens (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.customer_onboarding(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accessed_at timestamptz,
  revoked_at timestamptz,
  replaced_by_token_id uuid references public.onboarding_tokens(id) on delete set null,
  created_at timestamptz not null default now()
);

create index onboarding_tokens_onboarding_idx
  on public.onboarding_tokens(onboarding_id, created_at desc);

create table public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.customer_onboarding(id) on delete cascade,
  section text not null,
  field_key text not null,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_json jsonb,
  value_type text not null check (value_type in ('text', 'number', 'boolean', 'json')),
  version integer not null default 1,
  source text not null default 'customer' check (source in ('customer', 'admin', 'system')),
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (onboarding_id, section, field_key)
);

create index onboarding_responses_onboarding_idx
  on public.onboarding_responses(onboarding_id, section);

create table public.onboarding_events (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.customer_onboarding(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  actor_type text not null default 'system' check (actor_type in ('customer', 'admin', 'system')),
  actor_id text,
  occurred_at timestamptz not null default now()
);

create index onboarding_events_onboarding_idx
  on public.onboarding_events(onboarding_id, occurred_at desc);

create table public.activation_tasks (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid references public.activation_records(id) on delete set null,
  onboarding_id uuid not null references public.customer_onboarding(id) on delete cascade,
  task_key text not null,
  category text not null,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  required boolean not null default true,
  blocked_reason text,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (onboarding_id, task_key)
);

create index activation_tasks_onboarding_idx
  on public.activation_tasks(onboarding_id, status, created_at desc);

create table public.provisioning_runs (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid references public.activation_records(id) on delete set null,
  onboarding_id uuid references public.customer_onboarding(id) on delete set null,
  provider text not null,
  mode text not null check (mode in ('dry_run', 'live')),
  idempotency_key text not null,
  request_payload jsonb,
  response_payload jsonb,
  status text not null default 'queued' check (status in ('queued', 'started', 'succeeded', 'failed')),
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create index provisioning_runs_activation_idx
  on public.provisioning_runs(activation_id, status, created_at desc);

create trigger customer_onboarding_updated_at
  before update on public.customer_onboarding
  for each row execute function public.set_updated_at();

create trigger activation_tasks_updated_at
  before update on public.activation_tasks
  for each row execute function public.set_updated_at();

alter table public.customer_onboarding enable row level security;
alter table public.onboarding_tokens enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.onboarding_events enable row level security;
alter table public.activation_tasks enable row level security;
alter table public.provisioning_runs enable row level security;

create policy customer_onboarding_service_role_all
  on public.customer_onboarding
  for all
  to service_role
  using (true)
  with check (true);

create policy onboarding_tokens_service_role_all
  on public.onboarding_tokens
  for all
  to service_role
  using (true)
  with check (true);

create policy onboarding_responses_service_role_all
  on public.onboarding_responses
  for all
  to service_role
  using (true)
  with check (true);

create policy onboarding_events_service_role_insert
  on public.onboarding_events
  for insert
  to service_role
  with check (true);

create policy onboarding_events_service_role_select
  on public.onboarding_events
  for select
  to service_role
  using (true);

create policy activation_tasks_service_role_all
  on public.activation_tasks
  for all
  to service_role
  using (true)
  with check (true);

create policy provisioning_runs_service_role_all
  on public.provisioning_runs
  for all
  to service_role
  using (true)
  with check (true);
