import { webkit, chromium } from 'playwright';

async function search() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://google.com/search?q="This+database+cannot+exceed+free+quota+limits"');
  // Wait to load
  await page.waitForTimeout(2000);
  
  const texts = await page.$$eval('.VwiC3b', elements => elements.map(e => e.textContent));
  console.log(texts);
  await browser.close();
}

search();
