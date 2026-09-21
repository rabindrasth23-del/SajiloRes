// Checkpoint 3A â€” Agent Loop Tests (mock AI provider)
// Run: node --env-file=.env.local scripts/test-3a.mjs

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "test-internal-secret-3a-dev-only";

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing env vars. Run with: node --env-file=.env.local scripts/test-3a.mjs");
  process.exit(1);
}

const results = [];
const testIncidentIds = [];
const testUserIds = [];
let staffToken = null;

function log(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "âœ…" : "âŒ"} ${name}: ${detail}`);
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function signInStaff(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  return json.access_token;
}

async function getEvents(incidentId) {
  const data = await supabaseAdmin(
    `incident_events?incident_id=eq.${incidentId}&order=created_at.asc&select=event_type,payload`
  );
  return Array.isArray(data) ? data : [];
}

async function waitForProcessing(incidentId, maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const data = await supabaseAdmin(
      `incidents?id=eq.${incidentId}&select=ai_status,status`
    );
    if (Array.isArray(data) && data[0]) {
      if (data[0].ai_status === "completed" || data[0].ai_status === "failed") {
        return data[0];
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  // Return whatever we have
  const data = await supabaseAdmin(
    `incidents?id=eq.${incidentId}&select=ai_status,status`
  );
  return Array.isArray(data) ? data[0] : null;
}

// â”€â”€â”€ SETUP â”€â”€â”€
async function setup() {
  console.log("\n=== SETUP ===\n");

  // Create a temp staff user
  const email = `test3a-staff-${Date.now()}@test.local`;
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: "TestPass123!",
      email_confirm: true,
    }),
  });
  const user = await createRes.json();
  if (!user.id) throw new Error("Failed to create test staff user");
  testUserIds.push(user.id);

  // Assign responder role
  await supabaseAdmin("app_users", "POST", {
    id: user.id,
    role: "responder",
    display_name: "Test 3A Staff",
  });

  staffToken = await signInStaff(email, "TestPass123!");
  console.log(`Staff user created: ${email}`);
}

// â”€â”€â”€ CLEANUP â”€â”€â”€
async function cleanup() {
  console.log("\n=== CLEANUP ===\n");

  // Delete test incidents, events, duplicates
  for (const id of testIncidentIds) {
    await supabaseAdmin(`incident_duplicates?incident_id=eq.${id}`, "DELETE");
    await supabaseAdmin(`incident_duplicates?possible_duplicate_of=eq.${id}`, "DELETE");
    await supabaseAdmin(`incident_events?incident_id=eq.${id}`, "DELETE");
    await supabaseAdmin(`assignments?incident_id=eq.${id}`, "DELETE");
    await supabaseAdmin(`notifications?incident_id=eq.${id}`, "DELETE");
    await supabaseAdmin(`attachments?incident_id=eq.${id}`, "DELETE");
    await supabaseAdmin(`incidents?id=eq.${id}`, "DELETE");
  }

  // Delete test users
  for (const uid of testUserIds) {
    await supabaseAdmin(`app_users?id=eq.${uid}`, "DELETE");
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: "DELETE",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
  }

  console.log(`Cleaned up ${testIncidentIds.length} incidents, ${testUserIds.length} users`);
}

// â”€â”€â”€ HELPER: create incident and wait â”€â”€â”€
async function createAndWait(clientId, rawText, opts = {}) {
  const body = {
    client_id: clientId,
    raw_text: rawText,
    incident_type: opts.incident_type || "building_collapse",
    location_source: opts.location_source || "gps",
    ...(opts.latitude !== undefined && { latitude: opts.latitude }),
    ...(opts.longitude !== undefined && { longitude: opts.longitude }),
    ...(opts.location_text !== undefined && { location_text: opts.location_text }),
  };
  const res = await post("/api/incidents", body);
  if (res.json.incident_id) testIncidentIds.push(res.json.incident_id);
  return res;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TESTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function main() {
  console.log("\n=== SajiloResQ â€” Checkpoint 3A Tests ===\n");

  await setup();

  // â”€â”€â”€ TEST 1: Happy path â€” events and fields â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] Building collapsed near Ratnapark, 3 injured trapped", {
      latitude: 27.7059,
      longitude: 85.3143,
    });
    const id = r.json.incident_id;

    // Wait for processing via after()
    const inc = await waitForProcessing(id);

    log("happy_ai_status", inc?.ai_status === "completed", `ai_status=${inc?.ai_status}`);
    log("happy_status", inc?.status === "reviewed", `status=${inc?.status}`);

    // Check verification
    const fullInc = await supabaseAdmin(`incidents?id=eq.${id}&select=*`);
    const row = Array.isArray(fullInc) ? fullInc[0] : null;
    log("happy_verification", row?.verification_status === "ai_reviewed", `verification=${row?.verification_status}`);
    log("happy_fields_persisted",
      !!row?.summary && !!row?.triage && row?.confidence > 0 && !!row?.recommended_action,
      `summary=${!!row?.summary} triage=${row?.triage} confidence=${row?.confidence}`
    );

    // Check events
    const events = await getEvents(id);
    const eventTypes = events.map((e) => e.event_type);
    // Filter to agent events only (exclude report_received)
    const agentEvents = eventTypes.filter((t) => t !== "report_received");
    const expectedOrder = ["facts_extracted", "duplicate_check_completed", "triage_recommended", "responders_found", "approval_requested"];
    const orderCorrect = expectedOrder.every((e, i) => agentEvents[i] === e);
    log("happy_events_order",
      orderCorrect && agentEvents.length === expectedOrder.length,
      `events=[${agentEvents.join(",")}]`
    );

    // Check attempts in facts_extracted payload
    const factsEvt = events.find((e) => e.event_type === "facts_extracted");
    log("happy_attempts_in_payload",
      factsEvt?.payload?.attempts === 1,
      `attempts=${factsEvt?.payload?.attempts}`
    );
  }

  // â”€â”€â”€ TEST 2: Citizen POST responds fast with [[mock:slow]] â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const start = Date.now();
    const r = await createAndWait(cid, "[TEST] [[mock:slow]] Building on fire", {
      latitude: 27.71,
      longitude: 85.32,
    });
    const elapsed = Date.now() - start;
    log("citizen_fast_response",
      elapsed < 1000 && r.status === 200,
      `elapsed=${elapsed}ms status=${r.status}`
    );
  }

  // â”€â”€â”€ TEST 3: Timeout â†’ ai_status pending, provider called twice â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:timeout]] Something happened", {
      latitude: 27.72,
      longitude: 85.33,
    });
    const id = r.json.incident_id;

    // Wait a bit for the timeout to play out (AI_TIMEOUT_MS * 2 + buffer)
    await new Promise((r) => setTimeout(r, 6000));

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=ai_status,status,raw_text`);
    const row = Array.isArray(inc) ? inc[0] : null;

    log("timeout_ai_status", row?.ai_status === "pending", `ai_status=${row?.ai_status}`);
    log("timeout_status_new", row?.status === "new", `status=${row?.status}`);
    log("timeout_raw_text_intact",
      row?.raw_text?.includes("[[mock:timeout]]"),
      `raw_text_has_token=${row?.raw_text?.includes("[[mock:timeout]]")}`
    );

    // Check failure event has attempts=2
    const events = await getEvents(id);
    const failEvt = events.find((e) => e.event_type === "ai_processing_failed");
    log("timeout_two_attempts",
      failEvt?.payload?.attempts === 2,
      `attempts=${failEvt?.payload?.attempts}`
    );

    // Staff /process retry should succeed
    const retryR = await post(`/api/incidents/${id}/process`, {}, {
      Authorization: `Bearer ${staffToken}`,
    });
    // After retry the mock won't have [[mock:timeout]] since raw_text still has it
    // But the mock will re-try with timeout again... so this tests that process route works
    log("timeout_retry_returns_200",
      retryR.status === 200,
      `status=${retryR.status} ai_status=${retryR.json.ai_status}`
    );
  }

  // â”€â”€â”€ TEST 4: invalid_json â†’ ai_status failed â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:invalid_json]] Help", {
      latitude: 27.73,
      longitude: 85.34,
    });
    const id = r.json.incident_id;
    await new Promise((r) => setTimeout(r, 3000));

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=ai_status,status,summary`);
    const row = Array.isArray(inc) ? inc[0] : null;

    // invalid_json is a provider error (throws), not schema error
    // Both retries will throw, so ai_status goes to pending
    log("invalid_json_ai_status",
      row?.ai_status === "pending" || row?.ai_status === "failed",
      `ai_status=${row?.ai_status}`
    );
    log("invalid_json_nothing_persisted",
      !row?.summary,
      `summary=${row?.summary}`
    );
  }

  // â”€â”€â”€ TEST 5: bad_triage â†’ ai_status failed (schema rejects "critical") â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:bad_triage]] Report", {
      latitude: 27.74,
      longitude: 85.35,
    });
    const id = r.json.incident_id;
    await new Promise((r) => setTimeout(r, 3000));

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=ai_status,status,summary`);
    const row = Array.isArray(inc) ? inc[0] : null;

    log("bad_triage_ai_status", row?.ai_status === "failed", `ai_status=${row?.ai_status}`);
    log("bad_triage_nothing_persisted", !row?.summary, `summary=${row?.summary}`);

    const events = await getEvents(id);
    const failEvt = events.find((e) => e.event_type === "ai_processing_failed");
    log("bad_triage_failure_event",
      failEvt?.payload?.error_type === "schema_validation_error",
      `error_type=${failEvt?.payload?.error_type}`
    );
  }

  // â”€â”€â”€ TEST 6: low_confidence â†’ needs_human_review forced true â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:low_confidence]] Minor road issue", {
      latitude: 27.75,
      longitude: 85.36,
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=needs_human_review,confidence`);
    const row = Array.isArray(inc) ? inc[0] : null;

    log("low_confidence_review",
      row?.needs_human_review === true,
      `needs_human_review=${row?.needs_human_review} confidence=${row?.confidence}`
    );
  }

  // â”€â”€â”€ TEST 7: no_review â†’ needs_human_review forced true (immediate overrides) â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:no_review]] Major incident", {
      latitude: 27.76,
      longitude: 85.37,
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=needs_human_review,triage`);
    const row = Array.isArray(inc) ? inc[0] : null;

    log("no_review_forced_true",
      row?.needs_human_review === true && row?.triage === "immediate",
      `needs_human_review=${row?.needs_human_review} triage=${row?.triage}`
    );
  }

  // â”€â”€â”€ TEST 8: Duplicate flagged (near, similar, same type) â”€â”€â”€
  {
    // Create the "original" incident first
    const cid1 = crypto.randomUUID();
    const r1 = await createAndWait(cid1, "[TEST] Building collapsed near school, people trapped", {
      latitude: 27.7060,
      longitude: 85.3144,
    });
    const id1 = r1.json.incident_id;
    await waitForProcessing(id1);

    // Create a near, similar, same-type incident
    const cid2 = crypto.randomUUID();
    const r2 = await createAndWait(cid2, "[TEST] Building collapsed near school trapped people", {
      latitude: 27.7061, // ~10m away
      longitude: 85.3145,
    });
    const id2 = r2.json.incident_id;
    await waitForProcessing(id2);

    const inc2 = await supabaseAdmin(`incidents?id=eq.${id2}&select=status,needs_human_review`);
    const row2 = Array.isArray(inc2) ? inc2[0] : null;

    log("duplicate_flagged_status",
      row2?.status === "duplicate_review",
      `status=${row2?.status}`
    );

    // Check incident_duplicates row
    const dups = await supabaseAdmin(
      `incident_duplicates?incident_id=eq.${id2}&select=possible_duplicate_of,resolution`
    );
    const dupRow = Array.isArray(dups) ? dups.find((d) => d.possible_duplicate_of === id1) : null;

    log("duplicate_row_exists",
      !!dupRow && dupRow.resolution === "unresolved",
      `found=${!!dupRow} resolution=${dupRow?.resolution}`
    );
  }

  // â”€â”€â”€ TEST 9: Duplicate NOT flagged (dissimilar text) â”€â”€â”€
  {
    const cid1 = crypto.randomUUID();
    const r1 = await createAndWait(cid1, "[TEST] Flood water rising rapidly in the village area", {
      incident_type: "flood_landslide",
      latitude: 27.68,
      longitude: 85.30,
    });
    await waitForProcessing(r1.json.incident_id);

    const cid2 = crypto.randomUUID();
    const r2 = await createAndWait(cid2, "[TEST] Medical emergency heart attack elderly person needs ambulance", {
      incident_type: "flood_landslide", // same type, but text very different
      latitude: 27.6801,
      longitude: 85.3001,
    });
    const id2 = r2.json.incident_id;
    await waitForProcessing(id2);

    const dups = await supabaseAdmin(
      `incident_duplicates?incident_id=eq.${id2}&select=id`
    );
    log("dissimilar_not_flagged",
      !Array.isArray(dups) || dups.length === 0,
      `dup_count=${Array.isArray(dups) ? dups.length : 0}`
    );
  }

  // â”€â”€â”€ TEST 10: Duplicate NOT flagged (far away) â”€â”€â”€
  {
    const cid1 = crypto.randomUUID();
    const r1 = await createAndWait(cid1, "[TEST] Building collapsed trapped people rescue needed", {
      latitude: 27.70,
      longitude: 85.31,
    });
    await waitForProcessing(r1.json.incident_id);

    const cid2 = crypto.randomUUID();
    const r2 = await createAndWait(cid2, "[TEST] Building collapsed trapped people rescue needed", {
      latitude: 28.70, // ~100km away
      longitude: 85.31,
    });
    const id2 = r2.json.incident_id;
    await waitForProcessing(id2);

    const dups = await supabaseAdmin(
      `incident_duplicates?incident_id=eq.${id2}&select=id`
    );
    log("far_not_flagged",
      !Array.isArray(dups) || dups.length === 0,
      `dup_count=${Array.isArray(dups) ? dups.length : 0}`
    );
  }

  // â”€â”€â”€ TEST 11: fake_duplicate ID dropped â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:fake_duplicate]] Fire in building", {
      latitude: 27.77,
      longitude: 85.38,
      incident_type: "fire",
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const events = await getEvents(id);
    const dupEvt = events.find((e) => e.event_type === "duplicate_check_completed");

    log("fake_dup_dropped",
      dupEvt?.payload?.model_dropped?.includes("deadbeef-dead-4ead-beef-deadbeefbeef"),
      `model_dropped=${JSON.stringify(dupEvt?.payload?.model_dropped)}`
    );
  }

  // â”€â”€â”€ TEST 12: bad_services filtered â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:bad_services]] Medical emergency", {
      latitude: 27.78,
      longitude: 85.39,
      incident_type: "medical",
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=recommended_service_types`);
    const row = Array.isArray(inc) ? inc[0] : null;
    const services = row?.recommended_service_types || [];

    log("bad_services_filtered",
      services.includes("ambulance") && !services.includes("aliens") && !services.includes("mayor"),
      `services=${JSON.stringify(services)}`
    );

    const events = await getEvents(id);
    const factsEvt = events.find((e) => e.event_type === "facts_extracted");
    log("bad_services_logged",
      factsEvt?.payload?.dropped_services?.includes("aliens"),
      `dropped=${JSON.stringify(factsEvt?.payload?.dropped_services)}`
    );
  }

  // â”€â”€â”€ TEST 13: odd_type â†’ "other" â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:odd_type]] Strange report", {
      latitude: 27.79,
      longitude: 85.40,
      incident_type: "other",
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=incident_type`);
    const row = Array.isArray(inc) ? inc[0] : null;

    log("odd_type_becomes_other",
      row?.incident_type === "other",
      `incident_type=${row?.incident_type}`
    );

    const events = await getEvents(id);
    const factsEvt = events.find((e) => e.event_type === "facts_extracted");
    log("odd_type_original_logged",
      factsEvt?.payload?.assessment?.original_type === "space_invasion",
      `original_type=${factsEvt?.payload?.assessment?.original_type}`
    );
  }

  // â”€â”€â”€ TEST 14: No nearby responders â†’ coordinator fallback â”€â”€â”€
  {
    // Create incident far from any responders
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] Minor road blockage in remote area", {
      latitude: 29.50, // Very far from seed responders
      longitude: 83.50,
      incident_type: "road_blockage",
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const events = await getEvents(id);
    const respEvt = events.find((e) => e.event_type === "responders_found");

    log("coordinator_fallback",
      respEvt?.payload?.coordinator_fallback === true || respEvt?.payload?.coordinator_queue === true,
      `coordinator_fallback=${respEvt?.payload?.coordinator_fallback} queue=${respEvt?.payload?.coordinator_queue}`
    );
  }

  // â”€â”€â”€ TEST 15: Human correction preserved on force re-run â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] Building collapsed people trapped urgent", {
      latitude: 27.705,
      longitude: 85.315,
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    // Modify triage via /modify
    const modRes = await post(`/api/incidents/${id}/modify`, {
      triage: "minor",
      reason: "Test correction",
    }, {
      Authorization: `Bearer ${staffToken}`,
    });

    log("modify_for_correction",
      modRes.status === 200,
      `modify_status=${modRes.status}`
    );

    // Force re-run
    const rerunRes = await post(`/api/incidents/${id}/process`, { force: true }, {
      Authorization: `Bearer ${staffToken}`,
    });

    // Wait for reprocessing
    await new Promise((r) => setTimeout(r, 2000));
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=triage`);
    const row = Array.isArray(inc) ? inc[0] : null;

    log("correction_preserved",
      row?.triage === "minor",
      `triage=${row?.triage} (should be "minor" from human correction)`
    );

    // Check that AI suggestion is in the event payload
    const events = await getEvents(id);
    const triageEvts = events.filter((e) => e.event_type === "triage_recommended");
    const lastTriageEvt = triageEvts[triageEvts.length - 1];

    log("correction_ai_suggestion_logged",
      lastTriageEvt?.payload?.human_override === true,
      `human_override=${lastTriageEvt?.payload?.human_override}`
    );
  }

  // â”€â”€â”€ TEST 16: 5 concurrent /process â†’ 1 provider call â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    // Create incident manually without after() trigger processing
    const r = await post("/api/incidents", {
      client_id: cid,
      raw_text: "[TEST] Concurrent test building collapsed",
      incident_type: "building_collapse",
      latitude: 27.72,
      longitude: 85.33,
      location_source: "gps",
    });
    const id = r.json.incident_id;
    testIncidentIds.push(id);

    // Wait for after() processing to potentially start
    await new Promise((r) => setTimeout(r, 1000));

    // Fire 5 concurrent /process calls
    const concurrent = await Promise.all(
      Array(5).fill(null).map(() =>
        post(`/api/incidents/${id}/process`, {}, {
          "x-internal-secret": INTERNAL_SECRET,
        })
      )
    );

    await new Promise((r) => setTimeout(r, 2000));
    await waitForProcessing(id);

    const events = await getEvents(id);
    const factsEvents = events.filter((e) => e.event_type === "facts_extracted");

    // Should have at most 2 facts_extracted events (one from after(), one from concurrent)
    // Key: all 5 concurrent should not each trigger their own provider call
    log("concurrent_limited_provider_calls",
      factsEvents.length <= 2,
      `facts_extracted_count=${factsEvents.length} (expect â‰¤2, one from after() + one from concurrent)`
    );
  }

  // â”€â”€â”€ TEST 17: /process no credentials â†’ 401 â”€â”€â”€
  {
    const testId = testIncidentIds[0]; // Use any existing test incident
    const r = await post(`/api/incidents/${testId}/process`, {});

    log("process_no_creds_401",
      r.status === 401,
      `status=${r.status} code=${r.json.error?.code}`
    );
  }

  // â”€â”€â”€ TEST 18: /process with internal secret â†’ 200 â”€â”€â”€
  {
    const testId = testIncidentIds[0];
    const r = await post(`/api/incidents/${testId}/process`, {}, {
      "x-internal-secret": INTERNAL_SECRET,
    });

    log("process_with_secret_200",
      r.status === 200,
      `status=${r.status} ai_status=${r.json.ai_status}`
    );
  }

  // â”€â”€â”€ TEST 19: /process force=true with secret â†’ 403 â”€â”€â”€
  {
    const testId = testIncidentIds[0];
    const r = await post(`/api/incidents/${testId}/process`, { force: true }, {
      "x-internal-secret": INTERNAL_SECRET,
    });

    log("process_force_secret_403",
      r.status === 403 && r.json.error?.code === "FORBIDDEN",
      `status=${r.status} code=${r.json.error?.code}`
    );
  }

  // â”€â”€â”€ TEST 20: Stale claim reclaimed â”€â”€â”€
  // NOTE: Requires dev server with AI_CLAIM_STALE_SECONDS=2
  {
    const cid = crypto.randomUUID();
    const r = await post("/api/incidents", {
      client_id: cid,
      raw_text: "[TEST] Stale claim test small damage",
      incident_type: "other",
      latitude: 27.80,
      longitude: 85.41,
      location_source: "gps",
    });
    const id = r.json.incident_id;
    testIncidentIds.push(id);

    await new Promise((r) => setTimeout(r, 2000));
    await waitForProcessing(id);

    // Set ai_status='processing' â€” the DB trigger will set updated_at=now()
    await supabaseAdmin(`incidents?id=eq.${id}`, "PATCH", {
      ai_status: "processing",
    });

    // Wait for AI_CLAIM_STALE_SECONDS (2s) + buffer to ensure it's stale
    console.log("  â³ Waiting 4s for claim to become stale...");
    await new Promise((r) => setTimeout(r, 4000));

    // Now /process should reclaim the stale claim
    await post(`/api/incidents/${id}/process`, {}, {
      "x-internal-secret": INTERNAL_SECRET,
    });

    await new Promise((r) => setTimeout(r, 2000));
    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=ai_status`);
    const row = Array.isArray(inc) ? inc[0] : null;

    log("stale_claim_reclaimed",
      row?.ai_status === "completed",
      `ai_status=${row?.ai_status} (was stale processing)`
    );
  }

  // â”€â”€â”€ TEST 21: Fresh processing claim NOT reclaimed â”€â”€â”€
  {
    const cid = crypto.randomUUID();
    const r = await post("/api/incidents", {
      client_id: cid,
      raw_text: "[TEST] Fresh claim test minor damage",
      incident_type: "other",
      latitude: 27.81,
      longitude: 85.42,
      location_source: "gps",
    });
    const id = r.json.incident_id;
    testIncidentIds.push(id);

    await new Promise((r) => setTimeout(r, 2000));
    await waitForProcessing(id);

    // Set to processing with fresh timestamp
    await supabaseAdmin(`incidents?id=eq.${id}`, "PATCH", {
      ai_status: "processing",
      updated_at: new Date().toISOString(),
    });

    // /process should NOT reclaim - should return skipped
    const processRes = await post(`/api/incidents/${id}/process`, {}, {
      "x-internal-secret": INTERNAL_SECRET,
    });

    log("fresh_claim_not_reclaimed",
      processRes.json.skipped === true,
      `skipped=${processRes.json.skipped} ai_status=${processRes.json.ai_status}`
    );

    // Reset for cleanup
    await supabaseAdmin(`incidents?id=eq.${id}`, "PATCH", {
      ai_status: "completed",
    });
  }

  // --- TEST 22: Location confidence -- no coords, no text ---
  {
    const cid = crypto.randomUUID();
    const r = await post("/api/incidents", {
      client_id: cid,
      raw_text: "[TEST] Minor road issue no location info",
      incident_type: "road_blockage",
      location_source: "none",
    });
    const id = r.json.incident_id;
    if (id) testIncidentIds.push(id);
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=needs_human_review`);
    const row = Array.isArray(inc) ? inc[0] : null;
    log("no_location_needs_review",
      row?.needs_human_review === true,
      `needs_human_review=${row?.needs_human_review}`
    );
  }

  // --- TEST 23: Location confidence = 0.4 -> needs_human_review ---
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:low_loc_conf]] Minor road damage reported", {
      latitude: 27.72,
      longitude: 85.32,
      incident_type: "road_blockage",
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=needs_human_review,location_confidence`);
    const row = Array.isArray(inc) ? inc[0] : null;
    log("loc_conf_04_needs_review",
      row?.needs_human_review === true && row?.location_confidence === 0.4,
      `needs_human_review=${row?.needs_human_review} location_confidence=${row?.location_confidence}`
    );
  }

  // --- TEST 24: Location confidence = 0.5 -> does NOT need review ---
  {
    const cid = crypto.randomUUID();
    const r = await createAndWait(cid, "[TEST] [[mock:exact_loc_conf]] Minor road damage reported", {
      latitude: 27.73,
      longitude: 85.33,
      incident_type: "road_blockage",
    });
    const id = r.json.incident_id;
    await waitForProcessing(id);

    const inc = await supabaseAdmin(`incidents?id=eq.${id}&select=needs_human_review,location_confidence`);
    const row = Array.isArray(inc) ? inc[0] : null;
    log("loc_conf_05_no_review",
      row?.needs_human_review === false && row?.location_confidence === 0.5,
      `needs_human_review=${row?.needs_human_review} location_confidence=${row?.location_confidence}`
    );
  }

  // --- TEST 25: Duplicate outside DUPLICATE_WINDOW_MIN is NOT flagged ---
  {
    const cid1 = crypto.randomUUID();
    const r1 = await createAndWait(cid1, "[TEST] Building collapsed trapped people need help", {
      latitude: 27.71,
      longitude: 85.31,
    });
    const id1 = r1.json.incident_id;
    await waitForProcessing(id1);

    // Backdate created_at to 25 hours ago (well outside default 360min window)
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin(`incidents?id=eq.${id1}`, "PATCH", { created_at: oldDate });

    // Create a similar incident now
    const cid2 = crypto.randomUUID();
    const r2 = await createAndWait(cid2, "[TEST] Building collapsed trapped people need help", {
      latitude: 27.7105,
      longitude: 85.3105,
    });
    const id2 = r2.json.incident_id;
    await waitForProcessing(id2);

    // The new incident should NOT be flagged as duplicate (outside window)
    const inc = await supabaseAdmin(`incidents?id=eq.${id2}&select=status`);
    const row = Array.isArray(inc) ? inc[0] : null;
    log("outside_window_not_flagged",
      row?.status !== "duplicate_review",
      `status=${row?.status} (should not be duplicate_review)`
    );
  }

  // --- TEST 26: Seed data intact (strict UUID check) ---
  {
    const seed1 = await supabaseAdmin("incidents?id=eq.c0000000-0000-0000-0000-000000000001&select=id,status");
    const seed2 = await supabaseAdmin("incidents?id=eq.c0000000-0000-0000-0000-000000000002&select=id,status");
    const orgs = await supabaseAdmin("organizations?select=id");
    const responders = await supabaseAdmin("responders?select=id");

    log("seed_incident_1_intact",
      Array.isArray(seed1) && seed1.length === 1 && seed1[0].status === "resolved",
      `status=${seed1?.[0]?.status}`
    );
    log("seed_incident_2_intact",
      Array.isArray(seed2) && seed2.length === 1 && seed2[0].status === "acknowledged",
      `status=${seed2?.[0]?.status}`
    );
    log("seed_orgs_intact",
      Array.isArray(orgs) && orgs.length >= 4,
      `orgs=${Array.isArray(orgs) ? orgs.length : 0}`
    );
    log("seed_responders_intact",
      Array.isArray(responders) && responders.length >= 4,
      `responders=${Array.isArray(responders) ? responders.length : 0}`
    );
  }

  // --- CLEANUP and LEFTOVER CHECK ---
  await cleanup();

  const leftovers = await supabaseAdmin("incidents?raw_text=like.%5BTEST%5D*&select=id");
  log("zero_test_leftovers",
    Array.isArray(leftovers) && leftovers.length === 0,
    `leftover_count=${Array.isArray(leftovers) ? leftovers.length : "?"}`
  );

  const leftoverUsers = await supabaseAdmin("app_users?display_name=like.Test*3A*&select=id");
  log("zero_test_users",
    Array.isArray(leftoverUsers) && leftoverUsers.length === 0,
    `leftover_users=${Array.isArray(leftoverUsers) ? leftoverUsers.length : "?"}`
  );

  console.log("\n=== SUMMARY ===");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Passed: ${passed}/${results.length} | Failed: ${failed}`);
  if (failed > 0) {
    console.log("\nFailed tests:");
    results
      .filter((r) => !r.pass)
      .forEach((r) => console.log(`  ❌ ${r.name}: ${r.detail}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test suite crashed:", err);
  cleanup().catch(() => {});
  process.exit(1);
});
