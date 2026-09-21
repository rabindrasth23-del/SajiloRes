import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/about', '/how-it-works', '/privacy', '/safety'];

async function runAxe() {
  const browser = await chromium.launch();
  
  console.log("--- AXE VIOLATIONS ---");
  for (const route of routes) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForTimeout(1000);
      const results = await new AxeBuilder({ page }).analyze();
      console.log(`Route ${route}: ${results.violations.length} violations, ${results.incomplete.length} incomplete`);
    } catch (e) {
      console.log(`Route ${route}: Failed (${e.message})`);
    }
    await ctx.close();
  }
  await browser.close();
}

runAxe();
