# KonectLocal Med Spa Recovery Platform
## Production Product Requirements and Build Specification — V1.0

**Repository:** `konectlocal-medspa-recovery`  
**Supabase project:** `konectlocal-medspa-recovery`  
**Primary deployment:** Vercel  
**Product owner:** KonectLocal  
**Status:** Approved for Build 1 and Build 2 after configuration review

---

# 1. Product Definition

## 1.1 Product name

**KonectLocal Med Spa Revenue Recovery Assessment**

## 1.2 Core positioning

**AI-powered revenue recovery for med spas**

The platform identifies where a med spa is losing revenue between the first inquiry, consultation, treatment, next appointment, and long-term patient retention.

It is not a generic marketing quiz. It is a business diagnostic, package-recommendation engine, sales-routing system, reporting tool, and onboarding handoff.

## 1.3 Primary user outcomes

A med spa operator should leave the assessment with:

1. A Revenue Recovery Score from 0–100.
2. A recovery category.
3. A conservative estimated monthly recovery opportunity.
4. The three most important revenue leaks.
5. Positive operational findings.
6. A personalized 30-day action plan.
7. One primary KonectLocal package recommendation.
8. A report that can be viewed online, downloaded, and emailed.
9. A clear booking path for a Revenue Recovery Review.

## 1.4 KonectLocal business outcomes

The platform must:

- convert qualified med spa traffic into completed assessments;
- distinguish lower-complexity and higher-complexity opportunities;
- prioritize HOT leads;
- route prospects to the $599 or $999 package;
- preserve campaign attribution;
- trigger Brevo nurture before purchase;
- stop pre-purchase nurture after booking or purchase;
- hand off purchased accounts to Vendasta/Partner Center;
- provide a measurable sales pipeline.

## 1.5 V1 exclusions

V1 will not:

- store patient records;
- store medical information;
- make treatment recommendations;
- diagnose operational or clinical conditions;
- include provider Google Business Profile analysis;
- directly modify a med spa’s CRM or patient-management system;
- guarantee revenue;
- activate Vendasta products automatically unless a later integration is explicitly approved.

---

# 2. Target Users and Roles

## 2.1 Public prospect

Typical users:

- med spa owner;
- practice manager;
- operations manager;
- marketing manager;
- multi-location operator.

Capabilities:

- begin assessment;
- save partial progress;
- submit contact information;
- complete assessment;
- view personalized results;
- edit selected assumptions;
- download report;
- book a review;
- view recommended package.

## 2.2 KonectLocal sales user

Capabilities:

- view qualified leads;
- filter by score, city, package, campaign, and status;
- review assessment responses;
- review opportunity assumptions;
- add notes;
- assign owner;
- update lead status;
- resend report;
- export records;
- mark won or lost.

## 2.3 KonectLocal administrator

Capabilities:

- all sales-user capabilities;
- activate formula versions;
- manage benchmark versions;
- manage package rules;
- view all event data;
- manage user access;
- view integration failures;
- retry failed Brevo syncs;
- configure suppression and consent policies.

---

# 3. Functional Requirements

## 3.1 Public landing page

Required elements:

- premium med-spa-specific design;
- headline: **How Much Revenue Is Your Med Spa Losing Between the First Inquiry and the Next Appointment?**
- supporting explanation;
- credibility block explaining what the assessment measures;
- estimated completion time;
- privacy and business-diagnostic disclaimer;
- primary CTA: **Calculate My Recovery Opportunity**;
- campaign attribution capture;
- return-visitor resume behavior.

## 3.2 Assessment flow

The assessment must:

- contain five visual steps;
- use large selectable answer cards;
- show progress;
- validate required answers;
- autosave after each answer;
- support mobile devices;
- allow backwards navigation;
- preserve UTM and campaign data;
- display a preliminary score only when useful;
- perform authoritative scoring on the server;
- support abandonment recovery through a secure resume token.

## 3.3 Contact capture

Recommended placement:

- after Step 3, before sensitive commercial results are calculated.

Required fields:

- first name;
- last name;
- business name;
- work email;
- phone;
- website;
- city;
- state;
- consent checkbox for email delivery and follow-up;
- optional SMS consent as a separate checkbox.

The form must:

- deduplicate by normalized email;
- preserve the richer existing record;
- avoid creating duplicate active nurture contacts;
- record exact consent text and version;
- record source and campaign data.

## 3.4 Results page

Required modules:

- Revenue Recovery Score;
- recovery category;
- estimated monthly recovery range;
- confidence level;
- top three leaks;
- positive findings;
- 30-day recovery plan;
- recommended package;
- package justification;
- booking CTA;
- package CTA;
- report-download CTA;
- editable assumptions;
- disclaimer that estimates are not guaranteed.

Only one package receives primary emphasis.

## 3.5 PDF report

The server-generated report must contain:

- KonectLocal branding;
- business name;
- completion date;
- score and category;
- estimated low and high opportunity;
- assumptions;
- top leaks;
- positive findings;
- 30-day plan;
- package recommendation;
- CTA and booking link;
- formula version;
- legal disclaimer.

The public report URL must use a non-guessable token and must not expose internal database IDs.

## 3.6 Admin dashboard

V1 admin modules:

- overview KPIs;
- completion funnel;
- HOT leads;
- bookings;
- proposals;
- won MRR;
- open MRR pipeline;
- package recommendation split;
- leads by city and state;
- common revenue leaks;
- campaign performance;
- searchable lead table;
- lead detail;
- notes;
- status;
- owner assignment;
- resend report;
- CSV export;
- integration error view.

