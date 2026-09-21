-- ==========================================================================
-- SajiloResQ: 0001_init_schema.sql
-- Creates all tables, indexes, constraints exactly per TRD v2 §7.
-- ==========================================================================

-- ========== incidents ==========
create table incidents (
  id uuid primary key default gen_random_uuid(),
  client_id text unique not null,               -- idempotency key from browser
  raw_text text not null,
  incident_type text,
  triage text check (triage in ('immediate','delayed','minor','unknown')),
  confidence numeric check (confidence >= 0 and confidence <= 1),
  summary text,
  evidence jsonb default '[]'::jsonb,
  hazards jsonb default '[]'::jsonb,
  missing_information jsonb default '[]'::jsonb,
  people_affected integer,
  latitude numeric,
  longitude numeric,
  location_text text,
  location_source text check (location_source in ('gps','typed','map_selection','none')),
  location_confidence numeric,
  status text not null default 'new' check (status in (
    'new','ai_pending','reviewed','approved','assigned','acknowledged',
    'dispatched','resolved','duplicate_review','rejected','false_report',
    'notification_failed','location_missing','escalation_required'
  )),
  verification_status text not null default 'unverified' check (verification_status in (
    'unverified','ai_reviewed','human_verified','dispatched','resolved','false_or_duplicate'
  )),
  ai_status text not null default 'pending' check (ai_status in ('pending','processing','completed','failed')),
  recommended_action text,
  recommended_service_types jsonb default '[]'::jsonb,
  needs_human_review boolean default true,
  offline_created boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_incidents_status on incidents(status);
create index idx_incidents_triage on incidents(triage);
create index idx_incidents_created_at on incidents(created_at);
create index idx_incidents_location on incidents(latitude, longitude);

-- ========== incident_duplicates ==========
create table incident_duplicates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  possible_duplicate_of uuid references incidents(id) not null,
  similarity_score numeric,
  resolution text check (resolution in ('unresolved','merged','kept_separate')) default 'unresolved',
  resolved_by uuid,
  created_at timestamptz default now()
);

-- ========== organizations ==========
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ========== responders (directory entries, NOT user accounts) ==========
create table responders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  organization text not null,           -- denormalized display name
  service_type text not null check (service_type in ('ambulance','rescue','police','fire','hospital','coordinator','ngo','volunteer')),
  email text,
  phone text,
  contact_person text,
  latitude numeric,
  longitude numeric,
  coverage_area text,
  available boolean default true,
  verified boolean default false,
  created_at timestamptz default now()
);
create index idx_responders_service_type on responders(service_type);

-- ========== app_users (auth-linked, for responders/coordinators/admins) ==========
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('responder','coordinator','admin')),
  organization_id uuid references organizations(id),
  display_name text,
  created_at timestamptz default now()
);

-- ========== assignments ==========
create table assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  responder_id uuid references responders(id) not null,
  assigned_by uuid references app_users(id),
  assigned_at timestamptz default now(),
  status text default 'assigned' check (status in ('assigned','acknowledged','dispatched','completed','cancelled'))
);

-- ========== notifications ==========
create table notifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  responder_id uuid references responders(id) not null,
  channel text not null check (channel in ('email','dashboard','fcm')),
  status text not null default 'pending' check (status in (
    'pending','prepared','approved','sending','sent','failed','acknowledged','retrying'
  )),
  approved_by uuid references app_users(id),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  provider_message_id text,
  error text,
  retry_count integer default 0,
  created_at timestamptz default now()
);

-- ========== incident_events (audit trail) ==========
create table incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  event_type text not null,   -- e.g. 'report_received','facts_extracted','triage_recommended', etc.
  actor_id uuid,              -- null when system/AI-generated
  actor_role text,            -- 'citizen' | 'ai' | 'responder' | 'coordinator' | 'admin' | 'system'
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index idx_incident_events_incident_id on incident_events(incident_id);

-- ========== attachments ==========
create table attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  storage_path text not null,     -- Supabase Storage object path
  mime_type text not null,
  size_bytes integer,
  created_at timestamptz default now()
);

-- ========== notification_preferences (admin-configurable, optional) ==========
create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  responder_id uuid references responders(id) not null,
  channel text not null check (channel in ('email','fcm')),
  enabled boolean default true
);
