import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  console.log("Navigating to dashboard...");
  await page.goto('http://localhost:3002/dashboard');
  
  // Wait for map to load
  await page.waitForTimeout(5000);
  
  console.log("Taking Google Map screenshot...");
  await page.screenshot({ path: 'google_map.png' });
  
  console.log("Simulating fallback...");
  // Simulate google map failure by triggering gm_authFailure
  await page.evaluate(() => {
    if (window.gm_authFailure) window.gm_authFailure();
  });
  
  await page.waitForTimeout(2000);
  
  console.log("Taking Leaflet Map screenshot...");
  await page.screenshot({ path: 'leaflet_map.png' });
  
  await browser.close();
  console.log("Done.");
})();