---

# 4. Finalized V1 Assessment Schema

## 4.1 General schema rules

Each answer option must contain:

- `value`;
- `label`;
- `score_points`;
- `calculation_factor`;
- `display_order`;
- `active`;
- optional `routing_flags`.

Profile questions do not directly increase the leakage score unless stated. They drive estimates, confidence, and package routing.

---

## Step 1 — Practice Profile

### Q1. Number of locations

**Key:** `location_count_band`  
**Type:** single select  
**Required:** yes

Options:

| Value | Label | Representative value | Routing |
|---|---|---:|---|
| `one` | 1 location | 1 | Standard-friendly |
| `two_three` | 2–3 locations | 2 | Command Center signal |
| `four_nine` | 4–9 locations | 5 | Strong Command Center signal |
| `ten_plus` | 10+ locations | 10 | Mandatory sales review |

### Q2. Monthly treatment inquiries

**Key:** `monthly_inquiry_band`  
**Type:** single select  
**Required:** yes

| Value | Label | Calculation value |
|---|---|---:|
| `under_25` | Fewer than 25 | 18 |
| `25_49` | 25–49 | 37 |
| `50_99` | 50–99 | 75 |
| `100_199` | 100–199 | 150 |
| `200_399` | 200–399 | 300 |
| `400_plus` | 400+ | 500 |

The assumption editor may later allow an exact monthly inquiry number.

### Q3. Average first treatment or package value

**Key:** `average_value_band`  
**Type:** single select  
**Required:** yes

| Value | Label | Calculation value |
|---|---|---:|
| `under_250` | Under $250 | 175 |
| `250_499` | $250–$499 | 375 |
| `500_999` | $500–$999 | 750 |
| `1000_1999` | $1,000–$1,999 | 1,400 |
| `2000_plus` | $2,000+ | 2,500 |

---

## Step 2 — Inquiry Response

### Q4. What usually happens when your team cannot answer a call?

**Key:** `missed_call_handling`  
**Weight:** 12

| Value | Label | Points | Missed-contact factor |
|---|---|---:|---:|
| `live_backup` | Another person or service answers live | 0 | 0.03 |
| `instant_ai_or_text` | The caller receives an immediate automated response | 2 | 0.06 |
| `voicemail_fast_callback` | Voicemail with callback usually within 15 minutes | 4 | 0.10 |
| `voicemail_same_day` | Voicemail with callback later the same day | 8 | 0.18 |
| `voicemail_inconsistent` | Voicemail with inconsistent follow-up | 10 | 0.25 |
| `often_lost` | Calls are often missed or not tracked | 12 | 0.32 |

### Q5. How quickly do website, social, and text inquiries receive a first response?

**Key:** `digital_response_time`  
**Weight:** 12

| Value | Label | Points | Response-loss factor |
|---|---|---:|---:|
| `under_5_min` | Under 5 minutes | 0 | 0.03 |
| `5_15_min` | 5–15 minutes | 2 | 0.06 |
| `16_60_min` | 16–60 minutes | 5 | 0.12 |
| `1_4_hours` | 1–4 hours | 8 | 0.20 |
| `same_day` | Later the same day | 10 | 0.28 |
| `next_day_or_inconsistent` | Next day or inconsistent | 12 | 0.36 |

### Q6. Do after-hours inquiries receive an immediate response?

**Key:** `after_hours_coverage`  
**Weight:** 8

| Value | Label | Points | After-hours loss factor |
|---|---|---:|---:|
| `full_coverage` | Yes, calls and digital inquiries | 0 | 0.02 |
| `digital_only` | Digital inquiries only | 2 | 0.06 |
| `basic_auto_reply` | Basic auto-reply, no qualification | 4 | 0.10 |
| `next_business_day` | Usually next business day | 7 | 0.18 |
| `no_process` | No reliable after-hours process | 8 | 0.24 |

---

## Step 3 — Consultation Conversion

### Q7. Approximately what percentage of treatment inquiries book a consultation or appointment?

**Key:** `inquiry_booking_rate_band`  
**Weight:** 10

| Value | Label | Points | Booking-rate assumption |
|---|---|---:|---:|
| `70_plus` | 70% or more | 0 | 0.75 |
| `55_69` | 55–69% | 2 | 0.62 |
| `40_54` | 40–54% | 5 | 0.47 |
| `25_39` | 25–39% | 8 | 0.32 |
| `under_25` | Under 25% | 10 | 0.20 |
| `unknown` | We do not know | 8 | 0.32 |

### Q8. What follow-up occurs when an inquiry does not book?

**Key:** `unbooked_lead_followup`  
**Weight:** 10

| Value | Label | Points | Recoverable-unbooked factor |
|---|---|---:|---:|
| `multichannel_sequence` | Consistent multi-channel sequence | 0 | 0.04 |
| `several_manual_touches` | Several manual follow-ups | 3 | 0.08 |
| `one_or_two_touches` | One or two follow-ups | 6 | 0.14 |
| `inconsistent` | Inconsistent follow-up | 8 | 0.20 |
| `none` | No structured follow-up | 10 | 0.26 |

### Q9. What is your consultation no-show or late-cancellation rate?

**Key:** `no_show_rate_band`  
**Weight:** 8

