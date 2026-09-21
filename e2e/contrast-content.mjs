import { chromium } from 'playwright';
import PNG from 'pngjs';

function getLuminance(r, g, b) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const routes = ['/about', '/privacy', '/safety'];
const viewports = [{ width: 1440, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }];

async function run() {
  const browser = await chromium.launch();
  
  console.log("--- CONTRAST RATIO ANALYSIS (Content Pages) ---");
  
  for (const route of routes) {
    console.log(`\nRoute: ${route}`);
    for (const vp of viewports) {
      console.log(`Viewport: ${vp.name}`);
      
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const p = await ctx.newPage();
      
      await p.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
      
      // Wait for any entry animations
      await p.waitForTimeout(1000);
      
      // Let's test h1 and the first p
      const elements = [
        { name: 'h1', selector: 'h1' },
        { name: 'p', selector: 'p' }
      ];
      
      const buf = await p.screenshot();
      const png = PNG.PNG.sync.read(buf);
      
      for (const el of elements) {
        const box = await p.evaluate((sel) => {
          const e = document.querySelector(sel);
          if (!e) return null;
          const r = e.getBoundingClientRect();
          const style = window.getComputedStyle(e);
          return {
            x: r.x, y: r.y, w: r.width, h: r.height,
            color: style.color
          };
        }, el.selector);
        
        if (!box || box.w === 0 || box.h === 0) continue;
        
        // Sample background near top-left of element (outside text)
        let sx = Math.max(0, Math.floor(box.x) + 2);
        let sy = Math.max(0, Math.floor(box.y) + 2);
        let idx = (box.w * sy + sx) * 4; // This is wrong, it's global image coords
        idx = (png.width * sy + sx) * 4;
        
        let bg = { r: png.data[idx], g: png.data[idx+1], b: png.data[idx+2] };
        
        const m = box.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        let fg = { r: 255, g: 255, b: 255 };
        if (m) { fg = { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) }; }
        
        const l1 = getLuminance(bg.r, bg.g, bg.b);
        const l2 = getLuminance(fg.r, fg.g, fg.b);
        const ratio = getContrast(l1, l2);
        
        console.log(`  ${el.name}: ${ratio.toFixed(1)}:1 (${ratio >= 4.5 ? 'PASS' : 'FAIL'})`);
      }
      
      await ctx.close();
    }
  }
  await browser.close();
}

run();
