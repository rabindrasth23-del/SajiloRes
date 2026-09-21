import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  
  async function measureRoute(saveData, label) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((sd) => {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({ saveData: sd, effectiveType: '4g' })
      });
    }, saveData);

    let totalBytes = 0; let jsBytes = 0;
    const p = await ctx.newPage();
    p.on('response', async res => {
      try {
        const buffer = await res.body();
        totalBytes += buffer.length; if (res.request().resourceType() === 'script' || res.url().endsWith('.js')) { jsBytes += buffer.length; console.log(res.url()); }
      } catch (e) {
        // body not available or request failed
      }
    });

    await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2000);
    console.log(`${label}: JS: ${(jsBytes / 1024).toFixed(2)} kB | Total: ${(totalBytes / 1024).toFixed(2)} kB`);
    await ctx.close();
  }

  console.log("--- TRANSFERRED BYTES ---");
  await measureRoute(false, "Normal Load (with video)");
  await measureRoute(true, "Data Saver Load (poster only)");

  await browser.close();
}
run().catch(console.error);
