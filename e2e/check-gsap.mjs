import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// First, get all chunks containing GSAP
const chunksDir = '.next/static/chunks';
const allChunks = fs.readdirSync(chunksDir);
const gsapChunks = allChunks.filter(f => fs.readFileSync(path.join(chunksDir, f), 'utf8').includes('gsap'));

console.log("All chunks containing 'gsap':");
console.log(gsapChunks.join(', '));
console.log("\n");

async function checkRoute(route) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  const requestedChunks = [];
  
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('_next/static/chunks')) {
      const filename = url.split('/').pop();
      requestedChunks.push(filename);
    }
  });
  
  await page.goto(`http://localhost:3000${route}`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(2000);
  
  const gsapRequested = requestedChunks.filter(c => gsapChunks.includes(c));
  console.log(`Route ${route}:`);
  console.log(`  GSAP chunks requested: ${gsapRequested.length > 0 ? gsapRequested.join(', ') : 'None'}`);
  
  await browser.close();
}

async function run() {
  await checkRoute('/');
  await checkRoute('/how-it-works');
}

run();
