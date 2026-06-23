create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete restrict,
  assessment_id uuid references public.assessments(id) on delete set null,
  package_key text not null,
  stripe_product_id text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  currency text not null default 'USD',
  subtotal_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  setup_fee_amount numeric(10,2) not null default 0,
  recurring_amount numeric(10,2) not null default 0,
  promotion_code text,
  stripe_promotion_code_id text,
  stripe_coupon_id text,
  campaign_source text,
  partner_reference text,
  purchase_status text not null default 'initialized' check (purchase_status in ('initialized','checkout_started','checkout_completed','paid','failed','refunded','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','succeeded','failed','requires_action','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete restrict,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  package_key text not null,
  status text not null default 'trialing' check (status in ('trialing','active','past_due','unpaid','canceled','incomplete','incomplete_expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  trial_end timestamptz,
  latest_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  package_key text not null,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  promotion_code text,
  promotion_code_display text,
  discount_amount numeric(10,2) default 0,
  status text not null default 'pending' check (status in ('pending','started','completed','expired','abandoned','failed')),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.purchases(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  event_type text not null,
  stripe_event_id text,
  provider text not null default 'stripe',
  event_payload jsonb not null default '{}'::jsonb,
  status text not null default 'recorded',
  created_at timestamptz not null default now()
);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.purchases(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  stripe_coupon_id text,
  stripe_promotion_code_id text,
  promotion_code text,
  discount_type text,
  discount_value numeric(10,2),
  discount_duration text,
  discount_amount_applied numeric(10,2),
  campaign_source text,
  partner_reference text,
  status text not null default 'entered' check (status in ('entered','applied','rejected')),
  created_at timestamptz not null default now()
);

create table public.activation_records (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete restrict,
  assessment_id uuid references public.assessments(id) on delete set null,
  package_key text not null,
  status text not null default 'payment_confirmed' check (status in ('payment_confirmed','onboarding_required','pending_manual_review','activated')),
  requires_manual_review boolean not null default false,
  review_reason text,
  onboarding_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_sales_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete restrict,
  assessment_id uuid references public.assessments(id) on delete set null,
  conversation_token_hash text not null unique,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_sales_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_sales_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  message text not null,
  action_suggestion text,
  created_at timestamptz not null default now()
);

create table public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete restrict,
  delivery_type text not null,
  channel text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  provider_message_id text,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  processing_status text not null default 'received' check (processing_status in ('received','processing','succeeded','failed','duplicate')),
  attempt_count integer not null default 0,
  processed_at timestamptz,
  error_details text,
  created_at timestamptz not null default now(),
  unique(provider, external_event_id)
);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  external_booking_id text,
  provider text not null default 'booking',
  status text not null default 'pending' check (status in ('pending','booked','completed','failed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchases_lead_idx on public.purchases(lead_id, created_at desc);
create index purchases_status_idx on public.purchases(purchase_status, payment_status);
create index subscriptions_lead_idx on public.subscriptions(lead_id, status);
create index checkout_sessions_lead_idx on public.checkout_sessions(lead_id, created_at desc);
create index webhook_events_provider_idx on public.webhook_events(provider, processing_status, created_at desc);
create index activation_records_lead_idx on public.activation_records(lead_id, created_at desc);
create index ai_sales_conversations_lead_idx on public.ai_sales_conversations(lead_id, created_at desc);
create index report_deliveries_assessment_idx on public.report_deliveries(assessment_id, created_at desc);
create index booking_events_lead_idx on public.booking_events(lead_id, created_at desc);

create trigger purchases_updated_at before update on public.purchases for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger checkout_sessions_updated_at before update on public.checkout_sessions for each row execute function public.set_updated_at();
create trigger activation_records_updated_at before update on public.activation_records for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.ai_sales_conversations for each row execute function public.set_updated_at();
create trigger booking_events_updated_at before update on public.booking_events for each row execute function public.set_updated_at();
