import { chromium } from 'playwright';
import fs from 'fs';
import PNG from 'pngjs';
import pixelmatch from 'pixelmatch';
import { execSync, spawn } from 'child_process';

const routes = ['/report', '/login', '/status/123']; // skipping /status/test since it might not exist yet
const viewports = [{ width: 1440, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }];

async function takeScreenshots(port, prefix) {
  const browser = await chromium.launch();
  for (const route of routes) {
    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const p = await ctx.newPage();
      try {
        await p.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle' });
        await p.waitForTimeout(1000); // let UI settle
        const safeRoute = route.replace(/\//g, '_');
        await p.screenshot({ path: `docs/screenshots/${prefix}${safeRoute}_${vp.name}.png`, fullPage: true });
      } catch (e) {
        console.error(`Failed on ${route} port ${port}:`, e.message);
      }
      await ctx.close();
    }
  }
  await browser.close();
}

async function run() {
  console.log("Taking CURRENT screenshots...");
  // Assuming current server is on 3000
  await takeScreenshots(3000, 'current');

  console.log("Installing BASELINE deps...");
  execSync('npm install --legacy-peer-deps', { cwd: '../SajiloRes-baseline', stdio: 'inherit' });
  
  console.log("Starting BASELINE server...");
  const serverProc = spawn('npm.cmd', ['run', 'dev', '--', '-p', '3001'], { cwd: '../SajiloRes-baseline', shell: true });
  
  // wait for it to start
  await new Promise(r => setTimeout(r, 15000));

  console.log("Taking BASELINE screenshots...");
  await takeScreenshots(3001, 'baseline');
  
  serverProc.kill();

  console.log("Comparing pixels...");
  if (!fs.existsSync('docs/screenshots/diffs')) {
    fs.mkdirSync('docs/screenshots/diffs', { recursive: true });
  }

  for (const route of routes) {
    for (const vp of viewports) {
      const safeRoute = route.replace(/\//g, '_');
      const basePath = `docs/screenshots/baseline${safeRoute}_${vp.name}.png`;
      const currPath = `docs/screenshots/current${safeRoute}_${vp.name}.png`;
      
      if (!fs.existsSync(basePath) || !fs.existsSync(currPath)) {
        console.log(`[DIFF] ${route} ${vp.name}: Missing screenshot files`);
        continue;
      }
      
      const img1 = PNG.PNG.sync.read(fs.readFileSync(basePath));
      const img2 = PNG.PNG.sync.read(fs.readFileSync(currPath));
      
      // Ensure dimensions match
      if (img1.width !== img2.width || img1.height !== img2.height) {
        console.log(`[DIFF] ${route} ${vp.name}: Dimensions differ (${img1.width}x${img1.height} vs ${img2.width}x${img2.height})`);
        continue;
      }
      
      const { width, height } = img1;
      const diff = new PNG.PNG({ width, height });

      const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
      const pct = (numDiffPixels / (width * height) * 100).toFixed(4);
      
      fs.writeFileSync(`docs/screenshots/diffs/diff${safeRoute}_${vp.name}.png`, PNG.PNG.sync.write(diff));
      
      console.log(`[DIFF] ${route} ${vp.name}: ${pct}% changed`);
    }
  }
}

run().catch(console.error);
