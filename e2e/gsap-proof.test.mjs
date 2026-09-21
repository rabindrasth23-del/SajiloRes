import { chromium } from 'playwright';

async function runTest() {
  const browser = await chromium.launch();
  
  console.log("--- GSAP USAGE PROOF ---");

  // Helper to list chunks for a route
  async function listChunks(route) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const chunks = [];
    let hasGsap = false;
    
    p.on('request', req => {
      const url = req.url();
      if (url.endsWith('.js') && !url.includes('hot-update')) {
        const file = url.split('/').pop();
        chunks.push(file);
      }
    });

    p.on('response', async res => {
      const url = res.url();
      if (url.endsWith('.js') && !url.includes('hot-update')) {
        const body = await res.text();
        if (body.includes('gsap')) {
          hasGsap = true;
          console.log(`[!] GSAP found in chunk: ${url.split('/').pop()}`);
        }
      }
    });

    await p.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    
    console.log(`Route: ${route}`);
    console.log(`Chunks loaded: ${chunks.length}`);
    console.log(`Contains GSAP: ${hasGsap}`);
    console.log("------------------------");
    
    await ctx.close();
  }

  await listChunks('/');
  await listChunks('/how-it-works');

  await browser.close();
}

runTest().catch(console.error);
