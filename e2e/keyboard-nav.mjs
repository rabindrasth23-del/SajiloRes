import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/');
  
  console.log('1. Verifying Tab does not enter closed nav panel...');
  await page.focus('#burger-btn');
  await page.keyboard.press('Tab');
  let focusedId = await page.evaluate(() => document.activeElement.id);
  console.log('Focused element after burger (should not be inside nav): ' + focusedId);
  
  console.log('2. Verifying Escape closes the panel...');
  await page.click('#burger-btn'); // Open panel
  let navClass = await page.evaluate(() => document.getElementById('nav').className);
  console.log('Nav class after click: ' + navClass);
  
  await page.keyboard.press('Escape'); // Close panel
  navClass = await page.evaluate(() => document.getElementById('nav').className);
  console.log('Nav class after Escape: ' + navClass);
  
  // Verify focus returns to burger
  focusedId = await page.evaluate(() => document.activeElement.id);
  console.log('Focused element after Escape (should be burger): ' + focusedId);
  
  await browser.close();
}
main();
