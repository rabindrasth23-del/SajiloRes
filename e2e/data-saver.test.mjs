import { chromium, devices } from 'playwright';

async function runTest() {
  const browser = await chromium.launch();
  
  console.log("--- DATA SAVER & VIDEO AUTOPLAY PROOF ---");

  // Test (d): Initial HTML response contains no video URL
  let context = await browser.newContext();
  let page = await context.newPage();
  let response = await page.goto('http://localhost:3000/');
  let html = await response.text();
  const hasMp4 = html.includes('.mp4');
  const hasSource = html.includes('<source');
  const hasPreloadNone = html.includes('preload="none"');
  console.log(`(d) Initial HTML contains NO video URL: ${!hasMp4 && !hasSource}`);
  console.log(`(d) Initial HTML contains preload="none": ${hasPreloadNone}`);
  await context.close();

  // Helper for network interception
  async function checkVideoRequest(contextOptions, label) {
    const ctx = await browser.newContext(contextOptions);
    const p = await ctx.newPage();
    let mp4Requested = false;
    p.on('request', req => {
      if (req.url().endsWith('.mp4')) mp4Requested = true;
    });
    await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    // Wait a bit to ensure useEffect runs and network triggers
    await p.waitForTimeout(2000);
    console.log(`${label} -> .mp4 requested: ${mp4Requested}`);
    await ctx.close();
  }

  // Test (a): phone viewport -> no .mp4
  await checkVideoRequest({ viewport: { width: 390, height: 844 } }, "(a) Phone viewport");

  // Test (b): desktop + saveData emulation -> no .mp4
  // Playwright doesn't have a direct saveData API flag, but we can set it via CDP or just emulate offline/slow network if needed.
  // We can inject `navigator.connection.saveData = true` via init script to mock it perfectly for our JS logic.
  const bCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bCtx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: true, effectiveType: '4g' })
    });
  });
  const bp = await bCtx.newPage();
  let bMp4Requested = false;
  bp.on('request', req => {
    if (req.url().endsWith('.mp4')) bMp4Requested = true;
  });
  await bp.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await bp.waitForTimeout(2000);
  console.log(`(b) Desktop + saveData emulation -> .mp4 requested: ${bMp4Requested}`);
  await bCtx.close();

  // Test (c): desktop normal -> .mp4 requested
  const cCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Ensure navigator.connection exists but saveData is false
  await cCtx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: false, effectiveType: '4g' })
    });
  });
  const cp = await cCtx.newPage();
  let cMp4Requested = false;
  cp.on('request', req => {
    if (req.url().endsWith('.mp4')) cMp4Requested = true;
  });
  await cp.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await cp.waitForTimeout(2000);
  console.log(`(c) Desktop normal -> .mp4 requested: ${cMp4Requested}`);
  await cCtx.close();

  await browser.close();
}

runTest().catch(console.error);
