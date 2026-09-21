-- ==========================================================================
-- SajiloResQ: seed.sql (idempotent — safe to re-run)
-- Demo data: 4 verified responder organizations (Kathmandu area),
-- 1 resolved incident, 1 acknowledged incident with assignment.
-- All clearly identifiable as demo data. No auth users seeded.
-- ==========================================================================

-- =============================================
-- CLEANUP: delete existing demo data in dependency order
-- =============================================
DELETE FROM assignments WHERE id = 'd0000000-0000-0000-0000-000000000001';
DELETE FROM incident_events WHERE incident_id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002'
);
DELETE FROM notifications WHERE incident_id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002'
);
DELETE FROM incident_duplicates WHERE incident_id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002'
);
DELETE FROM attachments WHERE incident_id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002'
);
DELETE FROM incidents WHERE id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002'
);
DELETE FROM responders WHERE id IN (
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004'
);
DELETE FROM organizations WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

-- =============================================
-- ORGANIZATIONS (4)
-- =============================================
INSERT INTO organizations (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', '[DEMO] Nepal Ambulance Service - Kathmandu'),
  ('a0000000-0000-0000-0000-000000000002', '[DEMO] Nepal Disaster Rescue Team - Lalitpur'),
  ('a0000000-0000-0000-0000-000000000003', '[DEMO] Nepal Police - Metropolitan Kathmandu'),
  ('a0000000-0000-0000-0000-000000000004', '[DEMO] Kathmandu District Disaster Coordination Cell');

-- =============================================
-- RESPONDERS (4 — one per org, all verified, placeholder emails)
-- =============================================

-- Ambulance — near Tribhuvan University Teaching Hospital, Maharajgunj
INSERT INTO responders (id, organization_id, organization, service_type, email, phone, contact_person, latitude, longitude, coverage_area, available, verified) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   '[DEMO] Nepal Ambulance Service - Kathmandu',
   'ambulance',
   'demo-ambulance@example.com',
   '+977-1-0000001',
   'Dr. Ram Sharma (DEMO)',
   27.7380, 85.3310,
   'Kathmandu Metropolitan Area',
   true, true);

-- Rescue — near Jawalakhel, Lalitpur
INSERT INTO responders (id, organization_id, organization, service_type, email, phone, contact_person, latitude, longitude, coverage_area, available, verified) VALUES
  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   '[DEMO] Nepal Disaster Rescue Team - Lalitpur',
   'rescue',
   'demo-rescue@example.com',
   '+977-1-0000002',
   'Sita Thapa (DEMO)',
   27.6710, 85.3130,
   'Lalitpur District',
   true, true);

-- Police — near Singha Durbar
INSERT INTO responders (id, organization_id, organization, service_type, email, phone, contact_person, latitude, longitude, coverage_area, available, verified) VALUES
  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000003',
   '[DEMO] Nepal Police - Metropolitan Kathmandu',
   'police',
   'demo-police@example.com',
   '+977-1-0000003',
   'Inspector Bishnu KC (DEMO)',
   27.7000, 85.3200,
   'Kathmandu Valley',
   true, true);

-- Coordinator — Kathmandu District Disaster Coordination Cell
INSERT INTO responders (id, organization_id, organization, service_type, email, phone, contact_person, latitude, longitude, coverage_area, available, verified) VALUES
  ('b0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000004',
   '[DEMO] Kathmandu District Disaster Coordination Cell',
   'coordinator',
   'demo-coordinator@example.com',
   '+977-1-0000004',
   'Nirmala Gurung (DEMO)',
   27.7050, 85.3150,
   'Kathmandu District',
   true, true);

-- =============================================
-- INCIDENT 1: RESOLVED — wall collapse in Thamel
-- =============================================
INSERT INTO incidents (
  id, client_id, raw_text, incident_type, triage, confidence, summary,
  evidence, hazards, missing_information, people_affected,
  latitude, longitude, location_text, location_source, location_confidence,
  status, verification_status, ai_status,
  recommended_action, recommended_service_types, needs_human_review,
  offline_created, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'demo-resolved-001',
  '[DEMO] A wall collapsed near the primary school in Thamel. Two people may be trapped under debris. The road is partially blocked.',
  'building_collapse',
  'immediate', 0.88,
  '[DEMO] Wall collapse near Thamel primary school with possible trapped victims',
  '["two people may be trapped", "collapsed wall", "road partially blocked"]'::jsonb,
  '["unstable_structure", "blocked_road"]'::jsonb,
  '[]'::jsonb,
  2,
  27.7153, 85.3123,
  'Near Thamel primary school, Kathmandu',
  'gps', 0.85,
  'resolved', 'human_verified', 'completed',
  'Rescue team deployed; ambulance on standby; police managing traffic.',
  '["rescue", "ambulance", "police"]'::jsonb,
  false, false,
  now() - interval '4 hours',
  now() - interval '1 hour'
);

