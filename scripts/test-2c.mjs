// Checkpoint 2C — Fix verification + 2B regression tests
// Run: node --env-file=.env.local scripts/test-2c.mjs

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing env vars. Run with: node --env-file=.env.local scripts/test-2c.mjs");
  process.exit(1);
}

const results = [];
const testUserIds = [];
const testIncidentIds = [];
const testResponderIds = [];
const testOrgIds = [];

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

async function createTestUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Failed to create user ${email}: ${JSON.stringify(data)}`);
  testUserIds.push(data.id);

  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  return { id: data.id, token: loginData.access_token };
}

async function main() {
  console.log("\n=== Checkpoint 2C — Fix Verification ===\n");

  // ── SETUP ──
  console.log("--- Setting up test users ---");
  const responderUser = await createTestUser("test2c-responder@example.com", "Test1234!");
  const coordUser = await createTestUser("test2c-coordinator@example.com", "Test1234!");

  await supabaseAdmin("/rest/v1/app_users", "POST", { id: responderUser.id, role: "responder", display_name: "Test Responder 2C" });
  await supabaseAdmin("/rest/v1/app_users", "POST", { id: coordUser.id, role: "coordinator", display_name: "Test Coordinator 2C" });

  // Create test incidents
  console.log("--- Creating test incidents ---");
  const incidents = [];
  for (let i = 0; i < 6; i++) {
    const cid = `44444444-4444-4444-a444-40000000000${i}`;
    const r = await apiCall("/api/incidents", "POST", {
      client_id: cid,
      raw_text: `[TEST 2C] Incident ${i}`,
      incident_type: "fire",
      latitude: 27.7 + i * 0.01,
      longitude: 85.3 + i * 0.01,
      location_source: "gps",
    });
    incidents.push({ ...r.json, client_id: cid });
    testIncidentIds.push(r.json.incident_id);
  }

  // Get a verified seed responder for valid assigns
  const seedRespCheck = await supabaseAdmin("/rest/v1/responders?verified=eq.true&available=eq.true&select=id,organization&limit=2");
  const seedResp1 = seedRespCheck.json[0];
  const seedResp2 = seedRespCheck.json[1];

  // ══════════════════════════════════════════
  // FIX 1: DUPLICATE ROUTE ALLOWS RESPONDER
  // ══════════════════════════════════════════
  console.log("\n--- Fix 1: Duplicate route allows responder ---");
  const dupCid1 = "55555555-5555-4555-a555-500000000001";
  const dupCid2 = "55555555-5555-4555-a555-500000000002";
  const dup1 = await apiCall("/api/incidents", "POST", { client_id: dupCid1, raw_text: "[TEST 2C] Dup orig", incident_type: "fire", location_source: "none" });
  const dup2 = await apiCall("/api/incidents", "POST", { client_id: dupCid2, raw_text: "[TEST 2C] Dup copy", incident_type: "fire", location_source: "none" });
  testIncidentIds.push(dup1.json.incident_id, dup2.json.incident_id);

  const dupRes = await apiCall(`/api/incidents/${dup2.json.incident_id}/duplicate`, "POST", {
    possible_duplicate_of: dup1.json.incident_id,
    action: "merge",
  }, responderUser.token);
  log("fix1_dup_responder_allowed", dupRes.status === 200, `status=${dupRes.status} resolution=${dupRes.json?.resolution}`);

  // ══════════════════════════════════════════
  // FIX 2: ASSIGN ROUTE STATE RULES
  // ══════════════════════════════════════════
  console.log("\n--- Fix 2: Assign from invalid state → 409 ---");

  // 2a: Assign from 'new' → 409, no assignment row
  const newIid = incidents[0].incident_id;
  const a1 = await apiCall(`/api/incidents/${newIid}/assign`, "POST", {
    responder_id: seedResp1.id,
  }, coordUser.token);
  log("fix2_assign_new_409", a1.status === 409, `status=${a1.status} code=${a1.json?.error?.code}`);

  // Verify no assignment row created
  const a1check = await supabaseAdmin(`/rest/v1/assignments?incident_id=eq.${newIid}&select=id`);
  log("fix2_assign_new_no_row", a1check.json.length === 0, `assignment_rows=${a1check.json.length}`);

  // 2b: Assign from 'reviewed' → 409
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${incidents[1].incident_id}`, "PATCH", { status: "reviewed" });
  await new Promise(r => setTimeout(r, 100));
  const a2 = await apiCall(`/api/incidents/${incidents[1].incident_id}/assign`, "POST", {
    responder_id: seedResp1.id,
  }, coordUser.token);
  log("fix2_assign_reviewed_409", a2.status === 409, `status=${a2.status}`);

  // 2c: Assign from 'resolved' → 409
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${incidents[2].incident_id}`, "PATCH", { status: "resolved" });
  await new Promise(r => setTimeout(r, 100));
  const a3 = await apiCall(`/api/incidents/${incidents[2].incident_id}/assign`, "POST", {
    responder_id: seedResp1.id,
  }, coordUser.token);
  log("fix2_assign_resolved_409", a3.status === 409, `status=${a3.status}`);

  // 2d: Assign from 'approved' → 200, moves to 'assigned'
  console.log("\n--- Fix 2: Assign from valid states ---");
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${incidents[3].incident_id}`, "PATCH", { status: "approved" });
  await new Promise(r => setTimeout(r, 100));
  const a4 = await apiCall(`/api/incidents/${incidents[3].incident_id}/assign`, "POST", {
    responder_id: seedResp1.id,
    notes: "Primary responder",
  }, coordUser.token);
  log("fix2_assign_approved_200", a4.status === 200, `status=${a4.status} id=${a4.json?.assignment_id}`);

  // Check incident moved to 'assigned'
  const i3check = await apiCall(`/api/incidents/${incidents[3].incident_id}`, "GET", null, coordUser.token);
  log("fix2_approved_becomes_assigned", i3check.json.status === "assigned", `status=${i3check.json?.status}`);

  // 2e: Assign second responder to already-assigned incident → 200, status unchanged
  const a5 = await apiCall(`/api/incidents/${incidents[3].incident_id}/assign`, "POST", {
    responder_id: seedResp2.id,
    notes: "Secondary responder",
  }, coordUser.token);
  log("fix2_second_responder_200", a5.status === 200, `status=${a5.status} id=${a5.json?.assignment_id}`);

  // Status should still be 'assigned' (unchanged)
  const i3check2 = await apiCall(`/api/incidents/${incidents[3].incident_id}`, "GET", null, coordUser.token);
  log("fix2_status_unchanged_assigned", i3check2.json.status === "assigned", `status=${i3check2.json?.status}`);

  // Count assignment rows — should be 2
  const assignCount = await supabaseAdmin(`/rest/v1/assignments?incident_id=eq.${incidents[3].incident_id}&select=id`);
  log("fix2_two_assignments", assignCount.json.length === 2, `assignment_count=${assignCount.json.length}`);

  // 2f: Duplicate assignment (same responder again) → 409
  const a6 = await apiCall(`/api/incidents/${incidents[3].incident_id}/assign`, "POST", {
    responder_id: seedResp1.id,
  }, coordUser.token);
  log("fix2_duplicate_assign_409", a6.status === 409, `status=${a6.status} code=${a6.json?.error?.code}`);

  // 2g: Assign from 'notification_failed' → 200, moves to 'assigned'
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${incidents[4].incident_id}`, "PATCH", { status: "notification_failed" });
  await new Promise(r => setTimeout(r, 100));
  const a7 = await apiCall(`/api/incidents/${incidents[4].incident_id}/assign`, "POST", {
    responder_id: seedResp1.id,
  }, coordUser.token);
  log("fix2_assign_notif_failed_200", a7.status === 200, `status=${a7.status}`);
  const i4check = await apiCall(`/api/incidents/${incidents[4].incident_id}`, "GET", null, coordUser.token);
  log("fix2_notif_failed_becomes_assigned", i4check.json.status === "assigned", `status=${i4check.json?.status}`);

  // 2h: Assign from 'dispatched' → 200, status unchanged
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${incidents[5].incident_id}`, "PATCH", { status: "dispatched" });
  await new Promise(r => setTimeout(r, 100));
  const a8 = await apiCall(`/api/incidents/${incidents[5].incident_id}/assign`, "POST", {
    responder_id: seedResp1.id,
  }, coordUser.token);
  log("fix2_assign_dispatched_200", a8.status === 200, `status=${a8.status}`);
  const i5check = await apiCall(`/api/incidents/${incidents[5].incident_id}`, "GET", null, coordUser.token);
  log("fix2_dispatched_unchanged", i5check.json.status === "dispatched", `status=${i5check.json?.status}`);

  // 2i: Assign unverified responder → refused
  console.log("\n--- Fix 2: Unverified/unavailable responders ---");
  const testOrg = { id: "e0000000-0000-0000-0000-000000000099", name: "[TEST] Temp Org" };
  await supabaseAdmin("/rest/v1/organizations", "POST", testOrg);
  testOrgIds.push(testOrg.id);

  // Unverified responder
  const unverifiedResp = {
    id: "f0000000-0000-0000-0000-000000000001",
    organization_id: testOrg.id,
    organization: "[TEST] Temp Org",
    service_type: "rescue",
    email: "test-unverified@example.com",
    phone: "+977-1-9999901",
    contact_person: "Unverified Person",
    latitude: 27.71, longitude: 85.32,
    available: true,
    verified: false,
  };
  await supabaseAdmin("/rest/v1/responders", "POST", unverifiedResp);
  testResponderIds.push(unverifiedResp.id);

  // Create a fresh 'approved' incident for this test
  const uvCid = "66666666-6666-4666-a666-600000000001";
  const uvInc = await apiCall("/api/incidents", "POST", { client_id: uvCid, raw_text: "[TEST 2C] Unverified test", incident_type: "fire", location_source: "none" });
  testIncidentIds.push(uvInc.json.incident_id);
  await supabaseAdmin(`/rest/v1/incidents?id=eq.${uvInc.json.incident_id}`, "PATCH", { status: "approved" });
  await new Promise(r => setTimeout(r, 100));

  const aUnverified = await apiCall(`/api/incidents/${uvInc.json.incident_id}/assign`, "POST", {
    responder_id: unverifiedResp.id,
  }, coordUser.token);
  log("fix2_unverified_refused", aUnverified.status === 400, `status=${aUnverified.status} msg=${aUnverified.json?.error?.message}`);

  // Unavailable responder
  const unavailResp = {
    id: "f0000000-0000-0000-0000-000000000002",
    organization_id: testOrg.id,
    organization: "[TEST] Temp Org",
    service_type: "rescue",
    email: "test-unavail@example.com",
    phone: "+977-1-9999902",
    contact_person: "Unavailable Person",
    latitude: 27.71, longitude: 85.32,
    available: false,
    verified: true,
  };
  await supabaseAdmin("/rest/v1/responders", "POST", unavailResp);
  testResponderIds.push(unavailResp.id);

  const aUnavail = await apiCall(`/api/incidents/${uvInc.json.incident_id}/assign`, "POST", {
    responder_id: unavailResp.id,
  }, coordUser.token);
  log("fix2_unavailable_refused", aUnavail.status === 400, `status=${aUnavail.status} msg=${aUnavail.json?.error?.message}`);

  // ══════════════════════════════════════════
  // FIX 3: EVENT VOCABULARY
  // ══════════════════════════════════════════
  console.log("\n--- Fix 3: Event vocabulary in seed data ---");
  const seedEvents = await supabaseAdmin("/rest/v1/incident_events?incident_id=eq.c0000000-0000-0000-0000-000000000001&select=event_type&order=created_at");
  const seedTypes = seedEvents.json.map(e => e.event_type);
  log("fix3_no_human_approved", !seedTypes.includes("human_approved"), `events=${seedTypes.join(",")}`);
  log("fix3_has_alert_approved", seedTypes.includes("alert_approved"), `has_alert_approved=${seedTypes.includes("alert_approved")}`);

  const seedEvents2 = await supabaseAdmin("/rest/v1/incident_events?incident_id=eq.c0000000-0000-0000-0000-000000000002&select=event_type&order=created_at");
  const seedTypes2 = seedEvents2.json.map(e => e.event_type);
  log("fix3_no_responder_acknowledged", !seedTypes2.includes("responder_acknowledged"), `events=${seedTypes2.join(",")}`);
  log("fix3_has_acknowledgement_received", seedTypes2.includes("acknowledgement_received"), `has=${seedTypes2.includes("acknowledgement_received")}`);

  // ══════════════════════════════════════════
  // FIX 4: OPAQUE CURSOR
  // ══════════════════════════════════════════
  console.log("\n--- Fix 4: Opaque base64url cursor ---");

  const l1 = await apiCall("/api/incidents?limit=2", "GET", null, coordUser.token);
  // Opaque = not a raw timestamp (doesn't start with a 4-digit year)
  const isOpaque = l1.json.next_cursor && !/^\d{4}-\d{2}/.test(l1.json.next_cursor);
  log("fix4_cursor_is_opaque", l1.status === 200 && isOpaque, `status=${l1.status} cursor=${l1.json?.next_cursor?.substring(0, 30)}...`);

  // Decode and verify structure
  let decoded = null;
  try {
    decoded = JSON.parse(Buffer.from(l1.json.next_cursor, "base64url").toString("utf8"));
  } catch {}
  log("fix4_cursor_contains_id", decoded && decoded.id && decoded.created_at, `has_id=${!!decoded?.id} has_created_at=${!!decoded?.created_at}`);

  // Page 2 works
  if (l1.json.next_cursor) {
    const l2 = await apiCall(`/api/incidents?limit=2&cursor=${l1.json.next_cursor}`, "GET", null, coordUser.token);
    log("fix4_page2_works", l2.status === 200 && l2.json.data.length > 0, `status=${l2.status} count=${l2.json?.data?.length}`);

    // No overlap between pages
    const page1Ids = new Set(l1.json.data.map(d => d.id));
    const overlap = l2.json.data.filter(d => page1Ids.has(d.id));
    log("fix4_no_overlap", overlap.length === 0, `overlap=${overlap.length}`);
  }

  // Invalid cursor → 400
  const lBad = await apiCall("/api/incidents?limit=2&cursor=not-valid-base64", "GET", null, coordUser.token);
  log("fix4_invalid_cursor_400", lBad.status === 400, `status=${lBad.status} code=${lBad.json?.error?.code}`);

  // List filtered by triage
  const lTriage = await apiCall("/api/incidents?triage=immediate", "GET", null, coordUser.token);
  log("fix4_filter_by_triage", lTriage.status === 200, `status=${lTriage.status} count=${lTriage.json?.data?.length}`);

  // ══════════════════════════════════════════
  // ADDITIONAL: STATUS TRANSITION ERROR FORMAT
  // ══════════════════════════════════════════
  console.log("\n--- Invalid status transition returns §8.2 format ---");
  const badTransIid = incidents[0].incident_id; // still at 'new'
  const st1 = await apiCall(`/api/incidents/${badTransIid}/status`, "POST", {
    status: "dispatched",
    reason: "Invalid jump",
  }, coordUser.token);
  log("invalid_transition_format",
    st1.status === 400 &&
    st1.json?.error?.code === "VALIDATION_ERROR" &&
    typeof st1.json?.error?.message === "string" &&
    typeof st1.json?.error?.retryable === "boolean" &&
    typeof st1.json?.error?.request_id === "string",
    `status=${st1.status} code=${st1.json?.error?.code} has_request_id=${!!st1.json?.error?.request_id}`
  );

  // ══════════════════════════════════════════
  // EXPLAIN: How 2B tests moved to 'acknowledged'
  // ══════════════════════════════════════════
  console.log("\n--- Explanation: How 2B moved to acknowledged ---");
  console.log("  The 2B test suite used a direct Supabase admin PATCH");
  console.log("  (service role REST API) to set incident status to 'approved',");
  console.log("  then used POST /api/incidents/[id]/status with status='acknowledged'");
  console.log("  which is a valid transition: approved → acknowledged.");
  console.log("  The admin PATCH bypasses our transition map (it goes directly");
  console.log("  via the PostgREST service-role endpoint). This is test setup,");
  console.log("  not a code path that production users can reach.");
  log("explain_2b_ack", true, "Documented: service-role PATCH → approved, then status route → acknowledged");

  // ══════════════════════════════════════════
  // CLEANUP
  // ══════════════════════════════════════════
  console.log("\n--- Cleanup ---");

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
  for (const rid of testResponderIds) {
    await supabaseAdmin(`/rest/v1/responders?id=eq.${rid}`, "DELETE");
  }
  for (const oid of testOrgIds) {
    await supabaseAdmin(`/rest/v1/organizations?id=eq.${oid}`, "DELETE");
  }
  for (const uid of testUserIds) {
    await supabaseAdmin(`/rest/v1/app_users?id=eq.${uid}`, "DELETE");
  }
  for (const uid of testUserIds) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
  }

  // Verify seed data intact (strict UUID check)
  const seed1 = await supabaseAdmin("/rest/v1/incidents?id=eq.c0000000-0000-0000-0000-000000000001&select=id,status");
  const seed2 = await supabaseAdmin("/rest/v1/incidents?id=eq.c0000000-0000-0000-0000-000000000002&select=id,status");
  const seedOrgs = await supabaseAdmin("/rest/v1/organizations?select=id");
  const seedResp = await supabaseAdmin("/rest/v1/responders?select=id");
  log("seed_incident_1_intact", seed1.json?.length === 1 && seed1.json[0].status === "resolved",
    `status=${seed1.json?.[0]?.status}`);
  log("seed_incident_2_intact", seed2.json?.length === 1 && seed2.json[0].status === "acknowledged",
    `status=${seed2.json?.[0]?.status}`);
  log("seed_orgs_intact", seedOrgs.json.length === 4, `orgs=${seedOrgs.json.length}`);
  log("seed_responders_intact", seedResp.json.length === 4, `responders=${seedResp.json.length}`);

  // Zero [TEST] leftovers
  const leftovers = await supabaseAdmin("/rest/v1/incidents?raw_text=like.[TEST]*&select=id");
  log("zero_test_leftovers", leftovers.json?.length === 0,
    `leftover_count=${leftovers.json?.length}`);

  // ══════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════
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
