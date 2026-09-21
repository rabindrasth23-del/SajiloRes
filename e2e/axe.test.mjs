import { chromium } from 'playwright';
import { injectAxe, getViolations } from 'axe-playwright';

const routes = ['/', '/how-it-works', '/about', '/privacy', '/safety'];

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  
  console.log("--- AXE-CORE RESULTS ---");
  
  for (const route of routes) {
    const page = await ctx.newPage();
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
    
    // Some routes have delayed animations
    await page.waitForTimeout(1000);
    
    await injectAxe(page);
    const violations = await getViolations(page, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    });
    
    console.log(`\nRoute: ${route}`);
    if (violations.length === 0) {
      console.log('No accessibility violations found! (PASS)');
    } else {
      console.log(`Found ${violations.length} violations:`);
      for (const v of violations) {
        console.log(`- ${v.id}: ${v.description} (${v.impact})`);
      }
    }
    
    await page.close();
  }
  
  await browser.close();
}

run().catch(console.error);