| Value | Label | Points | No-show assumption |
|---|---|---:|---:|
| `under_5` | Under 5% | 0 | 0.04 |
| `5_9` | 5–9% | 2 | 0.07 |
| `10_14` | 10–14% | 4 | 0.12 |
| `15_24` | 15–24% | 6 | 0.19 |
| `25_plus` | 25% or more | 8 | 0.28 |
| `unknown` | We do not track it | 6 | 0.19 |

### Q10. What happens after a consultation no-show or cancellation?

**Key:** `missed_appointment_recovery`  
**Weight:** 8

| Value | Label | Points | Recoverable-no-show factor |
|---|---|---:|---:|
| `automated_multichannel` | Automated multi-channel rescheduling | 0 | 0.05 |
| `same_day_manual` | Same-day manual follow-up | 2 | 0.09 |
| `one_followup` | Usually one follow-up | 4 | 0.14 |
| `inconsistent` | Inconsistent follow-up | 6 | 0.20 |
| `none` | No defined recovery process | 8 | 0.26 |

---

## Step 4 — Patient Retention

### Q11. How are patients reminded when they are due for another treatment?

**Key:** `treatment_recall_process`  
**Weight:** 8

| Value | Label | Points | Recall-gap factor |
|---|---|---:|---:|
| `automated_personalized` | Automated and treatment-specific | 0 | 0.03 |
| `automated_basic` | Automated but mostly generic | 2 | 0.07 |
| `manual_consistent` | Manual but consistent | 4 | 0.11 |
| `manual_inconsistent` | Manual and inconsistent | 6 | 0.17 |
| `none` | No structured recall process | 8 | 0.23 |

### Q12. How often do you run dormant-patient reactivation campaigns?

**Key:** `reactivation_process`  
**Weight:** 8

| Value | Label | Points | Reactivation-gap factor |
|---|---|---:|---:|
| `monthly_or_always_on` | Monthly or always-on | 0 | 0.02 |
| `quarterly` | Quarterly | 2 | 0.05 |
| `few_times_year` | A few times per year | 4 | 0.09 |
| `rarely` | Rarely | 6 | 0.14 |
| `never` | Never | 8 | 0.20 |

### Q13. Does the practice sell memberships, treatment packages, or recurring plans?

**Key:** `membership_package_maturity`  
**Weight:** 4

| Value | Label | Points | Routing |
|---|---|---:|---|
| `yes_automated` | Yes, with automated nurture and renewal | 0 | Neutral |
| `yes_manual` | Yes, managed mostly manually | 2 | Command Center signal |
| `yes_underperforming` | Yes, but follow-up or renewal is weak | 4 | Strong Command Center signal |
| `no` | No | 1 | Neutral |
| `planning` | Planning to introduce them | 2 | Command Center signal |

This question contributes only four points because not offering memberships is not automatically a severe revenue leak.

---

## Step 5 — Trust and Reporting

### Q14. How are review requests sent after a successful visit?

**Key:** `review_request_process`  
**Weight:** 6

| Value | Label | Points |
|---|---|---:|
| `automated_multichannel` | Automated by text and/or email | 0 |
| `automated_single_channel` | Automated through one channel | 1 |
| `manual_consistent` | Manual but consistent | 3 |
| `manual_inconsistent` | Manual and inconsistent | 5 |
| `none` | No defined review-request process | 6 |

### Q15. Can you see the journey from inquiry to consultation, treatment, and return visit?

**Key:** `reporting_visibility`  
**Weight:** 6

| Value | Label | Points |
|---|---|---:|
| `full_visibility` | Yes, in one connected view | 0 |
| `mostly_connected` | Mostly, with minor gaps | 2 |
| `multiple_systems` | Partially, across multiple systems | 4 |
| `limited` | Very limited visibility | 5 |
| `none` | No reliable attribution | 6 |

---

# 5. Finalized Scoring Configuration

## 5.1 Score formula

```text
recovery_score =
  Q4 + Q5 + Q6 + Q7 + Q8 + Q9 +
  Q10 + Q11 + Q12 + Q13 + Q14 + Q15
```

Maximum score: 100  
Minimum score: 0

Server-side output must be an integer from 0 through 100.

## 5.2 Score bands

| Score | Recovery level | Interpretation |
|---:|---|---|
| 0–24 | Strong foundation | Targeted optimization |
| 25–49 | Moderate revenue leakage | Several fixable gaps |
| 50–74 | Significant revenue leakage | Meaningful revenue loss likely |
| 75–100 | Critical recovery opportunity | Connected recovery system needed |

## 5.3 Leak categories

Each answer maps to one or more leak categories:

- `missed_inquiries`;
- `slow_response`;
- `after_hours`;
- `consultation_conversion`;
- `unbooked_followup`;
- `no_show_recovery`;
- `treatment_recall`;
- `patient_reactivation`;
- `membership_nurture`;
- `review_generation`;
- `reporting_attribution`.

For each category:

```text
category_severity =
  category_points_earned / category_points_available
```

Severity labels:

| Ratio | Severity |
|---:|---|
| 0.00–0.24 | Low |
| 0.25–0.49 | Moderate |
| 0.50–0.74 | High |
| 0.75–1.00 | Critical |

The top three leaks are the three categories with the highest normalized severity. Ties are broken using estimated revenue impact, then configured business priority.

## 5.4 Positive findings

A positive finding is generated when:

- an answer receives no more than 25% of its available points; or
- a category severity is below 0.25.

Show no more than three positive findings.

