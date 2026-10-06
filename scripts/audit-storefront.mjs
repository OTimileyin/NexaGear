import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.env.DESIGN_BASE_URL ?? 'http://localhost:3000';
const folder = 'test-results/storefront-design';
await mkdir(folder, { recursive: true });
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch();
const records = [];
try {
  for (const [width, scheme, theme] of [[320,'light','datasheet'],[390,'dark','datasheet'],[768,'light','datasheet'],[1440,'light','datasheet'],[1440,'dark','apple']]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/', '/shop']) {
      await page.goto(`${base}${route}?scheme=${scheme}&theme=${theme}`, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(async () => {
        for (let y=0; y<document.body.scrollHeight; y+=800) { window.scrollTo(0,y); await new Promise(r=>setTimeout(r,100)); }
        window.scrollTo(0,0);
      });
      await page.waitForTimeout(1600);
      // Verify assets independently of lazy-image viewport scheduling, which varies with catalogue size.
      await page.evaluate(async () => { await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => undefined); })); });
      await page.addScriptTag({ content: axe });
      const report = await page.evaluate(async () => {
        const a = await window.axe.run(document, { runOnly: { type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } });
        const h1 = document.querySelector('h1');
        return { title: document.title, overflow: document.documentElement.scrollWidth > innerWidth, headings: document.querySelectorAll('h1').length, h1Size:getComputedStyle(h1).fontSize, brokenImages:[...document.images].filter(i=>!i.complete || i.naturalWidth===0).map(i=>i.getAttribute('alt')), violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})) };
      });
      const name = `${route==='/'?'home':'shop'}-${width}-${scheme}-${theme}`;
      await page.screenshot({ path: `${folder}/${name}.png`, fullPage:true });
      records.push({ name, ...report, errors:[...errors] });
      console.log(JSON.stringify(records.at(-1)));
    }
    await context.close();
  }
  const page = await browser.newPage({ reducedMotion:'reduce', viewport:{width:390,height:844} });
  await page.goto(base, {waitUntil:'load'});
  const motion = await page.locator('.hero-photo').evaluate(el=>getComputedStyle(el).animationName);
  console.log('Reduced motion hero animation='+motion);
  if(motion!=='none') throw new Error('Reduced motion failed');
  await page.goto(`${base}/shop?category=Electronics`, {waitUntil:'load'});
  const categories = await page.locator('article > a > p').allTextContents();
  if(!categories.length || categories.some(c=>c!=='Electronics')) throw new Error('Category filter failed');
  console.log('Category filtering passed');
  await page.goto(base,{waitUntil:'load'});
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(()=>document.activeElement?.textContent);
  if(!focused?.includes('Skip to main content')) throw new Error('Skip link failed');
  console.log('Keyboard skip link passed');
  await writeFile(`${folder}/audit.json`, JSON.stringify(records,null,2)+'\n');
  if(records.some(r=>r.overflow || r.headings!==1 || r.brokenImages.length || r.violations.length || r.errors.length)) process.exitCode=1;
} finally { await browser.close(); }
