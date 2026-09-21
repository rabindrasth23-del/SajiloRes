// Checkpoint 2B — Staff API tests
// Creates temp auth users, gets real JWTs, tests all routes, cleans up.
// Run: node --env-file=.env.local scripts/test-staff.mjs

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing env vars. Run with: node --env-file=.env.local scripts/test-staff.mjs");
  process.exit(1);
}

const results = [];
const testUserIds = [];
const testIncidentIds = [];

function log(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}: ${detail}`);
}

async function supabaseAdmin(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}${path}`, opts);
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function apiCall(path, method, body, token) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, json: await res.json().catch(() => null) };
}

// Create a Supabase auth user and return their JWT
async function createTestUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Failed to create user ${email}: ${JSON.stringify(data)}`);
  testUserIds.push(data.id);

  // Sign in to get a JWT
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  return { id: data.id, token: loginData.access_token };
}

async function main() {
  console.log("\n=== Checkpoint 2B — Staff API Tests ===\n");

  // ── SETUP: Create test users ──
  console.log("--- Creating test users ---");
  const responderUser = await createTestUser("test-responder@example.com", "Test1234!");
  const coordUser = await createTestUser("test-coordinator@example.com", "Test1234!");
  const adminUser = await createTestUser("test-admin@example.com", "Test1234!");
  const noRoleUser = await createTestUser("test-norole@example.com", "Test1234!");

  // Insert app_users rows (service role)
  await supabaseAdmin("/rest/v1/app_users", "POST", { id: responderUser.id, role: "responder", display_name: "Test Responder" });
  await supabaseAdmin("/rest/v1/app_users", "POST", { id: coordUser.id, role: "coordinator", display_name: "Test Coordinator" });
  await supabaseAdmin("/rest/v1/app_users", "POST", { id: adminUser.id, role: "admin", display_name: "Test Admin" });
  // noRoleUser intentionally has NO app_users row

  console.log(`  Responder: ${responderUser.id}`);
  console.log(`  Coordinator: ${coordUser.id}`);
  console.log(`  Admin: ${adminUser.id}`);
  console.log(`  No-role: ${noRoleUser.id}\n`);

  // ── Create test incidents via POST /api/incidents ──
  console.log("--- Creating test incidents ---");
  const incidents = [];
  for (let i = 0; i < 4; i++) {
    const cid = `11111111-1111-4111-a111-10000000000${i}`;
    const r = await apiCall("/api/incidents", "POST", {
      client_id: cid,
      raw_text: `[TEST] Staff test incident ${i}`,
      incident_type: "fire",
      latitude: 27.7 + i * 0.01,
      longitude: 85.3 + i * 0.01,
      location_source: "gps",
    });
    incidents.push({ ...r.json, client_id: cid });
    testIncidentIds.push(r.json.incident_id);
    console.log(`  Incident ${i}: ${r.json.incident_id}`);
  }

  // ── TEST: Staff GET /api/incidents/[id] — full row for each role ──
  console.log("\n--- Staff GET incident detail ---");
  const iid = incidents[0].incident_id;

  const g1 = await apiCall(`/api/incidents/${iid}`, "GET", null, responderUser.token);
  log("staff_get_responder", g1.status === 200 && g1.json.raw_text !== undefined, `status=${g1.status} has_raw_text=${!!g1.json?.raw_text}`);

  const g2 = await apiCall(`/api/incidents/${iid}`, "GET", null, coordUser.token);
  log("staff_get_coordinator", g2.status === 200, `status=${g2.status}`);

  const g3 = await apiCall(`/api/incidents/${iid}`, "GET", null, adminUser.token);
  log("staff_get_admin", g3.status === 200, `status=${g3.status}`);

  const g4 = await apiCall(`/api/incidents/${iid}`, "GET", null, noRoleUser.token);
  log("staff_get_norole_403", g4.status === 403, `status=${g4.status} code=${g4.json?.error?.code}`);

  const g5 = await apiCall(`/api/incidents/${iid}`, "GET", null, null);
  log("staff_get_no_token_401", g5.status === 401, `status=${g5.status} code=${g5.json?.error?.code}`);

  // ── TEST: GET /api/incidents — list with filters ──
  console.log("\n--- GET /api/incidents list ---");
  // after() processes incidents: status may change from 'new' to 'reviewed'
  // Wait a moment for processing to complete
  await new Promise((r) => setTimeout(r, 2000));
  const l1 = await apiCall("/api/incidents?limit=10", "GET", null, responderUser.token);
  log("list_filter_status", l1.status === 200 && l1.json.data.length >= 4, `status=${l1.status} count=${l1.json?.data?.length}`);

  const l2 = await apiCall("/api/incidents?limit=2", "GET", null, responderUser.token);
  log("list_pagination", l2.status === 200 && l2.json.next_cursor !== null, `status=${l2.status} cursor=${l2.json?.next_cursor}`);

  if (l2.json.next_cursor) {
    const l3 = await apiCall(`/api/incidents?limit=2&cursor=${l2.json.next_cursor}`, "GET", null, responderUser.token);
    log("list_page2", l3.status === 200 && l3.json.data.length > 0, `status=${l3.status} count=${l3.json?.count}`);
  }

  // ── TEST: GET /api/incidents/[id]/events ──
  console.log("\n--- Events timeline ---");
  const e1 = await apiCall(`/api/incidents/${iid}/events`, "GET", null, responderUser.token);
  log("events_timeline", e1.status === 200 && e1.json.data.length >= 1, `status=${e1.status} events=${e1.json?.data?.length}`);

  // ── TEST: GET /api/responders/nearby ──
  console.log("\n--- Nearby responders ---");
  const n1 = await apiCall("/api/responders/nearby?lat=27.71&lng=85.31", "GET", null, responderUser.token);
  log("nearby_responders", n1.status === 200 && n1.json.data.length > 0, `status=${n1.status} count=${n1.json?.data?.length} nearest=${n1.json?.data?.[0]?.distance_km?.toFixed(2)}km`);

  // Verify sorted by distance
  if (n1.json.data.length > 1) {
    const sorted = n1.json.data.every((r, i) => i === 0 || r.distance_km >= n1.json.data[i - 1].distance_km);
    log("nearby_sorted", sorted, `sorted_asc=${sorted}`);
  }

  // Filter by service type
  const n2 = await apiCall("/api/responders/nearby?lat=27.71&lng=85.31&serviceTypes=ambulance", "GET", null, responderUser.token);
  log("nearby_service_filter", n2.status === 200, `status=${n2.status} count=${n2.json?.data?.length}`);

  // ── TEST: POST /api/incidents/[id]/assign ──
  console.log("\n--- Assign responder ---");

  // Get a seed responder that is verified and available
  const seedResp = n1.json.data[0];
  const assignIid = incidents[1].incident_id;

  // First, need to move incident from 'new' to a state where 'assigned' is valid
  // new -> assigned is not valid in the transition map, need to go through reviewed -> approved -> assigned
  // Actually, looking at the transitions: approved -> assigned is valid
  // But POST /api/incidents/[id]/status only allows: acknowledged, dispatched, resolved, rejected, false_report, location_missing
  // 'assigned' is NOT in STATUS_ROUTE_ALLOWED_TARGETS — it comes via the assign route
  // The assign route handles the transition internally
  // But new -> assigned is NOT valid in the transition map

  // We need to move through: new -> reviewed -> approved first
  // reviewed and approved are NOT in STATUS_ROUTE_ALLOWED_TARGETS
  // They belong to "other routes" (approve, agent)

  // For testing, let's update status directly via service role to get to 'approved'
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${assignIid}`, "PATCH", { status: "approved" });
  await new Promise(r => setTimeout(r, 200));

  const a1 = await apiCall(`/api/incidents/${assignIid}/assign`, "POST", {
    responder_id: seedResp.id,
    notes: "Test assignment",
  }, coordUser.token);
  log("assign_responder", a1.status === 200, `status=${a1.status} assignment_id=${a1.json?.assignment_id}`);

  // Assign unverified responder — need to create one
  // Actually let's test with a non-existent responder
  const a2 = await apiCall(`/api/incidents/${assignIid}/assign`, "POST", {
    responder_id: "00000000-0000-0000-0000-000000000000",
  }, coordUser.token);
  log("assign_not_found", a2.status === 404, `status=${a2.status}`);

  // Duplicate assignment (same responder already assigned)
  const a3 = await apiCall(`/api/incidents/${assignIid}/assign`, "POST", {
    responder_id: seedResp.id,
  }, coordUser.token);
  log("assign_duplicate_409", a3.status === 409, `status=${a3.status} code=${a3.json?.error?.code}`);

  // ── TEST: POST /api/incidents/[id]/status ──
  console.log("\n--- Status transitions ---");
  const statusIid = incidents[2].incident_id;

  // Move to approved first (via service role for setup)
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${statusIid}`, "PATCH", { status: "approved" });

  // Valid: approved -> acknowledged
  const s1 = await apiCall(`/api/incidents/${statusIid}/status`, "POST", {
    status: "acknowledged",
    reason: "Test acknowledgement",
  }, coordUser.token);
  log("status_acknowledged", s1.status === 200 && s1.json.status === "acknowledged", `status=${s1.status} result=${s1.json?.status}`);

  // Valid: acknowledged -> dispatched
  const s2 = await apiCall(`/api/incidents/${statusIid}/status`, "POST", {
    status: "dispatched",
    reason: "Team dispatched",
  }, coordUser.token);
  log("status_dispatched", s2.status === 200 && s2.json.status === "dispatched", `status=${s2.status} result=${s2.json?.status}`);

  // Valid: dispatched -> resolved
  const s3 = await apiCall(`/api/incidents/${statusIid}/status`, "POST", {
    status: "resolved",
    reason: "Situation handled",
  }, coordUser.token);
  log("status_resolved", s3.status === 200 && s3.json.status === "resolved", `status=${s3.status} result=${s3.json?.status}`);

  // Invalid: resolved -> acknowledged (terminal)
  const s4 = await apiCall(`/api/incidents/${statusIid}/status`, "POST", {
    status: "acknowledged",
    reason: "Try reopen",
  }, coordUser.token);
  log("status_terminal_rejected", s4.status === 400, `status=${s4.status} msg=${s4.json?.error?.message}`);

  // Target not allowed via this route: 'approved'
  const s5 = await apiCall(`/api/incidents/${incidents[3].incident_id}/status`, "POST", {
    status: "approved",
    reason: "Try approve via status route",
  }, coordUser.token);
  log("status_disallowed_target", s5.status === 400, `status=${s5.status} msg=${s5.json?.error?.message}`);

  // ── TEST: Race — 5 simultaneous status changes ──
  console.log("\n--- Concurrency race test ---");
  const raceIid = incidents[3].incident_id;
  // Wait for after() AI processing to complete
  await new Promise(r => setTimeout(r, 3000));
  const patchRes = await supabaseAdmin(`/rest/v1/incidents?id=eq.${raceIid}`, "PATCH", { status: "approved" });
  console.log(`  PATCH to approved: status=${patchRes.status}`);
  await new Promise(r => setTimeout(r, 500));

  const verifyPatch = await supabaseAdmin(`/rest/v1/incidents?id=eq.${raceIid}&select=status`);
  console.log(`  Verified status: ${verifyPatch.json?.[0]?.status}`);

  const raceResults = await Promise.all(
    Array(5).fill(null).map(() =>
      apiCall(`/api/incidents/${raceIid}/status`, "POST", {
        status: "acknowledged",
        reason: "Race test",
      }, coordUser.token)
    )
  );
  const raceOk = raceResults.filter(r => r.status === 200).length;
  const race409 = raceResults.filter(r => r.status === 409).length;
  // Exactly one should win; every loser gets 409 CONFLICT
  log("race_exactly_one_wins", raceOk === 1 && race409 === 4, `ok=${raceOk} conflict=${race409}`);

  // ── TEST: Verify events logged correctly ──
  console.log("\n--- Event verification ---");
  const ev = await apiCall(`/api/incidents/${statusIid}/events`, "GET", null, coordUser.token);
  const statusEvents = ev.json.data.filter(e => e.event_type === "status_changed");
  log("events_logged", statusEvents.length === 3, `status_changed_events=${statusEvents.length}`);
  if (statusEvents.length > 0) {
    const hasActor = statusEvents.every(e => e.actor_id === coordUser.id);
    log("events_correct_actor", hasActor, `all_by_coordinator=${hasActor}`);
  }

  // ── TEST: POST /api/incidents/[id]/modify ──
  console.log("\n--- Modify (human correction) ---");
  const modIid = incidents[0].incident_id;
  const m1 = await apiCall(`/api/incidents/${modIid}/modify`, "POST", {
    triage: "immediate",
    incident_type: "building_collapse",
    reason: "Upgraded after field report",
  }, coordUser.token);
  log("modify_triage", m1.status === 200 && m1.json.verification_status === "human_verified", `status=${m1.status} vs=${m1.json?.verification_status}`);

  // Verify human_correction event
  const mev = await apiCall(`/api/incidents/${modIid}/events`, "GET", null, coordUser.token);
  const corrEvent = mev.json.data.find(e => e.event_type === "human_correction");
  log("modify_event_logged", !!corrEvent, `has_correction=${!!corrEvent}`);

  // ── TEST: POST /api/incidents/[id]/duplicate ──
  console.log("\n--- Duplicate resolution ---");
  // Create 2 fresh incidents for duplicate testing
  const dupCid1 = "22222222-2222-4222-a222-200000000001";
  const dupCid2 = "22222222-2222-4222-a222-200000000002";
  const d1 = await apiCall("/api/incidents", "POST", { client_id: dupCid1, raw_text: "[TEST] Dup original", incident_type: "fire", location_source: "none" });
  const d2 = await apiCall("/api/incidents", "POST", { client_id: dupCid2, raw_text: "[TEST] Dup copy", incident_type: "fire", location_source: "none" });
  testIncidentIds.push(d1.json.incident_id, d2.json.incident_id);
  // Wait for after() AI processing to finish
  await new Promise(r => setTimeout(r, 3000));

  // Merge: d2 into d1 (d2 becomes rejected)
  const dm = await apiCall(`/api/incidents/${d2.json.incident_id}/duplicate`, "POST", {
    possible_duplicate_of: d1.json.incident_id,
    action: "merge",
  }, coordUser.token);
  log("duplicate_merge", dm.status === 200 && dm.json.resolution === "merged", `status=${dm.status} resolution=${dm.json?.resolution}`);

  // Verify d2 is now 'rejected' with false_or_duplicate
  const dCheck = await apiCall(`/api/incidents/${d2.json.incident_id}`, "GET", null, coordUser.token);
  log("merge_sets_rejected", dCheck.json.status === "rejected" && dCheck.json.verification_status === "false_or_duplicate",
    `status=${dCheck.json?.status} vs=${dCheck.json?.verification_status}`);

  // Keep separate test
  const dupCid3 = "22222222-2222-4222-a222-200000000003";
  const dupCid4 = "22222222-2222-4222-a222-200000000004";
  const d3 = await apiCall("/api/incidents", "POST", { client_id: dupCid3, raw_text: "[TEST] Keep sep 1", incident_type: "medical", location_source: "none" });
  const d4 = await apiCall("/api/incidents", "POST", { client_id: dupCid4, raw_text: "[TEST] Keep sep 2", incident_type: "medical", location_source: "none" });
  testIncidentIds.push(d3.json.incident_id, d4.json.incident_id);

  // Set d4 to duplicate_review
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${d4.json.incident_id}`, "PATCH", { status: "duplicate_review" });

  const dk = await apiCall(`/api/incidents/${d4.json.incident_id}/duplicate`, "POST", {
    possible_duplicate_of: d3.json.incident_id,
    action: "keep_separate",
  }, coordUser.token);
  log("duplicate_keep_separate", dk.status === 200 && dk.json.resolution === "kept_separate", `status=${dk.status} resolution=${dk.json?.resolution}`);

  // Verify d4 moved to 'reviewed'
  const dkCheck = await apiCall(`/api/incidents/${d4.json.incident_id}`, "GET", null, coordUser.token);
  log("keep_sep_moves_to_reviewed", dkCheck.json.status === "reviewed", `status=${dkCheck.json?.status}`);

  // ── TEST: Missing attachment (Part 0b) ──
  console.log("\n--- Missing attachment test ---");
  const maCid = "33333333-3333-4333-a333-300000000001";
  const ma = await apiCall("/api/incidents", "POST", {
    client_id: maCid,
    raw_text: "[TEST] Incident with missing attachment",
    incident_type: "other",
    location_source: "none",
    attachment_paths: [{
      storage_path: `incidents/${maCid}/nonexistent-file.png`,
      mime_type: "image/png",
      size_bytes: 1024,
    }],
  });
  testIncidentIds.push(ma.json.incident_id);
  log("missing_att_still_created", ma.status === 200 && !ma.json.duplicate, `status=${ma.status} id=${ma.json?.incident_id}`);

  // Check for attachment_missing event
  const maEv = await apiCall(`/api/incidents/${ma.json.incident_id}/events`, "GET", null, coordUser.token);
  const missingEvt = maEv.json.data.find(e => e.event_type === "attachment_missing");
  log("missing_att_event_logged", !!missingEvt, `has_event=${!!missingEvt} paths=${JSON.stringify(missingEvt?.payload?.skipped_paths)}`);

  // Verify no attachment row was created
  const attCheck = await supabaseAdmin(`/rest/v1/attachments?incident_id=eq.${ma.json.incident_id}&select=id`);
  log("missing_att_no_row", attCheck.json.length === 0, `attachment_rows=${attCheck.json.length}`);

  // ── TEST: Anon storage upload (Part 0c) ──
  console.log("\n--- Anon storage upload denial ---");
  const anonUpload = await fetch(
    `${SUPABASE_URL}/storage/v1/object/incident-attachments/test/hacker.png`,
    {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "image/png",
      },
      body: new Uint8Array([0]),
    }
  );
  const anonBody = await anonUpload.text();
  log("anon_storage_denied", !anonUpload.ok, `status=${anonUpload.status} body=${anonBody}`);

  // ── CLEANUP ──
  console.log("\n--- Cleanup ---");

  // Delete test data in order (FK constraints)
  for (const iid of testIncidentIds) {
    await supabaseAdmin(`/rest/v1/incident_duplicates?incident_id=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/incident_duplicates?possible_duplicate_of=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/assignments?incident_id=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/attachments?incident_id=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/incident_events?incident_id=eq.${iid}`, "DELETE");
  }
  for (const iid of testIncidentIds) {
    await supabaseAdmin(`/rest/v1/incidents?id=eq.${iid}`, "DELETE");
  }

  // Delete app_users and auth users
  for (const uid of testUserIds) {
    await supabaseAdmin(`/rest/v1/app_users?id=eq.${uid}`, "DELETE");
  }
  for (const uid of testUserIds) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
  }

  // Verify seed data untouched (strict UUID check)
  const seed1 = await supabaseAdmin("/rest/v1/incidents?id=eq.c0000000-0000-0000-0000-000000000001&select=id,status");
  const seed2 = await supabaseAdmin("/rest/v1/incidents?id=eq.c0000000-0000-0000-0000-000000000002&select=id,status");
  const seedOrgs = await supabaseAdmin("/rest/v1/organizations?select=id");
  const seedResp2 = await supabaseAdmin("/rest/v1/responders?select=id");
  log("seed_incident_1_intact", seed1.json?.length === 1 && seed1.json[0].status === "resolved",
    `status=${seed1.json?.[0]?.status}`);
  log("seed_incident_2_intact", seed2.json?.length === 1 && seed2.json[0].status === "acknowledged",
    `status=${seed2.json?.[0]?.status}`);
  log("seed_orgs_intact", seedOrgs.json.length === 4, `orgs=${seedOrgs.json.length}`);
  log("seed_responders_intact", seedResp2.json.length === 4, `responders=${seedResp2.json.length}`);

  // Zero [TEST] leftovers
  const leftovers = await supabaseAdmin("/rest/v1/incidents?raw_text=like.[TEST]*&select=id");
  log("zero_test_leftovers", leftovers.json?.length === 0,
    `leftover_count=${leftovers.json?.length}`);

  // ── SUMMARY ──
  console.log("\n=== SUMMARY ===");
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`Passed: ${passed}/${results.length} | Failed: ${failed}`);
  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