## 5.5 Confidence score

Confidence is separate from leakage score.

Start at 100 and subtract:

- 10 points for each `unknown` operational answer;
- 10 points if monthly inquiries use the highest open-ended band;
- 10 points if average value uses the highest open-ended band;
- 10 points if website is missing;
- 10 points if email or phone is not verified;
- 10 points if the user materially edits more than three assumptions after scoring.

Confidence bands:

| Score | Label |
|---:|---|
| 80–100 | High |
| 60–79 | Medium |
| Below 60 | Directional |

The UI should never imply that a directional estimate is precise.

---

# 6. Conservative Revenue Estimation Formula

## 6.1 Principles

The estimate must:

- use conservative recoverability assumptions;
- avoid double counting;
- show a range;
- show the assumptions;
- never claim guaranteed revenue;
- be recalculated server-side;
- preserve the active formula version.

## 6.2 Base variables

```text
I = representative monthly inquiry volume
V = representative average first treatment/package value
B = current inquiry-to-booking rate
N = no-show/cancellation rate
```

## 6.3 Component 1 — Missed and slow inquiry recovery

Derive an inquiry loss factor:

```text
response_loss_factor =
  min(
    0.45,
    (missed_contact_factor * 0.40) +
    (response_loss_factor_q5 * 0.40) +
    (after_hours_loss_factor * 0.20)
  )
```

Low estimate:

```text
missed_inquiry_low =
  I * response_loss_factor * 0.10 * 0.35 * V
```

High estimate:

```text
missed_inquiry_high =
  I * response_loss_factor * 0.18 * 0.45 * V
```

Interpretation:

- only 10–18% of affected inquiries are assumed recoverable;
- only 35–45% of recovered conversations are assumed to convert;
- this avoids claiming that all missed inquiries can be won back.

## 6.4 Component 2 — Unbooked consultation recovery

```text
unbooked_inquiries = I * (1 - B)
```

The Q8 answer supplies `recoverable_unbooked_factor`.

Low estimate:

```text
unbooked_low =
  unbooked_inquiries * recoverable_unbooked_factor * 0.12 * V
```

High estimate:

```text
unbooked_high =
  unbooked_inquiries * recoverable_unbooked_factor * 0.22 * V
```

## 6.5 Component 3 — No-show and cancellation recovery

```text
booked_consultations = I * B
missed_appointments = booked_consultations * N
```

Q10 supplies `recoverable_no_show_factor`.

Low estimate:

```text
no_show_low =
  missed_appointments * recoverable_no_show_factor * 0.30 * V
```

High estimate:

```text
no_show_high =
  missed_appointments * recoverable_no_show_factor * 0.50 * V
```

## 6.6 Component 4 — Treatment recall recovery

V1 does not ask for active-patient count. Use a conservative proxy:

```text
estimated_monthly_treated_patients =
  I * B * (1 - N) * 0.70
```

The 0.70 factor conservatively assumes not every booked consultation becomes a first treatment.

Q11 supplies `recall_gap_factor`.

```text
recall_low =
  estimated_monthly_treated_patients * recall_gap_factor * 0.08 * V

recall_high =
  estimated_monthly_treated_patients * recall_gap_factor * 0.14 * V
```

## 6.7 Component 5 — Dormant-patient reactivation

Because V1 does not collect database size, use a capped proxy:

```text
estimated_dormant_pool =
  min(1500, max(50, I * 12 * 1.5))
```

Q12 supplies `reactivation_gap_factor`.

```text
reactivation_low =
  estimated_dormant_pool * reactivation_gap_factor * 0.004 * V

reactivation_high =
  estimated_dormant_pool * reactivation_gap_factor * 0.008 * V
```

This assumes only 0.4–0.8% of the applicable dormant pool converts in a month.

## 6.8 Anti-double-counting adjustment

Raw totals:

```text
raw_low =
  missed_inquiry_low +
  unbooked_low +
  no_show_low +
  recall_low +
  reactivation_low

raw_high =
  missed_inquiry_high +
  unbooked_high +
  no_show_high +
  recall_high +
  reactivation_high
```

Apply overlap adjustment:

```text
adjusted_low = raw_low * 0.80
adjusted_high = raw_high * 0.85
```

## 6.9 Maximum reasonableness cap

```text
monthly_revenue_proxy = I * V
max_low = monthly_revenue_proxy * 0.25
max_high = monthly_revenue_proxy * 0.40
```

Final result:

```text
opportunity_low = min(adjusted_low, max_low)
opportunity_high = min(adjusted_high, max_high)
```

Round:

- below $10,000: nearest $100;
- $10,000–$49,999: nearest $500;
- $50,000+: nearest $1,000.

Ensure:

```text
opportunity_high >= opportunity_low
```

## 6.10 Assumption editor

Editable fields:

- monthly inquiries;
- average first treatment/package value;
- current booking rate;
- no-show rate;
- estimated dormant-patient pool.

Rules:

- edited values must remain inside configured safety limits;
- the server recalculates every result;
- original and edited values are both stored;
- the report must identify edited assumptions;
- editing assumptions does not overwrite original answers.

---

# 7. Package Recommendation Logic

## 7.1 Package IDs

- `lead_revenue_recovery_599`
- `ai_revenue_command_center_999`
- `manual_sales_review`

## 7.2 Command Center routing signals

Assign routing points:

