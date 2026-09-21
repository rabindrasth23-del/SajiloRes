import { chromium } from 'playwright';
import fs from 'fs';
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

const elements = [
  { name: 'h1', selector: '#h1a' },
  { name: 'sub', selector: '#sub1' },
  { name: 'features', selector: '#f1' },
  { name: 'nav', selector: '#word' },
  { name: 'cta', selector: '#cta' },
  { name: 'footer', selector: '#foot1' }
];

const times = [0, 3, 6, 9.9];
const viewports = [{ width: 1440, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }];

async function run() {
  const browser = await chromium.launch();
  
  console.log("--- CONTRAST RATIO ANALYSIS ---");
  
  for (const vp of viewports) {
    console.log(`\nViewport: ${vp.name} (${vp.width}x${vp.height})`);
    
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const p = await ctx.newPage();
    
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({ saveData: false, effectiveType: '4g' })
      });
    });

    await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => document.documentElement.classList.add('is-entered'));
    await p.addStyleTag({ content: '*, ::before, ::after { animation-delay: -10s !important; transition-duration: 0ms !important; }' });

    for (const time of times) {
      console.log(`\nTime: ${time}s`);
      
      await p.evaluate((t) => {
        const v = document.querySelector('video');
        if (v) { v.pause(); v.currentTime = t; }
      }, time);
      await p.waitForTimeout(500);
      
      const fullScreenRaw = await p.screenshot();
      const img = PNG.PNG.sync.read(fullScreenRaw);
      
      for (const el of elements) {
        const info = await p.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el); const fontSize = style.fontSize;
          const colorMatch = style.color.match(/\d+/g);
          return {
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            color: colorMatch ? [parseInt(colorMatch[0]), parseInt(colorMatch[1]), parseInt(colorMatch[2])] : [0,0,0], fontSize: fontSize
          };
        }, el.selector);
        
        if (!info || info.box.width === 0) {
          console.log(`${el.name}: Not visible`);
          continue;
        }
        
        await p.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (el) el.style.opacity = '0';
        }, el.selector);
        
        const clipBox = { ...info.box, height: info.box.height === 0 ? parseFloat(info.fontSize) || 20 : info.box.height, y: info.box.height === 0 ? info.box.y - (parseFloat(info.fontSize) || 20)/2 : info.box.y }; const bgRaw = await p.screenshot({ clip: clipBox });
        const bgImg = PNG.PNG.sync.read(bgRaw);
        
        await p.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (el) el.style.opacity = '1';
        }, el.selector);
        
        const luminances = [];
        for (let y = 0; y < bgImg.height; y++) {
          for (let x = 0; x < bgImg.width; x++) {
            const idx = (bgImg.width * y + x) << 2;
            luminances.push(getLuminance(bgImg.data[idx], bgImg.data[idx+1], bgImg.data[idx+2]));
          }
        }
        
        luminances.sort((a, b) => a - b);
        
        const textLum = getLuminance(...info.color);
        const isLightText = textLum > 0.5;
        // For light text, worst case is brightest BG (95th). For dark text, worst case is darkest BG (5th).
        const worstCaseIdx = isLightText ? Math.floor(luminances.length * 0.95) : Math.floor(luminances.length * 0.05);
        const worstCaseBgLum = luminances[worstCaseIdx];
        
        const cr = getContrast(textLum, worstCaseBgLum);
        
        const pass = cr >= 4.5 ? 'PASS' : 'FAIL';
        console.log(`${el.name.padEnd(10)}: CR ${cr.toFixed(2)}:1 (${pass}) (Text Lum: ${textLum.toFixed(2)}, Bg Lum: ${worstCaseBgLum.toFixed(2)})`);
      }
    }
    await ctx.close();
  }
  await browser.close();
}

run().catch(console.error);
