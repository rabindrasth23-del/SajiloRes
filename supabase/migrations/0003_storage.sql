-- ==========================================================================
-- SajiloResQ: 0003_storage.sql
-- Create a private Storage bucket for incident photo attachments.
-- Upload is via signed URL only (generated server-side). No public read.
-- ==========================================================================

-- Create the private bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-attachments',
  'incident-attachments',
  false,                              -- private bucket, no public access
  8388608,                            -- 8MB max per TRD §14
  array['image/jpeg', 'image/png', 'image/webp']  -- allowed types per TRD §14
);

-- Storage policies:
-- No public/anon read at all — files are served via signed URLs generated server-side.
-- Anon users can upload (citizen submitting photos) but only to the incident-attachments bucket.
-- The server (service_role) handles generating signed upload URLs and signed read URLs.

-- Allow anon INSERT (upload via signed URL)
create policy "anon_upload_attachments"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'incident-attachments'
  );

-- Allow authenticated users to upload
create policy "authenticated_upload_attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'incident-attachments'
  );

-- Allow authenticated responder+ to read (download) attachments
create policy "authenticated_read_attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'incident-attachments'
    and public.get_user_role() in ('responder', 'coordinator', 'admin')
  );

-- No UPDATE or DELETE policies — attachments are immutable
-- Admin cleanup can be done via service_role (bypasses RLS)
