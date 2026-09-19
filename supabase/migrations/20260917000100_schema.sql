-- SiteRun core schema. Money is integer cents (ex GST). Every table has RLS (see next migration).

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.account_type as enum ('contractor', 'supplier', 'operator', 'org_admin');
create type public.org_kind as enum ('contractor', 'supplier');
create type public.member_role as enum ('owner', 'project_manager', 'site_manager', 'viewer');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');
create type public.site_status as enum ('active', 'planning', 'on_hold');
create type public.plan_id as enum ('starter', 'pro', 'enterprise');
create type public.billing_period as enum ('monthly', 'annual');
create type public.machine_status as enum ('draft', 'pending_review', 'live', 'rejected', 'paused');
create type public.hire_type as enum ('dry', 'wet');
create type public.requirement_group as enum ('general', 'crane', 'operator');
create type public.document_status as enum ('pending', 'verified', 'rejected');
create type public.booking_status as enum ('requested', 'confirmed', 'declined', 'in_transit', 'on_site', 'return_scheduled', 'completed', 'cancelled');
create type public.delivery_method as enum ('pickup', 'delivery');
create type public.delivery_stage as enum ('picked_up', 'in_transit', 'arriving', 'delivered');
create type public.invoice_status as enum ('paid', 'due', 'overdue');
create type public.card_brand as enum ('visa', 'mastercard', 'amex');
create type public.payment_kind as enum ('invoice', 'subscription', 'credits', 'balance');
create type public.payout_status as enum ('paid', 'processing');
create type public.notification_type as enum ('booking', 'delivery', 'invoice', 'document', 'message', 'listing');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');
create type public.admin_action_kind as enum ('supplier_registered', 'machine_approved', 'machine_rejected', 'dispute', 'payout', 'document_verified', 'document_rejected');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Organisations & people
-- ---------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  name text not null check (length(trim(name)) >= 2),
  abn text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  rating numeric(2, 1),
  review_count integer not null default 0,
  logo_url text,
  opening_earnings_cents integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text not null default '',
  account_type public.account_type not null default 'contractor',
  is_platform_admin boolean not null default false,
  avatar_url text,
  org_id uuid references public.organisations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_org_idx on public.profiles (org_id);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  email text not null,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, email)
);
create index org_members_profile_idx on public.org_members (profile_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email text not null,
  role public.member_role not null,
  status public.invitation_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index invitations_pending_uq on public.invitations (org_id, lower(email)) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Sites, plans, credits
-- ---------------------------------------------------------------------------
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (length(trim(name)) >= 2),
  address text not null,
  suburb text not null,
  state text not null default 'VIC',
  postcode text not null default '',
  lat double precision not null,
  lng double precision not null,
  project_type text not null,
  start_date date not null,
  duration_months integer not null check (duration_months between 1 and 120),
  status public.site_status not null default 'planning',
  delivery_from time not null default '07:00',
  delivery_to time not null default '16:00',
  access_notes text not null default '' check (length(access_notes) <= 250),
  contact_name text not null default '',
  contact_phone text not null default '',
  photo_url text,
  team_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivery_to > delivery_from)
);
create index sites_org_idx on public.sites (org_id);

create table public.subscriptions (
  org_id uuid primary key references public.organisations (id) on delete cascade,
  plan public.plan_id not null,
  period public.billing_period not null,
  status text not null default 'active' check (status in ('active', 'none')),
  credits_balance integer not null default 0,
  renews_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  credits integer not null,
  amount_cents integer not null,
  description text not null,
  created_at timestamptz not null default now()
);
create index credit_transactions_org_idx on public.credit_transactions (org_id);

