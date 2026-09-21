// Focused re-test: attachment flow + bad path + validation with proper UUID v4s
// Run: node scripts/test-attachment.mjs

const BASE = "http://localhost:3000";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  console.log("\n=== Attachment & Validation Re-Tests ===\n");

  // UUID v4 compliant test IDs (group 3 starts with 4, group 4 starts with 8-b)
  const clientAtt = "11111111-1111-4111-a111-111111111111";
  const clientBadPath = "22222222-2222-4222-a222-222222222222";
  const clientValTest = "33333333-3333-4333-a333-333333333333";

  // ── Test: empty text ──
  const v1 = await post("/api/incidents", {
    client_id: clientValTest,
    raw_text: "",
  });
  console.log(
    `${v1.status === 400 ? "✅" : "❌"} empty_text: status=${v1.status} msg=${v1.json.error?.message}`
  );

  // ── Test: text over 2000 chars ──
  const v2 = await post("/api/incidents", {
    client_id: clientValTest,
    raw_text: "x".repeat(2001),
  });
  console.log(
    `${v2.status === 400 ? "✅" : "❌"} text_too_long: status=${v2.status} msg=${v2.json.error?.message}`
  );

  // ── Test: invalid incident_type ──
  const v3 = await post("/api/incidents", {
    client_id: clientValTest,
    raw_text: "valid text here",
    incident_type: "earthquake",
  });
  console.log(
    `${v3.status === 400 ? "✅" : "❌"} bad_incident_type: status=${v3.status} msg=${v3.json.error?.message}`
  );

  // ── Test: latitude without longitude ──
  const v4 = await post("/api/incidents", {
    client_id: clientValTest,
    raw_text: "valid text here",
    latitude: 27.7,
  });
  console.log(
    `${v4.status === 400 ? "✅" : "❌"} lat_without_lng: status=${v4.status} msg=${v4.json.error?.message}`
  );

  // ── Test: bad attachment path ──
  const r1 = await post("/api/incidents", {
    client_id: clientBadPath,
    raw_text: "[TEST] Bad attachment path test",
    incident_type: "other",
    location_source: "none",
    attachment_paths: [
      {
        storage_path: "hacked/some/other/path.png",
        mime_type: "image/png",
        size_bytes: 1024,
      },
    ],
  });
  console.log(
    `${r1.status === 400 ? "✅" : "❌"} bad_attachment_path: status=${r1.status} msg=${r1.json.error?.message}`
  );

  // ── Test: create with valid attachment ──
  // 1. Sign upload URL
  const sign = await post("/api/uploads/sign", {
    client_id: clientAtt,
    mime_type: "image/png",
    size_bytes: 68,
  });
  console.log(
    `${sign.status === 200 ? "✅" : "❌"} sign_upload: status=${sign.status} path=${sign.json.storage_path}`
  );

  if (sign.status === 200) {
    // 2. Upload 1x1 PNG
    const pngBytes = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
      1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
      65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51,
      0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ]);
    const uploadRes = await fetch(sign.json.signed_url, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: pngBytes,
    });
    console.log(`${uploadRes.ok ? "✅" : "❌"} put_file: status=${uploadRes.status}`);

    // 3. Create incident with attachment
    const r2 = await post("/api/incidents", {
      client_id: clientAtt,
      raw_text: "[TEST] Incident with PNG attachment",
      incident_type: "fire",
      location_source: "none",
      attachment_paths: [
        {
          storage_path: sign.json.storage_path,
          mime_type: "image/png",
          size_bytes: pngBytes.length,
        },
      ],
    });
    console.log(
      `${r2.status === 200 && !r2.json.duplicate ? "✅" : "❌"} create_with_attachment: status=${r2.status} id=${r2.json.incident_id} dup=${r2.json.duplicate}`
    );
  }

  console.log("\nDone. Clean up test rows via MCP.");
}

main().catch(console.error);