| Signal | Points |
|---|---:|
| 2–3 locations | 2 |
| 4–9 locations | 4 |
| 10+ locations | 6 |
| 100–199 monthly inquiries | 2 |
| 200–399 monthly inquiries | 4 |
| 400+ monthly inquiries | 6 |
| Q4 score 10–12 | 3 |
| Q6 score 7–8 | 3 |
| Recovery score 75–100 | 4 |
| Recovery score 50–74 | 2 |
| Membership answer `yes_manual` or `planning` | 2 |
| Membership answer `yes_underperforming` | 3 |
| Q12 score 6–8 | 2 |
| Q15 score 5–6 | 2 |

Routing:

```text
if location_count >= 10:
    manual_sales_review

elif routing_points >= 8:
    ai_revenue_command_center_999

elif location_count >= 2 and routing_points >= 5:
    ai_revenue_command_center_999

else:
    lead_revenue_recovery_599
```

## 7.3 HOT lead logic

A lead is HOT when any of the following is true:

- recovery score is 75+;
- opportunity low is $10,000+;
- recommended package is $999 and opportunity low is $7,500+;
- 4+ locations;
- booking completed;
- package viewed twice and report downloaded;
- prior campaign opener plus score 60+.

HOT leads trigger an internal alert.

---

# 8. Supabase Database Schema

## 8.1 Extensions

Enable:

- `pgcrypto`;
- `citext`;
- `uuid-ossp` only if needed;
- `pg_trgm` for fuzzy duplicate detection.

## 8.2 Core tables

### `leads`

```sql
id uuid primary key default gen_random_uuid()
first_name text
last_name text
email citext not null
phone text
normalized_phone text
business_name text
website text
normalized_domain text
city text
state text
lead_source text
campaign_id text
campaign_variant text
utm_source text
utm_medium text
utm_campaign text
utm_content text
utm_term text
brevo_contact_id text
vendasta_account_id text
customer_status text not null default 'prospect'
sales_status text not null default 'new'
sales_owner_id uuid null
prior_campaign_opener boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- unique normalized email;
- customer status allow-list;
- sales status allow-list.

### `assessment_sessions`

Used for partial progress.

```sql
id uuid primary key default gen_random_uuid()
lead_id uuid null references leads(id)
resume_token_hash text not null
status text not null default 'started'
current_step integer not null default 1
answers jsonb not null default '{}'::jsonb
attribution jsonb not null default '{}'::jsonb
expires_at timestamptz not null
last_activity_at timestamptz not null default now()
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `assessments`

```sql
id uuid primary key default gen_random_uuid()
lead_id uuid not null references leads(id)
session_id uuid references assessment_sessions(id)
answer_version text not null
answers jsonb not null
recovery_score integer not null
recovery_level text not null
opportunity_low numeric(12,2) not null
opportunity_high numeric(12,2) not null
confidence_score integer not null
confidence_level text not null
primary_leak text not null
secondary_leak text
third_leak text
recommended_package text not null
routing_score integer not null default 0
account_value_score integer not null default 0
sales_readiness_score integer not null default 0
formula_version text not null
benchmark_version text not null
original_assumptions jsonb not null
edited_assumptions jsonb
calculation_snapshot jsonb not null
submitted_at timestamptz not null default now()
created_at timestamptz not null default now()
```

### `revenue_leaks`

```sql
id uuid primary key default gen_random_uuid()
assessment_id uuid not null references assessments(id) on delete cascade
leak_type text not null
points_earned numeric not null
points_available numeric not null
severity_ratio numeric not null
severity_label text not null
estimated_low numeric(12,2) not null default 0
estimated_high numeric(12,2) not null default 0
recommendation text not null
display_order integer not null
created_at timestamptz not null default now()
```

### `lead_events`

```sql
id uuid primary key default gen_random_uuid()
lead_id uuid references leads(id)
assessment_id uuid references assessments(id)
session_id uuid references assessment_sessions(id)
event_type text not null
event_data jsonb not null default '{}'::jsonb
source text not null default 'web'
occurred_at timestamptz not null default now()
created_at timestamptz not null default now()
```

### `formula_versions`

```sql
version text primary key
active boolean not null default false
scoring_config jsonb not null
revenue_config jsonb not null
routing_config jsonb not null
checksum text not null
effective_at timestamptz not null
created_by uuid
created_at timestamptz not null default now()
```

Only one active formula version is allowed through a partial unique index.

### `benchmark_versions`

```sql
version text primary key
active boolean not null default false
config jsonb not null
source_notes text
effective_at timestamptz not null
created_at timestamptz not null default now()
```

### `consent_records`

```sql
id uuid primary key default gen_random_uuid()
lead_id uuid not null references leads(id)
session_id uuid references assessment_sessions(id)
email_consent boolean not null
sms_consent boolean not null default false
consent_text_version text not null
consent_text_snapshot text not null
ip_hash text
user_agent text
submission_metadata jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
```

### `report_links`

```sql
id uuid primary key default gen_random_uuid()
assessment_id uuid not null references assessments(id)
token_hash text not null unique
status text not null default 'active'
expires_at timestamptz
download_count integer not null default 0
last_accessed_at timestamptz
created_at timestamptz not null default now()
```

### `sales_notes`

