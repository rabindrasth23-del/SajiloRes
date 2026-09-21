-- ==========================================================================
-- SajiloResQ: 0002_rls_policies.sql
-- Enable RLS on every table. Default deny. Explicit policies per TRD §11.
--
-- Roles:
--   citizen (anonymous/unauthenticated) — can INSERT incidents, SELECT own by client_id
--   responder — can view/update incidents and related tables
--   coordinator — everything responder can + escalation + cross-org visibility
--   admin — full CRUD on directory tables (organizations, responders), full access everywhere
--
-- The service_role key bypasses RLS entirely; it is used only server-side.
-- ==========================================================================

-- Helper: returns the current user's role from app_users, or NULL if unauthenticated.
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
as $$
  select role from public.app_users where id = auth.uid();
$$;

-- =============================================
-- incidents
-- =============================================
alter table incidents enable row level security;

-- Citizens (anonymous) can INSERT new incident reports
create policy "citizens_insert_incidents"
  on incidents for insert
  to anon
  with check (true);

-- Citizens can SELECT only their own report by matching client_id
-- (they must know the client_id they submitted with)
create policy "citizens_select_own_incident"
  on incidents for select
  to anon
  using (false);
  -- NOTE: citizens query their own report via the server API route which uses
  -- the service_role key and filters by client_id. Direct anon SELECT is blocked
  -- to prevent enumeration. The server route handles the client_id lookup.

-- Authenticated users with responder/coordinator/admin role can SELECT all incidents
create policy "authenticated_select_incidents"
  on incidents for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Authenticated users with responder/coordinator/admin role can UPDATE incidents
create policy "authenticated_update_incidents"
  on incidents for update
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  )
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- No DELETE on incidents — incidents are never deleted, only status-changed
-- No authenticated INSERT — new incidents come from citizens (anon) or service_role

-- =============================================
-- incident_duplicates
-- =============================================
alter table incident_duplicates enable row level security;

-- Responder+ can view duplicate flags
create policy "authenticated_select_incident_duplicates"
  on incident_duplicates for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Responder+ can insert duplicate records (via server tools, but RLS allows it)
create policy "authenticated_insert_incident_duplicates"
  on incident_duplicates for insert
  to authenticated
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Responder+ can update resolution (merge/keep_separate)
create policy "authenticated_update_incident_duplicates"
  on incident_duplicates for update
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  )
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- =============================================
-- organizations
-- =============================================
alter table organizations enable row level security;

-- All authenticated users can view organizations
create policy "authenticated_select_organizations"
  on organizations for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Only admins can insert/update/delete organizations
create policy "admin_insert_organizations"
  on organizations for insert
  to authenticated
  with check (
    public.get_user_role() = 'admin'
  );

create policy "admin_update_organizations"
  on organizations for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "admin_delete_organizations"
  on organizations for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================
-- responders (directory entries)
-- =============================================
alter table responders enable row level security;

-- Authenticated users with responder+ role can view the directory
create policy "authenticated_select_responders"
  on responders for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Only admins can manage the responder directory
create policy "admin_insert_responders"
  on responders for insert
  to authenticated
  with check (
    public.get_user_role() = 'admin'
  );

create policy "admin_update_responders"
  on responders for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "admin_delete_responders"
  on responders for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================
-- app_users
-- =============================================
alter table app_users enable row level security;

-- Users can read their own record
create policy "users_select_own"
  on app_users for select
  to authenticated
  using (id = auth.uid());

-- Admins can view all users
create policy "admin_select_all_users"
  on app_users for select
  to authenticated
  using (public.get_user_role() = 'admin');

-- Only admins can insert/update/delete user records
-- (role assignment is an admin-only action)
create policy "admin_insert_users"
  on app_users for insert
  to authenticated
  with check (public.get_user_role() = 'admin');

create policy "admin_update_users"
  on app_users for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "admin_delete_users"
  on app_users for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================
-- assignments
-- =============================================
alter table assignments enable row level security;

-- Responder+ can view assignments
create policy "authenticated_select_assignments"
  on assignments for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Responder+ can create assignments
create policy "authenticated_insert_assignments"
  on assignments for insert
  to authenticated
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Responder+ can update assignment status (acknowledge/dispatch/complete/cancel)
create policy "authenticated_update_assignments"
  on assignments for update
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  )
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- =============================================
-- notifications
-- =============================================
alter table notifications enable row level security;

-- Responder+ can view notifications
create policy "authenticated_select_notifications"
  on notifications for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Responder+ can insert notifications (via approve flow)
create policy "authenticated_insert_notifications"
  on notifications for insert
  to authenticated
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Responder+ can update notification status (retry, acknowledge)
create policy "authenticated_update_notifications"
  on notifications for update
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  )
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- =============================================
-- incident_events (audit trail)
-- =============================================
alter table incident_events enable row level security;

-- Citizens (anon) can insert audit events (report_received is logged on submit)
create policy "anon_insert_incident_events"
  on incident_events for insert
  to anon
  with check (true);

-- Responder+ can view the full audit trail
create policy "authenticated_select_incident_events"
  on incident_events for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Authenticated users can insert audit events
create policy "authenticated_insert_incident_events"
  on incident_events for insert
  to authenticated
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Audit events are immutable — no UPDATE or DELETE policies

-- =============================================
-- attachments
-- =============================================
alter table attachments enable row level security;

-- Citizens (anon) can insert attachment metadata (after uploading via signed URL)
create policy "anon_insert_attachments"
  on attachments for insert
  to anon
  with check (true);

-- Responder+ can view attachments
create policy "authenticated_select_attachments"
  on attachments for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Authenticated users can insert attachment records
create policy "authenticated_insert_attachments"
  on attachments for insert
  to authenticated
  with check (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- =============================================
-- notification_preferences
-- =============================================
alter table notification_preferences enable row level security;

-- Responder+ can view their preferences
create policy "authenticated_select_notification_preferences"
  on notification_preferences for select
  to authenticated
  using (
    public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- Only admins can manage notification preferences
create policy "admin_insert_notification_preferences"
  on notification_preferences for insert
  to authenticated
  with check (public.get_user_role() = 'admin');

create policy "admin_update_notification_preferences"
  on notification_preferences for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "admin_delete_notification_preferences"
  on notification_preferences for delete
  to authenticated
  using (public.get_user_role() = 'admin');
