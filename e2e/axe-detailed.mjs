import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/about', '/how-it-works', '/privacy', '/safety'];

async function runAxe() {
  const browser = await chromium.launch();
  
  for (const route of routes) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto('http://localhost:3000' + route);
      await page.waitForTimeout(1000);
      const results = await new AxeBuilder({ page }).analyze();
      
      console.log('\nRoute: ' + route);
      
      if (results.violations.length > 0) {
        console.log('  Violations:');
        results.violations.forEach(v => console.log('    - ' + v.id + ': ' + v.nodes.map(n => n.html).join(', ')));
      } else {
        console.log('  Violations: 0');
      }
      
      if (results.incomplete.length > 0) {
        console.log('  Incomplete:');
        results.incomplete.forEach(v => console.log('    - ' + v.id + ': ' + v.nodes.map(n => n.html).join(', ')));
      } else {
        console.log('  Incomplete: 0');
      }
    } catch (e) {
      console.log('Route ' + route + ': Failed (' + e.message + ')');
    }
    await ctx.close();
  }
  await browser.close();
}

runAxe();
