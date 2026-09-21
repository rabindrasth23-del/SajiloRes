import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  
  const scenarios = [
    { name: 'Mobile Viewport (<600px)', width: 390, emulateDataSaver: false },
    { name: 'Desktop + Data Saver Emulated', width: 1440, emulateDataSaver: true },
    { name: 'Desktop Normal (Should Load Video)', width: 1440, emulateDataSaver: false },
  ];
  
  for (const s of scenarios) {
    console.log(`\n--- SCENARIO: ${s.name} ---`);
    const ctx = await browser.newContext({ viewport: { width: s.width, height: 900 } });
    
    if (s.emulateDataSaver) {
      await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({ saveData: true, effectiveType: '4g' })
        });
      });
    } else {
      await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({ saveData: false, effectiveType: '4g' })
        });
      });
    }

    const p = await ctx.newPage();
    let videoRequests = [];
    let totalBytes = 0;
    
    p.on('response', async (res) => {
      const url = res.url();
      if (url.includes('localhost')) {
        try {
          const buffer = await res.body();
          totalBytes += buffer.length;
        } catch (e) {
          // ignore aborted
        }
      }
      if (url.endsWith('.mp4')) {
        try {
          const headers = res.headers();
          const size = headers['content-length'] || (await res.body()).length;
          videoRequests.push({ url, status: res.status(), size });
        } catch (e) {}
      }
    });

    await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    
    // wait a bit in case video buffers
    await p.waitForTimeout(3000);
    
    console.log(`Total JS/CSS/HTML transferred: ${(totalBytes/1024).toFixed(2)} kB`);
    if (videoRequests.length > 0) {
      console.log(`Video loaded!`);
      videoRequests.forEach(req => {
        console.log(`  URL: ${req.url.split('/').pop()} | Status: ${req.status} | Size: ${(req.size/1024/1024).toFixed(2)} MB`);
      });
    } else {
      console.log(`No video loaded (Data Saver working correctly).`);
    }
    
    await ctx.close();
  }
  
  await browser.close();
}

run();