INSERT INTO incident_events (incident_id, event_type, actor_role, payload, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'report_received',   'citizen',    '{"source": "demo_seed"}'::jsonb,                      now() - interval '4 hours'),
  ('c0000000-0000-0000-0000-000000000001', 'facts_extracted',   'ai',         '{"model": "demo"}'::jsonb,                             now() - interval '3 hours 55 minutes'),
  ('c0000000-0000-0000-0000-000000000001', 'triage_recommended','ai',         '{"triage": "immediate", "confidence": 0.88}'::jsonb,   now() - interval '3 hours 55 minutes'),
  ('c0000000-0000-0000-0000-000000000001', 'alert_approved',    'responder',  '{"action": "approved_as_is"}'::jsonb,                  now() - interval '3 hours 50 minutes'),
  ('c0000000-0000-0000-0000-000000000001', 'notification_sent', 'system',     '{"channel": "dashboard"}'::jsonb,                      now() - interval '3 hours 49 minutes'),
  ('c0000000-0000-0000-0000-000000000001', 'incident_resolved', 'responder',  '{"resolution": "all_clear"}'::jsonb,                   now() - interval '1 hour');

-- =============================================
-- INCIDENT 2: ACTIVE — flooding in Balkhu, status=acknowledged
-- NOT stale: has assignment + acknowledgment events.
-- =============================================
INSERT INTO incidents (
  id, client_id, raw_text, incident_type, triage, confidence, summary,
  evidence, hazards, missing_information, people_affected,
  latitude, longitude, location_text, location_source, location_confidence,
  status, verification_status, ai_status,
  recommended_action, recommended_service_types, needs_human_review,
  offline_created, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'demo-active-002',
  '[DEMO] Heavy flooding in Balkhu area. Water level rising fast. Several families stranded on rooftops. Need rescue boats.',
  'flood',
  'immediate', 0.92,
  '[DEMO] Flash flooding in Balkhu with families stranded on rooftops',
  '["water level rising fast", "families stranded on rooftops", "rescue boats needed"]'::jsonb,
  '["rising_water", "potential_drowning", "structural_damage"]'::jsonb,
  '["exact number of stranded families", "current water depth"]'::jsonb,
  12,
  27.6880, 85.3010,
  'Balkhu area, near Bagmati river bridge',
  'gps', 0.90,
  'acknowledged', 'ai_reviewed', 'completed',
  'Deploy rescue team with boats; alert ambulance for potential injuries; police for crowd and traffic control.',
  '["rescue", "ambulance", "police"]'::jsonb,
  true, false,
  now() - interval '25 minutes',
  now() - interval '15 minutes'
);

INSERT INTO incident_events (incident_id, event_type, actor_role, payload, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'report_received',   'citizen',    '{"source": "demo_seed"}'::jsonb,                      now() - interval '25 minutes'),
  ('c0000000-0000-0000-0000-000000000002', 'facts_extracted',   'ai',         '{"model": "demo"}'::jsonb,                             now() - interval '24 minutes'),
  ('c0000000-0000-0000-0000-000000000002', 'triage_recommended','ai',         '{"triage": "immediate", "confidence": 0.92}'::jsonb,   now() - interval '24 minutes'),
  ('c0000000-0000-0000-0000-000000000002', 'alert_approved',    'responder',  '{"action": "approved_as_is"}'::jsonb,                  now() - interval '20 minutes'),
  ('c0000000-0000-0000-0000-000000000002', 'acknowledgement_received', 'responder', '{"responder_id": "b0000000-0000-0000-0000-000000000002"}'::jsonb, now() - interval '15 minutes');

-- Assignment for the active incident (rescue team acknowledged)
INSERT INTO assignments (id, incident_id, responder_id, assigned_at, status) VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   now() - interval '18 minutes',
   'acknowledged');