-- ---------------------------------------------------------------------------
-- Catalogue & compliance config
-- ---------------------------------------------------------------------------
create table public.machine_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  image_url text not null,
  icon text not null,
  -- Which compliance requirement groups apply to machines in this category.
  requirement_groups public.requirement_group[] not null default '{general}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.compliance_requirements (
  id text primary key,
  "group" public.requirement_group not null,
  name text not null,
  description text not null,
  icon text not null default 'file',
  required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references public.organisations (id) on delete cascade,
  category_id uuid not null references public.machine_categories (id),
  title text not null,
  make text not null default '',
  model text not null default '',
  year integer check (year between 1950 and 2100),
  serial_number text not null default '',
  registration text not null default '',
  asset_code text not null default '',
  specs jsonb not null default '{}',
  attachments text[] not null default '{}',
  fuel_type text not null default '',
  features text[] not null default '{}',
  capacity_tonnes numeric(6, 1),
  rate_hourly integer check (rate_hourly > 0),
  rate_daily integer not null default 0 check (rate_daily >= 0),
  rate_weekly integer check (rate_weekly > 0),
  rate_wet_daily integer check (rate_wet_daily > 0),
  hire_types public.hire_type[] not null default '{dry}',
  min_booking text not null default '1 day',
  available_from date not null default current_date,
  suburb text not null default 'Melbourne',
  state text not null default 'VIC',
  lat double precision not null default -37.8136,
  lng double precision not null default 144.9631,
  service_radius_km integer not null default 50 check (service_radius_km between 1 and 1000),
  offer_delivery boolean not null default true,
  same_day_delivery boolean not null default false,
  third_party_transport boolean not null default false,
  status public.machine_status not null default 'draft',
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  draft_step integer not null default 1 check (draft_step between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index machines_supplier_idx on public.machines (supplier_org_id);
create index machines_status_idx on public.machines (status, category_id);

create table public.machine_photos (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines (id) on delete cascade,
  url text not null,
  storage_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index machine_photos_machine_idx on public.machine_photos (machine_id, sort_order);

create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  machine_id uuid references public.machines (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  requirement_id text not null references public.compliance_requirements (id),
  file_name text not null,
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  storage_path text,
  expiry_date date,
  status public.document_status not null default 'pending',
  notes text not null default '' check (length(notes) <= 250),
  rejection_reason text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  -- Flags the scheduled expiry job has already sent (30/14/7 days).
  expiry_notified integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (machine_id is not null or profile_id is not null)
);
create index compliance_documents_org_idx on public.compliance_documents (org_id);
create index compliance_documents_machine_idx on public.compliance_documents (machine_id, requirement_id, uploaded_at desc);
create index compliance_documents_pending_idx on public.compliance_documents (status) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Bookings & delivery
-- ---------------------------------------------------------------------------
create sequence public.booking_ref_seq start 7800;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  machine_id uuid not null references public.machines (id),
  contractor_org_id uuid not null references public.organisations (id),
  supplier_org_id uuid not null references public.organisations (id),
  site_id uuid references public.sites (id) on delete set null,
  operator_profile_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  start_date date not null,
  end_date date not null,
  quantity integer not null default 1 check (quantity between 1 and 5),
  hire_type public.hire_type not null default 'dry',
  delivery public.delivery_method not null default 'delivery',
  insurance boolean not null default true,
  daily_rate integer not null check (daily_rate >= 0),
  total_cents integer not null check (total_cents >= 0),
  status public.booking_status not null default 'requested',
  customer_message text not null default '',
  decline_reason text,
  start_time time not null default '07:00',
  end_time time not null default '17:00',
  collection jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (ref ~ '^SR-\d{4}-\d{4,}$'),
  -- No double-booking: a machine can't hold two live bookings over overlapping dates.
  constraint bookings_no_overlap exclude using gist (
    machine_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('confirmed', 'in_transit', 'on_site', 'return_scheduled'))
);
create index bookings_contractor_idx on public.bookings (contractor_org_id, start_date);
create index bookings_supplier_idx on public.bookings (supplier_org_id, start_date);
create index bookings_machine_idx on public.bookings (machine_id, start_date);
create index bookings_operator_idx on public.bookings (operator_profile_id) where operator_profile_id is not null;

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

create table public.deliveries (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  stage public.delivery_stage not null default 'in_transit',
  origin jsonb not null,
  destination jsonb not null,
  route jsonb not null default '[]',
  progress real not null default 0 check (progress between 0 and 1),
  picked_up_at timestamptz,
  eta timestamptz not null,
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.delivery_locations (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);
create index delivery_locations_booking_idx on public.delivery_locations (booking_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique references public.bookings (id) on delete cascade,
  subtitle text not null default '',
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  primary key (conversation_id, org_id)
);
create index conversation_participants_org_idx on public.conversation_participants (org_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_org_id uuid references public.organisations (id) on delete set null,
  sender_name text not null default '',
  body text not null default '' check (length(body) <= 2000),
  attachment_name text,
  attachment_path text,
  system boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  org_id uuid not null references public.organisations (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  issued_at date not null default current_date,
  due_date date not null,
  amount_cents integer not null check (amount_cents >= 0),
  gst_cents integer not null check (gst_cents >= 0),
  status public.invoice_status not null default 'due',
  lines jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_org_idx on public.invoices (org_id, issued_at desc);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  -- Only non-sensitive card data is ever stored.
  brand public.card_brand not null,
  last4 char(4) not null check (last4 ~ '^\d{4}$'),
  exp_month integer not null check (exp_month between 1 and 12),
  exp_year integer not null check (exp_year between 2000 and 2100),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index payment_methods_org_idx on public.payment_methods (org_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method_id uuid references public.payment_methods (id) on delete set null,
  kind public.payment_kind not null,
  description text not null default '',
  status text not null default 'succeeded' check (status in ('succeeded', 'failed')),
  provider_ref text,
  created_at timestamptz not null default now()
);
create index payments_org_idx on public.payments (org_id, created_at desc);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status public.payout_status not null default 'processing',
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payouts_org_idx on public.payouts (org_id, requested_at desc);

-- ---------------------------------------------------------------------------
-- Notifications, support, reviews, admin
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null default '',
  detail text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

create sequence public.ticket_ref_seq start 4600;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('#SR-' || nextval('public.ticket_ref_seq')),
  org_id uuid references public.organisations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  subject text not null check (length(trim(subject)) >= 3),
  category text not null default 'Other',
  description text not null default '' check (length(description) <= 2000),
  status public.ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_org_idx on public.support_tickets (org_id, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  supplier_org_id uuid not null references public.organisations (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  kind public.admin_action_kind not null,
  title text not null,
  detail text not null default '',
  target_type text,
  target_id uuid,
  created_at timestamptz not null default now()
);
create index admin_actions_created_idx on public.admin_actions (created_at desc);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'organisations', 'profiles', 'org_members', 'invitations', 'sites', 'subscriptions', 'machines',
    'compliance_documents', 'bookings', 'deliveries', 'invoices', 'support_tickets'
  ] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
