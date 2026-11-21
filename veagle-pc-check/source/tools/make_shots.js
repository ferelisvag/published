// Screenshots for the landing page: NODE_PATH=$(npm root -g) node tools/make_shots.js  (then make_landing.py)
// Uses tools/sample-report.html and sample-win10-laptop.html (demo data), 1280x800, writes ../shots/*.webp
const { chromium } = require('playwright'); const path = require('path'), cp = require('child_process'), fs = require('fs');
const T = __dirname, OUT = path.join(__dirname, '..', '..', 'shots'), TMP = '/tmp/vpc-shots';
fs.mkdirSync(TMP, { recursive: true });
const tab = (p, t) => p.evaluate(t => document.querySelector('[role=tab][data-tab=' + t + ']').click(), t).then(() => p.waitForTimeout(1500));
const toHead = (p, txt, pane) => p.evaluate(([txt, pane]) => {
  const h = Array.from(document.querySelectorAll('#tab-' + pane + ' h2')).find(e => e.textContent.trim().indexOf(txt) === 0);
  if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 24); }, [txt, pane]).then(() => p.waitForTimeout(900));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const shot = async n => { await p.screenshot({ path: TMP + '/' + n + '.png' }); };
  await p.goto('file://' + T + '/sample-report.html'); await p.waitForTimeout(4500);
  // the note at the top is closed, like a user who read it once
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(b => /Understood/.test(b.textContent)); if (x) x.click(); }); await p.waitForTimeout(600);
  await shot('hero');
  await toHead(p, 'Troubleshooting assistant', 'summary'); await shot('assist');
  await toHead(p, 'What happened in the last', 'summary'); await shot('timeline');
  await tab(p, 'dashboard'); await shot('dash');
  await p.evaluate(() => window.scrollTo(0, 0)); await tab(p, 'findings');
  await p.evaluate(() => { const d = document.querySelector('#findList details, #findList .finding'); if (d) { d.open = true; const h = d.querySelector('summary, .fhead'); if (h) h.click(); } });
  await p.waitForTimeout(700); await p.evaluate(() => window.scrollTo(0, document.querySelector('#findList').getBoundingClientRect().top + window.scrollY - 140)); await p.waitForTimeout(500); await shot('findings');
  await tab(p, 'insights'); await p.evaluate(() => window.scrollTo(0, 0)); await toHead(p, 'Basic security checklist', 'insights'); await shot('insights');
  await tab(p, 'privacy'); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await shot('privacy');
  await tab(p, 'tools'); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await shot('tools');
  await tab(p, 'ai'); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await shot('ai');
  await tab(p, 'compare'); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await shot('compare');
  await p.goto('file://' + T + '/sample-win10-laptop.html'); await p.waitForTimeout(4000);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(b => /Understood/.test(b.textContent)); if (x) x.click(); });
  await tab(p, 'dashboard');
  await p.evaluate(() => { const e = document.querySelector('#wBattery') || document.querySelector('#wReady'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 120); }); await p.waitForTimeout(700);
  await shot('win11');
  await b.close();
  for (const n of ['hero', 'assist', 'timeline', 'dash', 'findings', 'insights', 'privacy', 'tools', 'ai', 'compare', 'win11'])
    cp.execFileSync('python3', ['-c', `from PIL import Image;Image.open('${TMP}/${n}.png').convert('RGB').save('${OUT}/${n}.webp','WEBP',quality=82,method=6)`]);
  console.log('shots written to', OUT);
})();
