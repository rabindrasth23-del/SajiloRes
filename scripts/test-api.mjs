// Test script for SajiloResQ API — Checkpoint 2A verification
// Run: node --env-file=.env.local scripts/test-api.mjs
const { randomUUID } = require('crypto');

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars. Run with: node --env-file=.env.local scripts/test-api.mjs");
  process.exit(1);
}

const results = [];
const testIncidentIds = [];

function log(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}: ${detail}`);
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function supabaseAdmin(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "return=representation" : "return=minimal",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function main() {
  console.log("\n=== SajiloResQ API Tests — Checkpoint 2A ===\n");

  try {
    // ─── TEST 1: Create incident ───
    const clientId1 = randomUUID();
  const r1 = await post("/api/incidents", {
    client_id: clientId1,
    raw_text: "[TEST] Building collapsed near Ratnapark, 3 injured",
    incident_type: "building_collapse",
    latitude: 27.7059,
    longitude: 85.3143,
    location_source: "gps",
  });
  log(
    "create_incident",
    r1.status === 200 && r1.json.incident_id && r1.json.duplicate === false,
    `status=${r1.status} id=${r1.json.incident_id} dup=${r1.json.duplicate}`
  );
  const incidentId = r1.json.incident_id;
  if (incidentId) testIncidentIds.push(incidentId);

  // ─── TEST 2: Replay same client_id → duplicate ───
  const r2 = await post("/api/incidents", {
    client_id: clientId1,
    raw_text: "[TEST] Building collapsed near Ratnapark, 3 injured",
    incident_type: "building_collapse",
    latitude: 27.7059,
    longitude: 85.3143,
    location_source: "gps",
  });
  log(
    "replay_idempotent",
    r2.status === 200 &&
      r2.json.incident_id === incidentId &&
      r2.json.duplicate === true,
    `status=${r2.status} same_id=${r2.json.incident_id === incidentId} dup=${r2.json.duplicate}`
  );

  // ─── TEST 3: 5 concurrent POSTs ───
  const clientId3 = randomUUID();
  const concurrent = await Promise.all(
    Array(5)
      .fill(null)
      .map(() =>
        post("/api/incidents", {
          client_id: clientId3,
          raw_text: "[TEST] Concurrent test flood",
          incident_type: "flood_landslide",
          location_source: "none",
        })
      )
  );
  const uniqueIds = new Set(concurrent.map((r) => r.json.incident_id));
  const createdCount = concurrent.filter((r) => !r.json.duplicate).length;
  log(
    "concurrent_5_posts",
    uniqueIds.size === 1 && createdCount === 1,
    `unique_ids=${uniqueIds.size} created=${createdCount} duplicates=${concurrent.length - createdCount}`
  );
  for (const cid of uniqueIds) { if (cid) testIncidentIds.push(cid); }

  // ─── TEST 4: Validation errors ───
  const v1 = await post("/api/incidents", { client_id: "not-a-uuid", raw_text: "test" });
  log("validation_bad_uuid", v1.status === 400 && v1.json.error?.code === "VALIDATION_ERROR",
    `status=${v1.status} code=${v1.json.error?.code}`);

  const v2 = await post("/api/incidents", { client_id: "e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b", raw_text: "" });
  log("validation_empty_text", v2.status === 400 && v2.json.error?.code === "VALIDATION_ERROR",
    `status=${v2.status}`);

  const v3 = await post("/api/incidents", { client_id: "e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b", raw_text: "x".repeat(2001) });
  log("validation_text_too_long", v3.status === 400 && v3.json.error?.code === "VALIDATION_ERROR",
    `status=${v3.status}`);

  const v4 = await post("/api/incidents", { client_id: "e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b", raw_text: "test text", incident_type: "earthquake" });
  log("validation_bad_incident_type", v4.status === 400 && v4.json.error?.code === "VALIDATION_ERROR",
    `status=${v4.status}`);

  const v5 = await post("/api/incidents", { client_id: "e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b", raw_text: "test text", latitude: 27.7 });
  log("validation_lat_without_lng", v5.status === 400 && v5.json.error?.code === "VALIDATION_ERROR",
    `status=${v5.status}`);

  // ─── TEST 5: GET with correct client_id → limited fields ───
  const g1 = await get(`/api/incidents/${incidentId}?client_id=${clientId1}`);
  const hasLimitedFields = g1.json.id && g1.json.status && g1.json.created_at && !g1.json.raw_text;
  log("get_citizen_correct_client_id", g1.status === 200 && hasLimitedFields,
    `status=${g1.status} fields=${Object.keys(g1.json).join(",")}`);

  const g2 = await get(`/api/incidents/${incidentId}?client_id=ffffffff-ffff-4fff-afff-ffffffffffff`);
  log("get_citizen_wrong_client_id", g2.status === 404 && g2.json.error?.code === "NOT_FOUND",
    `status=${g2.status}`);

  const g3 = await get(`/api/incidents/${incidentId}`);
  log("get_no_credentials", g3.status === 401 && g3.json.error?.code === "UNAUTHORIZED",
    `status=${g3.status}`);

  // ─── TEST 6: Upload sign ───
  const u1 = await post("/api/uploads/sign", { client_id: clientId1, mime_type: "application/pdf", size_bytes: 1024 });
  log("upload_bad_mime", u1.status === 400 && u1.json.error?.code === "VALIDATION_ERROR",
    `status=${u1.status}`);

  const u2 = await post("/api/uploads/sign", { client_id: clientId1, mime_type: "image/png", size_bytes: 1024 });
  log("upload_valid_sign", u2.status === 200 && u2.json.storage_path && u2.json.signed_url,
    `status=${u2.status} path=${u2.json.storage_path}`);

  // ─── TEST 7: Create incident with attachment ───
  if (u2.status === 200) {
    const pngBytes = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
      1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
      65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51,
      0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ]);

    const uploadRes = await fetch(u2.json.signed_url, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: pngBytes,
    });
    log("upload_put_file", uploadRes.ok, `status=${uploadRes.status}`);

    const clientIdAtt = "f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c";
    const attSign = await post("/api/uploads/sign", {
      client_id: clientIdAtt,
      mime_type: "image/png",
      size_bytes: pngBytes.length,
    });

    if (attSign.status === 200) {
      await fetch(attSign.json.signed_url, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: pngBytes,
      });

      const r7 = await post("/api/incidents", {
        client_id: clientIdAtt,
        raw_text: "[TEST] Incident with attachment",
        incident_type: "fire",
        location_source: "none",
        attachment_paths: [{ storage_path: attSign.json.storage_path, mime_type: "image/png", size_bytes: pngBytes.length }],
      });
      log("create_with_attachment", r7.status === 200 && !r7.json.duplicate,
        `status=${r7.status} id=${r7.json.incident_id}`);
      if (r7.json.incident_id) testIncidentIds.push(r7.json.incident_id);
    }
  }

  // ─── TEST 8: Bad attachment path ───
  const r8 = await post("/api/incidents", {
    client_id: "a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d",
    raw_text: "[TEST] Bad attachment path",
    incident_type: "other",
    location_source: "none",
    attachment_paths: [{ storage_path: "hacked/some/other/path.png", mime_type: "image/png", size_bytes: 1024 }],
  });
  log("bad_attachment_path", r8.status === 400 && r8.json.error?.code === "VALIDATION_ERROR",
    `status=${r8.status}`);

  // ─── TEST 9: Anon key direct Supabase access is denied ───
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonSelect = await fetch(`${SUPABASE_URL}/rest/v1/incidents?select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  log("anon_rest_select_denied",
    anonSelect.status === 403 || anonSelect.status === 401 || (anonSelect.ok && (await anonSelect.clone().json()).length === 0),
    `status=${anonSelect.status}`);

  const anonInsert = await fetch(`${SUPABASE_URL}/rest/v1/incidents`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ client_id: "ffffffff-ffff-4fff-afff-ffffffffffff", raw_text: "hacker attempt" }),
  });
  log("anon_rest_insert_denied", !anonInsert.ok, `status=${anonInsert.status}`);

  const storageUpload = await fetch(`${SUPABASE_URL}/storage/v1/object/incident-attachments/test/hacker.png`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "image/png" },
    body: new Uint8Array([0]),
  });
  log("anon_storage_upload_denied", !storageUpload.ok, `status=${storageUpload.status}`);

  // ─── CLEANUP ───
  } finally {
    console.log("\n--- Cleanup ---");
    for (const iid of testIncidentIds) {
    await supabaseAdmin(`/rest/v1/incident_duplicates?incident_id=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/incident_duplicates?possible_duplicate_of=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/assignments?incident_id=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/attachments?incident_id=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/incident_events?incident_id=eq.${iid}`, "DELETE");
    await supabaseAdmin(`/rest/v1/incidents?id=eq.${iid}`, "DELETE");
  }

  // ─── STRICT SEED CHECK ───
  const seed1 = await supabaseAdmin("/rest/v1/incidents?id=eq.c0000000-0000-0000-0000-000000000001&select=id,status");
  const seed2 = await supabaseAdmin("/rest/v1/incidents?id=eq.c0000000-0000-0000-0000-000000000002&select=id,status");
  log("seed_incident_1_intact", seed1.json?.length === 1 && seed1.json[0].status === "resolved",
    `status=${seed1.json?.[0]?.status}`);
  log("seed_incident_2_intact", seed2.json?.length === 1 && seed2.json[0].status === "acknowledged",
    `status=${seed2.json?.[0]?.status}`);

  // Check zero [TEST] leftovers
  const leftovers = await supabaseAdmin("/rest/v1/incidents?raw_text=like.[TEST]*&select=id");
  log("zero_test_leftovers", leftovers.json?.length === 0,
    `leftover_count=${leftovers.json?.length}`);

  // ─── SUMMARY ───
  console.log("\n=== SUMMARY ===");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Passed: ${passed}/${results.length} | Failed: ${failed}`);
  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter((r) => !r.pass).forEach((r) => console.log(`  ❌ ${r.name}: ${r.detail}`));
    process.exit(1);
  }
  } // close finally
}

main().catch(err => { console.error(err); process.exit(1); });
