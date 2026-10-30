import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const dir = process.argv[2], out = process.argv[3];
const canvas = JSON.parse(fs.readFileSync(dir + '/canvas.json'));
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
const res = {};
for (const [f, box] of Object.entries(canvas.boards)) {
  const src = fs.readFileSync(dir + '/' + f, 'utf8');
  const inner = src.split('<x-dc>')[1].split('</x-dc>')[0].replace('<helmet>', '').replace('</helmet>', '');
  const fcss=fs.readFileSync('fonts.css','utf8'); const html = '<!doctype html><html><head><meta charset="utf-8"><style>'+fcss+'</style></head><body style="margin:0">' + inner + '</body></html>';
  const pg = await b.newPage();
  await pg.setViewport({ width: box.w, height: 800, deviceScaleFactor: 0.5 });
  await pg.goto('file://'+process.cwd()+'/blank.html'); await pg.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 }).catch(()=>{});
  await pg.evaluate(()=>document.fonts.ready); const h = await pg.evaluate(() => { const r = document.querySelector('body > div'); r.style.minHeight = '0px'; return Math.ceil(r.scrollHeight); });
  res[f] = h;
  await pg.screenshot({ path: out + '/' + f.replace('.dc.html', '.png'), fullPage: true });
  await pg.close();
}
await b.close();
console.log(JSON.stringify(res));