```sql
id uuid primary key default gen_random_uuid()
lead_id uuid not null references leads(id)
author_id uuid not null
note text not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `lead_assignments`

```sql
id uuid primary key default gen_random_uuid()
lead_id uuid not null references leads(id)
owner_id uuid not null
assigned_by uuid
assigned_at timestamptz not null default now()
unassigned_at timestamptz
```

### `integration_jobs`

```sql
id uuid primary key default gen_random_uuid()
provider text not null
job_type text not null
lead_id uuid references leads(id)
assessment_id uuid references assessments(id)
payload jsonb not null
status text not null default 'pending'
attempt_count integer not null default 0
next_attempt_at timestamptz
last_error text
idempotency_key text not null unique
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `admin_users`

```sql
user_id uuid primary key
role text not null
active boolean not null default true
created_at timestamptz not null default now()
```

Roles:

- `admin`;
- `sales_manager`;
- `sales_rep`;
- `analyst`.

## 8.3 Recommended indexes

- `leads(email)`;
- `leads(normalized_domain)`;
- `leads(normalized_phone)`;
- trigram index on `business_name`;
- `assessments(lead_id, submitted_at desc)`;
- `assessments(recovery_score desc)`;
- `assessments(recommended_package)`;
- `lead_events(lead_id, occurred_at desc)`;
- `lead_events(event_type, occurred_at desc)`;
- `integration_jobs(status, next_attempt_at)`;
- `assessment_sessions(resume_token_hash)`;
- `report_links(token_hash)`.

## 8.4 Database functions

Required server/database functions:

- `normalize_email`;
- `normalize_phone`;
- `normalize_domain`;
- `upsert_lead`;
- `record_lead_event`;
- `get_active_formula_version`;
- `calculate_recovery_assessment`;
- `generate_report_token`;
- `mark_lead_hot`;
- `set_updated_at`;
- `deduplicate_lead_candidate`.

The authoritative calculation may live in TypeScript initially, but the full calculation snapshot and formula version must be stored. A database function can be added later for independent verification.

---

# 9. Row Level Security Requirements

## 9.1 General rule

Enable RLS on every application table.

No public browser session may:

- select arbitrary leads;
- select arbitrary assessments;
- update formula configuration;
- access integration jobs;
- access admin notes;
- access consent records;
- retrieve reports by database ID.

## 9.2 Public assessment access

Public writes must go through server-side Route Handlers or Server Actions.

Preferred architecture:

```text
Browser
  -> Next.js server endpoint
  -> validation and rate limiting
  -> Supabase service role on server only
```

The service-role key must never be included in browser bundles.

## 9.3 Anonymous direct-access policies

Default: no anonymous direct table access.

If direct Supabase client access is later used for autosave:

- restrict to a dedicated `assessment_sessions` RPC;
- require a signed session token;
- verify token hash;
- limit fields;
- prevent lead enumeration;
- prevent formula access;
- prevent access after expiration.

## 9.4 Admin policies

Authenticated admin access requires:

- valid Supabase Auth user;
- matching active row in `admin_users`;
- role-aware policies.

Examples:

- sales reps may view assigned leads and unassigned HOT leads;
- sales managers may view all sales records;
- analysts may view aggregated data but not consent text or raw phone numbers;
- admins may manage formula and integration configuration.

## 9.5 Audit requirements

Write an event for:

- assessment creation;
- contact capture;
- assessment completion;
- assumption edit;
- report access;
- report resend;
- status change;
- owner assignment;
- export;
- formula activation;
- manual integration retry;
- won/lost update.

---

# 10. Brevo Integration Map

## 10.1 Contact attributes

Create exactly:

- `FIRSTNAME`
- `LASTNAME`
- `BUSINESS_NAME`
- `PHONE`
- `WEBSITE`
- `CITY`
- `STATE`
- `RECOVERY_SCORE`
- `RECOVERY_LEVEL`
- `OPPORTUNITY_LOW`
- `OPPORTUNITY_HIGH`
- `PRIMARY_LEAK`
- `SECONDARY_LEAK`
- `THIRD_LEAK`
- `RECOMMENDED_PACKAGE`
- `REPORT_URL`
- `LEAD_SOURCE`
- `CAMPAIGN_VARIANT`
- `ASSESSMENT_STATUS`
- `BOOKING_STATUS`
- `CUSTOMER_STATUS`
- `PREVIOUS_CAMPAIGN_OPENER`
- `FORMULA_VERSION`

Recommended additional attributes:

- `CONFIDENCE_LEVEL`
- `LOCATION_COUNT`
- `MONTHLY_INQUIRIES`
- `SALES_READINESS_SCORE`
- `ACCOUNT_VALUE_SCORE`
- `LAST_ASSESSMENT_DATE`

## 10.2 Lists

Create:

1. Med Spa Assessment Started
2. Med Spa Assessment Completed
3. Med Spa Assessment Abandoned
4. Med Spa Missed Inquiry Leak
5. Med Spa Consultation Conversion Leak
6. Med Spa No-Show Recovery
7. Med Spa Patient Reactivation
8. Med Spa Revenue System Qualified
9. Med Spa Command Center Qualified
10. Med Spa Booked Review
11. Med Spa Purchased
12. Med Spa Suppression

## 10.3 Event map

