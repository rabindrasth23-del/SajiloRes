-- ==========================================================================
-- SajiloResQ: 0005_security_hardening.sql
--
-- DESIGN DECISION: All writes to operational tables (incidents,
-- incident_events, attachments, notifications, assignments,
-- incident_duplicates) happen in Next.js API route handlers using the
-- service_role key after JWT + role verification. The browser only READS
-- via RLS (dashboard + Realtime). Admin UI writes only to organizations,
-- responders, app_users, notification_preferences under admin RLS.
-- ==========================================================================

-- =============================================
-- 1. AUTH PROVISIONING: Remove auto-provisioning
--    app_users rows created only by admin or SQL.
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =============================================
-- 2. FUNCTION HARDENING
--    Every SECURITY DEFINER function gets SET search_path = ''.
--    get_user_role() is restricted so anon/public cannot call it
--    via /rest/v1/rpc.
-- =============================================

-- Recreate with hardened search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.app_users WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
-- authenticated needs EXECUTE so RLS policies that call get_user_role() work.
-- anon and public cannot call it through PostgREST /rest/v1/rpc.

-- set_updated_at is not SECURITY DEFINER but harden search_path anyway
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =============================================
-- 3. DROP ALL ANON POLICIES
--    Citizens submit through server API routes (service_role).
--    No direct anon access to any table.
-- =============================================
DROP POLICY IF EXISTS "citizens_insert_incidents" ON incidents;
DROP POLICY IF EXISTS "citizens_select_own_incident" ON incidents;
DROP POLICY IF EXISTS "anon_insert_incident_events" ON incident_events;
DROP POLICY IF EXISTS "anon_insert_attachments" ON attachments;

-- =============================================
-- 4. DROP AUTHENTICATED WRITE POLICIES ON OPERATIONAL TABLES
--    Staff = SELECT-only. All mutations go through service_role.
-- =============================================

-- incidents: keep SELECT, drop UPDATE
DROP POLICY IF EXISTS "authenticated_update_incidents" ON incidents;

-- incident_duplicates: keep SELECT, drop INSERT/UPDATE
DROP POLICY IF EXISTS "authenticated_insert_incident_duplicates" ON incident_duplicates;
DROP POLICY IF EXISTS "authenticated_update_incident_duplicates" ON incident_duplicates;

-- assignments: keep SELECT, drop INSERT/UPDATE
DROP POLICY IF EXISTS "authenticated_insert_assignments" ON assignments;
DROP POLICY IF EXISTS "authenticated_update_assignments" ON assignments;

-- notifications: keep SELECT, drop INSERT/UPDATE
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "authenticated_update_notifications" ON notifications;

-- incident_events: keep SELECT, drop INSERT (immutable: no UPDATE/DELETE ever existed)
DROP POLICY IF EXISTS "authenticated_insert_incident_events" ON incident_events;

-- attachments: keep SELECT, drop INSERT
DROP POLICY IF EXISTS "authenticated_insert_attachments" ON attachments;

-- =============================================
-- 5. DROP STORAGE UPLOAD POLICIES
--    Uploads happen only through signed URLs created by the server
--    with the service_role key. No direct client-side uploads.
-- =============================================
DROP POLICY IF EXISTS "anon_upload_attachments" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_attachments" ON storage.objects;
-- authenticated_read_attachments is kept: responder+ can read/download.

-- =============================================
-- 6. REVOKE ALL TABLE PRIVILEGES FROM ANON (defense in depth)
--    Even if an RLS policy were accidentally re-added, the anon role
--    has no underlying table privileges to use it.
-- =============================================
REVOKE ALL ON incidents FROM anon;
REVOKE ALL ON incident_duplicates FROM anon;
REVOKE ALL ON organizations FROM anon;
REVOKE ALL ON responders FROM anon;
REVOKE ALL ON app_users FROM anon;
REVOKE ALL ON assignments FROM anon;
REVOKE ALL ON notifications FROM anon;
REVOKE ALL ON incident_events FROM anon;
REVOKE ALL ON attachments FROM anon;
REVOKE ALL ON notification_preferences FROM anon;

-- =============================================
-- 7. REVOKE WRITE PRIVILEGES ON OPERATIONAL TABLES FROM AUTHENTICATED
--    Ensures hard "permission denied" errors instead of silent 0-row no-ops.
--    SELECT is kept for dashboard reads. Writes go through service_role only.
-- =============================================
REVOKE INSERT, UPDATE, DELETE ON incidents FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON incident_duplicates FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON assignments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON notifications FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON incident_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON attachments FROM authenticated;
