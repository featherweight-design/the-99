import { chromium } from "playwright"; import { readFileSync, writeFileSync } from "node:fs";
import { existsSync, readFileSync as rf } from "node:fs";
const MIME = { html: "text/html", js: "text/javascript", css: "text/css", webp: "image/webp" };
const serveLocal = (p) => p.route("http://app.local/**", (r) => { const path = "/home/user/work/out" + decodeURIComponent(new URL(r.request().url()).pathname); if (!existsSync(path)) return r.fulfill({ status: 404, body: "" }); r.fulfill({ status: 200, contentType: MIME[path.split(".").pop()] ?? "application/octet-stream", body: rf(path) }); });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); await serveLocal(p);
for (const n of ["Main", "Phone", "Tablet"]) {
  let h = readFileSync(`/home/user/work/out/repo/${n}.dc.html`, "utf8").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<\/?(x-dc|helmet)>/g, "");
  writeFileSync(`/home/user/work/out/repo/_${n}.html`, h);
  await p.goto(`http://app.local/repo/_${n}.html`); await p.waitForTimeout(800);
  console.log(n, await p.evaluate(() => { const d = document.querySelector("body > div"); return [d.scrollWidth, d.scrollHeight]; }));
  await p.screenshot({ path: "/home/user/work/out/" + n + "-check.png", fullPage: true });
}
await b.close();