| Internal event | Brevo event | Contact/list action |
|---|---|---|
| `assessment_started` | `medspa_assessment_started` | Add Started |
| `contact_captured` | `medspa_contact_captured` | Upsert contact |
| `assessment_step_completed` | `medspa_assessment_progress` | Update status |
| `assessment_abandoned` | `medspa_assessment_abandoned` | Add Abandoned |
| `assessment_completed` | `medspa_assessment_completed` | Add Completed; remove Started/Abandoned |
| `report_emailed` | `medspa_report_sent` | Update report URL |
| `report_downloaded` | `medspa_report_downloaded` | Increase sales readiness |
| `package_viewed` | `medspa_package_viewed` | Add package-qualified list |
| `booking_clicked` | `medspa_booking_clicked` | Increase sales readiness |
| `booking_completed` | `medspa_booking_completed` | Add Booked Review; stop normal nurture |
| `checkout_started` | `medspa_checkout_started` | HOT alert |
| `purchased` | `medspa_purchased` | Add Purchased; remove all pre-purchase nurture |
| `unsubscribed` | `medspa_unsubscribed` | Add Suppression |
| `report_assumptions_edited` | `medspa_assumptions_edited` | Update opportunity values |

## 10.4 Completion routing

On `assessment_completed`:

1. Upsert Brevo contact.
2. Update all contact attributes.
3. Remove Started and Abandoned lists.
4. Add Completed list.
5. Add primary leak list.
6. Add secondary leak list only when severity is High or Critical.
7. Add correct package-qualified list.
8. Trigger report email.
9. Send HOT alert when applicable.
10. Store Brevo response and event result.

## 10.5 Idempotency

Every integration call must use an idempotency key:

```text
provider:event_type:lead_id:assessment_id:event_version
```

Retries must not create duplicate contacts, duplicate report emails, or duplicate list memberships.

---

# 11. API and Application Boundaries

## 11.1 Suggested Next.js routes

Public:

- `POST /api/assessment/start`
- `PATCH /api/assessment/session`
- `POST /api/assessment/contact`
- `POST /api/assessment/complete`
- `POST /api/assessment/recalculate`
- `GET /api/report/[token]`
- `POST /api/report/[token]/email`
- `POST /api/events`

Webhooks:

- `POST /api/webhooks/brevo`
- `POST /api/webhooks/booking`
- `POST /api/webhooks/checkout`
- `POST /api/webhooks/vendasta`

Admin:

- `GET /api/admin/leads`
- `GET /api/admin/leads/[id]`
- `PATCH /api/admin/leads/[id]`
- `POST /api/admin/leads/[id]/notes`
- `POST /api/admin/leads/[id]/resend-report`
- `GET /api/admin/export`
- `POST /api/admin/integrations/[id]/retry`

## 11.2 Validation

Use shared Zod schemas for:

- all assessment answers;
- contact capture;
- assumption edits;
- admin status updates;
- webhook payloads;
- environment variables.

Reject unknown fields for sensitive endpoints.

## 11.3 Rate limiting

At minimum:

- assessment start: 10 per IP per hour;
- contact capture: 5 per IP per hour;
- assessment completion: 5 per IP per hour;
- report email: 3 per report token per day;
- public event endpoint: 60 per IP per hour;
- admin export: 10 per user per hour.

Use a Vercel-compatible rate-limit store.

## 11.4 Bot protection

Implement:

- invisible honeypot;
- minimum form-completion time;
- Turnstile or equivalent on contact capture when risk threshold is reached;
- server-side request fingerprint;
- disposable-email checks as a non-blocking lead-quality flag.

---

# 12. Nonfunctional Requirements

## 12.1 Performance

Targets:

- mobile LCP under 2.5 seconds on production landing page;
- assessment transition under 200 ms after local interaction;
- server calculation under 500 ms excluding external APIs;
- report page under 2 seconds when cached;
- no blocking Brevo call before results display.

## 12.2 Accessibility

Minimum WCAG 2.1 AA:

- keyboard navigation;
- visible focus states;
- semantic labels;
- sufficient contrast;
- screen-reader-friendly progress;
- error summaries;
- reduced-motion support.

## 12.3 Reliability

- external integration calls use queue/retry;
- assessment results are saved before Brevo dispatch;
- PDF failure does not block results;
- Brevo failure does not lose lead data;
- webhook processing is idempotent;
- database migrations are reversible where practical.

## 12.4 Observability

Capture:

- structured server logs;
- error tracking;
- calculation failures;
- Brevo failures;
- PDF failures;
- webhook signature failures;
- abandoned session rate;
- report-generation latency.

---

# 13. First Codex Implementation Prompt

