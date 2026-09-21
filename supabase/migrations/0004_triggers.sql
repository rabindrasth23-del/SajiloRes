-- ==========================================================================
-- SajiloResQ: 0004_triggers.sql
-- Trigger functions for automated timestamps and auth-linked user setup.
-- ==========================================================================

-- ========== updated_at trigger function ==========
-- Automatically sets updated_at = now() on any UPDATE, per TRD §7.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach to incidents (primary mutable table)
create trigger set_incidents_updated_at
  before update on incidents
  for each row
  execute function public.set_updated_at();

-- ========== Auth: new user role assignment ==========
-- For a hackathon timeline, new auth.users rows get an app_users record
-- with a default role of 'responder'. Admins can later promote via the
-- admin UI or direct SQL. This avoids requiring manual admin action for
-- every new signup during the demo.
--
-- In production, this trigger would be replaced by an invite-only flow
-- where an admin creates the app_users row with the desired role BEFORE
-- the user signs up, or a more sophisticated onboarding process.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.app_users (id, role, display_name)
  values (
    new.id,
    'responder',  -- default role; admin promotes manually
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Fire after a new row appears in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ========== Realtime: enable for dashboard live updates ==========
-- Enable realtime on tables that the dashboard needs to watch.
-- (Supabase Realtime uses postgres_changes, which requires publication.)
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table assignments;
alter publication supabase_realtime add table incident_events;
