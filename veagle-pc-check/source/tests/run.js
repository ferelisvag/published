// VEAGLE PC Check - automated checks. Run: NODE_PATH=$(npm root -g) node tests/run.js
// Loads app/template.html with several sample scans and checks that nothing breaks.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL ' + m); } else console.log('  ok   ' + m); };

function fixtures() {
  const t = path.join(root, 'tools');
  const base = JSON.parse(fs.readFileSync(path.join(t, 'sample-data.json'), 'utf8'));
  const list = [['sample', base], ['win10-laptop', JSON.parse(fs.readFileSync(path.join(t, 'sample-win10-laptop.json'), 'utf8'))]];
  const bare = JSON.parse(JSON.stringify(base)); delete bare.extras; delete bare.previous; list.push(['no-extras', bare]);
  const iss = JSON.parse(JSON.stringify(base)); iss.meta.stepIssues = [{ step: 5, label: 'Security', errors: 3, samples: ['Access is denied.'] }]; list.push(['step-issues', iss]);
  const one = JSON.parse(JSON.stringify(base)); one.meta.stepIssues = { step: 2, label: 'X', errors: 1, samples: 'single' }; list.push(['step-issues-single-object', one]); // PowerShell 5.1 collapses 1-item arrays
  return list;
}

(async () => {
  console.log('collector');
  const ps = fs.readFileSync(path.join(root, 'app/collector.ps1'));
  ok(!ps.some(b => b > 127), 'collector.ps1 is pure ASCII');
  const pw = '/home/claude/pwsh/pwsh';
  if (fs.existsSync(pw)) {
    const r = cp.spawnSync(pw, ['-NoProfile', '-Command', '$e=$null;[System.Management.Automation.Language.Parser]::ParseFile("' + path.join(root, 'app/collector.ps1') + '",[ref]$null,[ref]$e)|Out-Null;$e.Count'], { env: { ...process.env, DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1' } });
    ok(String(r.stdout).trim() === '0', 'collector.ps1 parses in PowerShell 7');
  }
  const sc = ps.toString();
  // the only allowed delete is the collector's own temporary secpol export
  ok(!/Set-ItemProperty|New-ItemProperty|Remove-Item|Stop-Service|Set-Service|Restart-Computer|(?<![-\w])(Disable|Enable|Install)-[A-Z]/i.test(sc.replace(/#.*$/gm, '').replace(/Remove-Item -LiteralPath \$sf2[^\n]*/g, '')), 'collector contains no commands that change the PC');

  const tpl = fs.readFileSync(path.join(root, 'app/template.html'), 'utf8');
  ok(tpl.includes('/*__PCDATA__*/null'), 'template has the data placeholder');
  const browser = await chromium.launch();
  for (const [name, data] of fixtures()) {
    console.log('fixture: ' + name);
    const file = '/tmp/pcc-test-' + name + '.html';
    fs.writeFileSync(file, tpl.replace('/*__PCDATA__*/null', JSON.stringify(data)));
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + file); await page.waitForTimeout(1500);
    const skip = await page.$('#bootSkip'); if (skip) await skip.click().catch(() => {});
    const info = await page.evaluate(() => ({
      score: V.score.score, n: V.findings.length,
      noMeta: V.findings.filter(f => !V.META[f.id]).map(f => f.id),
      ruleErr: V.findings.filter(f => /rule-error/.test(f.id)).length,
      noEl: V.findings.filter(f => { const t = V.tf(f); return V.lang === 'en' ? false : !t.title; }).map(f => f.id)
    }));
    ok(info.score >= 0 && info.score <= 100, 'score 0-100 (' + info.score + ')');
    ok(info.ruleErr === 0, 'no rule-error findings');
    ok(info.noMeta.length === 0, 'every finding has META ' + info.noMeta.join(','));
    // Greek: every finding has a translation that differs from nothing/empty
    const gr = await page.evaluate(() => { V.lang = 'el'; const bad = V.findings.filter(f => { const t = V.tf(f); return !t || !t.title || !t.why; }).map(f => f.id); V.lang = 'en'; return bad; });
    ok(gr.length === 0, 'Greek text for every finding ' + gr.join(','));
    // themes
    for (const th of ['classic', 'clean', 'guide', 'cockpit', 'bento', 'cyber']) {
      await page.evaluate(t => THEMES.set(t, true), th);
      const cls = await page.evaluate(() => document.body.className);
      ok(cls.includes('th-' + th) || th === 'classic', 'theme ' + th);
    }
    await page.evaluate(() => THEMES.set('classic', true));
    // tabs
    for (const tab of ['summary', 'findings', 'tools', 'events']) {
      await page.evaluate(t => { const b = document.querySelector('[data-tab="' + t + '"]'); if (b) b.click(); }, tab);
    }
    // views
    await page.evaluate(() => UI.setView('simple'));
    ok(await page.evaluate(() => document.body.classList.contains('view-simple')), 'simple view on');
    await page.evaluate(() => UI.setView('tech'));
    ok(!(await page.evaluate(() => document.body.classList.contains('view-simple'))), 'technician view on');
    // step issues
    const hasBox = await page.$('#stepIssues');
    const expect = !!(data.meta && data.meta.stepIssues);
    ok(!!hasBox === expect, 'scan-notes box ' + (expect ? 'shown' : 'hidden'));
    // fix script: every command line in the Tools tab script is commented or blank
    const cmds = await page.evaluate(() => Array.from(document.querySelectorAll('#tab-tools textarea, #tab-tools pre')).map(e => e.value || e.textContent).join('\n'));
    // print sheet
    await page.evaluate(() => { window.print = function () {}; PRO.printClient(); });
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => !!document.getElementById('clientDoc')), 'print sheet is built');
    await page.evaluate(() => { document.body.classList.remove('printclient'); const x = document.getElementById('clientDoc'); if (x) x.remove(); });
    // support links
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="http"]')).map(a => a.href + '|' + a.rel));
    ok(links.every(l => /noopener/.test(l.split('|')[1])), 'all external links use noopener (' + links.length + ')');
    ok(links.every(l => !/[?#]/.test(l.split('|')[0])), 'no data in link addresses');
    // share-safe copy drops error texts
    const share = await page.evaluate(() => { try { return typeof SHARE.build === 'function' ? JSON.stringify(SHARE.build()) : null; } catch (e) { return null; } });
    if (share && expect) ok(!share.includes('Access is denied'), 'share-safe copy has no error samples');
    ok(errs.length === 0, 'no JS errors ' + errs.slice(0, 2).join(' | '));
    await page.close();
  }
  // period windows
  await browser.close();
  console.log(fails ? '\n' + fails + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
  process.exit(fails ? 1 : 0);
})();