```text
You are implementing Build 1 and Build 2 of the KonectLocal Med Spa Recovery Platform.

Repository:
konectlocal-medspa-recovery

Technology:
- Next.js latest stable App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui or an equivalent accessible component system
- Supabase PostgreSQL and Supabase Auth
- Zod
- Vitest
- Playwright
- Vercel deployment configuration

Do not build the public assessment yet.

OBJECTIVE

Create a production-grade application foundation and complete database layer that are ready for the assessment, calculation engine, Brevo integration, PDF reports, and admin dashboard.

BUILD 1 — FOUNDATION

1. Initialize the Next.js App Router project.
2. Enable TypeScript strict mode.
3. Configure ESLint and Prettier.
4. Configure Tailwind and the component library.
5. Create the design tokens:
   - deep navy #071D2D
   - secondary navy #0B2A42
   - aqua #4CC9D8
   - recovery green #16A36A
   - soft background #F3F8FB
   - warning amber #F4B942
   - critical red #D95C5C
6. Use Inter or Manrope with next/font.
7. Add environment-variable validation with Zod.
8. Add separate browser and server Supabase clients.
9. Ensure the service-role key is importable only from server-only modules.
10. Configure Vitest and Playwright.
11. Add route groups for public, report, and admin areas.
12. Add a minimal branded landing shell and protected admin shell.
13. Add structured logging and a basic health endpoint.
14. Add Vercel-ready configuration.
15. Add README setup instructions and an `.env.example`.

BUILD 2 — DATABASE

Create Supabase SQL migrations for:

- extensions;
- leads;
- assessment_sessions;
- assessments;
- revenue_leaks;
- lead_events;
- formula_versions;
- benchmark_versions;
- consent_records;
- report_links;
- sales_notes;
- lead_assignments;
- integration_jobs;
- admin_users.

Implement:

- constraints;
- foreign keys;
- indexes;
- updated_at triggers;
- one-active-formula partial unique index;
- one-active-benchmark partial unique index;
- normalized email/domain/phone helpers;
- lead upsert strategy;
- event-recording function;
- RLS on every table;
- admin role helper functions;
- no anonymous direct reads;
- no anonymous direct writes;
- authenticated admin policies based on admin_users;
- seed migration for formula version `medspa-v1.0.0`;
- seed migration for benchmark version `medspa-benchmark-v1.0.0`.

Store the approved assessment scoring, revenue formulas, and routing configuration as versioned JSON in formula_versions.

SECURITY

- Never expose the Supabase service-role key to client code.
- Public data mutation must be designed for Next.js server endpoints.
- Add comments to every RLS policy.
- Add tests that confirm anonymous users cannot read or write protected tables.
- Add tests for sales_rep, sales_manager, analyst, and admin access.
- Do not store patient data or medical information.

DELIVERABLES

- complete project source;
- migration files;
- seed files;
- RLS policy tests;
- unit tests for normalization helpers;
- README;
- environment variable documentation;
- architecture notes;
- migration execution instructions.

STOP CONDITION

Do not start Build 3. Stop after Build 1 and Build 2 pass all acceptance criteria.
```

---

# 14. Acceptance Criteria — Build 1

Build 1 is accepted when:

1. The project installs and runs locally with documented commands.
2. TypeScript strict mode passes without errors.
3. ESLint passes.
4. Unit-test command passes.
5. Playwright is configured and one smoke test passes.
6. Tailwind design tokens are available as named utilities or CSS variables.
7. Public and admin route groups render.
8. Admin shell requires authentication.
9. Browser Supabase code cannot import server secrets.
10. Environment validation fails clearly when required variables are missing.
11. `/api/health` returns application and database status without exposing secrets.
12. A production build completes.
13. The project is deployable to Vercel.
14. README includes local setup, Supabase setup, migration, test, and deployment instructions.
15. No patient or medical-record fields exist.

---

# 15. Acceptance Criteria — Build 2

Build 2 is accepted when:

1. All required tables exist.
2. Every table has RLS enabled.
3. Anonymous users cannot directly select, insert, update, or delete protected records.
4. Admin access is role-aware.
5. Sales reps cannot access records outside their permitted scope.
6. Analysts cannot access restricted consent and direct-contact fields.
7. Formula and benchmark tables allow only one active version each.
8. `medspa-v1.0.0` is seeded with the approved scoring and revenue configuration.
9. `medspa-benchmark-v1.0.0` is seeded.
10. Lead email deduplication is case-insensitive.
11. Phone and domain normalization are tested.
12. Integration jobs enforce unique idempotency keys.
13. Report tokens are stored as hashes.
14. Assessment sessions support expiration.
15. Foreign-key deletion behavior is intentional and tested.
16. Required indexes exist.
17. Updated timestamps are maintained automatically.
18. RLS policy tests pass for anonymous, sales rep, sales manager, analyst, and admin roles.
19. Migrations apply cleanly to an empty project.
20. Migrations can be replayed in CI.
21. No service-role key appears in client output.
22. No patient or protected medical data is stored.
23. Calculation and routing configuration are versioned and immutable after use.
24. The schema supports attribution, abandonment, reporting, booking, checkout, purchase, and suppression events.
25. The project is ready for Build 3 without schema redesign.

---

# 16. Build 3 Entry Gate

Do not begin the assessment UI until:

- Build 1 and Build 2 acceptance criteria pass;
- the seeded formula JSON matches this specification;
- RLS tests pass;
- the active formula version can be retrieved server-side;
- lead upsert and event recording are verified;
- report tokens can be generated securely;
- the environment is deployed to a non-production Vercel preview.

---

# 17. Commercial Configuration

## Package 1

**KonectLocal Med Spa Lead & Revenue Recovery System**

- $599 per month
- $750–$1,000 setup
- no AI voice included
- one-location and moderate-complexity default

## Package 2

**KonectLocal Med Spa AI Revenue Command Center**

- $999 per month
- $1,250–$1,500 setup
- AI voice and advanced automation
- higher-volume, multi-location, and higher-complexity default

The results page must present one primary recommendation, not two equally weighted choices.

---

# 18. Final Product Guardrails

- The score measures operational revenue leakage, not clinical quality.
- Revenue opportunity is an estimate, not a promise.
- The report must show assumptions and confidence.
- All calculations are authoritative on the server.
- Every result preserves formula and benchmark versions.
- Brevo is the pre-purchase nurture system.
- Vendasta/Campaigns Pro is the post-purchase client and patient-workflow system.
- The product must remain usable if Brevo, PDF generation, or a webhook is temporarily unavailable.
- No broad strategy reset is required before implementation.
