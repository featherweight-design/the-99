// Quick filters R1 mocks: QF(state, 'p'|'d') rewrites the real static render into each proposal.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  const css = `
  .qf-pill{position:relative;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);border-radius:999px;padding:3px 9px 3px 5px;background:transparent;color:var(--fg-muted);font:inherit;cursor:pointer;white-space:nowrap}
  .qf-pill .qf-n{color:var(--fg-faint);font-variant-numeric:tabular-nums}
  .qf-pill.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--fg)}
  .qf-pill.on .qf-n{color:var(--accent)}
  .qf-pill.zero{opacity:.42;cursor:default}
  .qf-div{width:1px;height:16px;background:var(--border-strong)}
  .qf-chip{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border-radius:7px;border:1px solid var(--border-strong);background:var(--bg);padding:3px 8px;font-family:var(--font-plex-mono);font-size:11px;line-height:14px;color:var(--fg-body)}
  .qf-quick{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border-radius:999px;border:1px dashed var(--border-dashed);padding:3px 10px 3px 7px;font-family:var(--font-plex-mono);font-size:11px;line-height:14px;color:var(--fg-muted);background:transparent}
  .qf-quick b{font-weight:400;color:var(--fg-faint)}
  .qf-quick svg{width:12px;height:12px}
  .qf-note{position:absolute;z-index:50;background:#f5d76e;color:#1b1a17;font:600 12px/1.35 var(--font-plex-sans);padding:6px 9px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.45);max-width:240px}
  .qf-ring{outline:2px dashed #f5d76e;outline-offset:4px;border-radius:10px}
  `;
  document.head.appendChild(h(`<style>${css}</style>`));

  const key = () => $('[role=group][aria-label^="What the marks"]');
  const keyWrap = () => key().parentElement;
  const list = () => keyWrap().parentElement;
  const items = () => Array.from(list().children).filter((c) => c !== keyWrap());
  let DEV = "d";
  function chipsRow() {
    if (DEV === "d") return $('[data-chassis-row="chips"]');
    let s = $("#qf-pstrip"); if (s) return s;
    let e = $('button[aria-label="Filter cards"]');
    while (e.parentElement && !e.parentElement.contains(key())) e = e.parentElement;
    s = h('<div id="qf-pstrip" class="flex items-center gap-[6px]" style="padding:10px 16px 2px;min-height:22px"><span class="font-mono text-[11px] text-[color:var(--fg-faint)]">No filters on</span><button type="button" style="margin-left:auto;border:0;background:transparent;font:11px var(--font-plex-mono);text-decoration:underline;color:var(--fg-faint)">Clear all</button></div>');
    e.appendChild(s); return s;
  }
  function narrow(names) {
    for (const it of items()) it.style.display = names.some((n) => it.textContent.includes(n)) ? "" : "none";
  }
  function setResult(dev, shown) {
    const r = $('[data-chassis-row="result"] p');
    if (r) r.textContent = `Showing ${shown} of 17`;
    if (dev === "p") { const n = $$('[data-chassis-row="controls"] span, [data-chassis-row="controls"] p').find((e) => /^\d+$/.test(e.textContent.trim())); if (n) n.textContent = String(shown); }
  }
  function chips(dev, labels) {
    const row = chipsRow(); row.style.display = "flex"; row.hidden = false; row.removeAttribute("hidden");
    row.classList.remove("hidden");
    const first = row.firstElementChild; first.remove();
    labels.slice().reverse().forEach((l) => row.prepend(h(`<span class="qf-chip">${l}<span style="color:var(--fg-faint)">×</span></span>`)));
    const clr = $$("button", row).find((b) => b.textContent.includes("Clear all")); if (clr) { clr.disabled = false; clr.style.color = "var(--fg-muted)"; clr.style.cursor = "pointer"; }
  }
  const fits = () => { return window.__FITS || "◇◇"; };
  const glyph = (word) => { const e = $$("span", key()).find((s) => s.children.length === 0 && s.textContent === word); return e ? e.parentElement.firstElementChild.innerHTML : ""; };
  function note(el, text, dx = 0, dy = -34) {
    const b = el.getBoundingClientRect();
    const n = h(`<div class="qf-note">${text}</div>`);
    n.style.left = Math.max(8, b.left + dx + scrollX) + "px"; n.style.top = b.top + dy + scrollY + "px";
    document.body.appendChild(n); return n;
  }

  // ---------- A: the key becomes the quick filter ----------
  const COUNTS = { "game changer": 1, "mass land denial": 0, "extra turns": 0, tutor: 1, "Two-card combo": 3, foil: 0, "Wanted by a draft": 0, "In use": 0, "Over-committed": 0 };
  function A(dev, on) {
    const k = key();
    for (const ent of Array.from(k.children)) {
      const word = ent.lastElementChild.textContent; const n = COUNTS[word] ?? 0;
      const label = word === "Two-card combo" ? "Two-card combos" : word;
      const b = h(`<button type="button" class="qf-pill${n === 0 ? " zero" : ""}${on === word ? " on" : ""}" aria-pressed="${on === word}">${ent.firstElementChild.outerHTML}<span>${label}</span><span class="qf-n">${n === 0 ? "0" : n}</span></button>`);
      ent.replaceWith(b);
    }
    const free = h(`<button type="button" class="qf-pill${on === "Free" ? " on" : ""}" aria-pressed="false"><span style="display:inline-flex;width:16px;justify-content:center;color:var(--accent)">${fits()}</span><span>in no deck</span><span class="qf-n">20</span></button>`);
    k.prepend(free);
    if (dev === "d") { k.insertBefore(h('<span class="qf-div"></span>'), free.nextSibling); k.prepend(h('<span style="color:var(--fg-faint);margin-right:2px">Show only</span>')); k.style.rowGap = "8px"; k.style.columnGap = "8px"; }
    else { k.style.gridTemplateColumns = "1fr 1fr"; k.style.rowGap = "8px"; k.style.columnGap = "8px"; $$(".qf-pill", k).forEach((p) => { p.style.minHeight = "32px"; p.style.justifyContent = "flex-start"; }); $$(".qf-n", k).forEach((s) => (s.style.marginLeft = "auto")); keyWrap().prepend(h('<p style="margin:0 0 8px;font:10px var(--font-plex-mono);color:var(--fg-faint);text-transform:uppercase;letter-spacing:.14em">Show only</p>')); }
    $$("svg", free).forEach((s) => { s.setAttribute("width", "14"); s.setAttribute("height", "14"); });
    if (on === "game changer") { narrow(["Mystical Tutor"]); chips(dev, ["Game changer"]); setResult(dev, 1); }
    if (on === "Free") { chips(dev, ["Free"]); }
  }

  // ---------- B: a Marks menu in Filters ----------
  const MARKS = [["Two-card combo", "Two-card combos · you own both", 3], ["Two-card combo", "Two-card combos · you own one", 3], ["game changer", "Game changer", 1], ["tutor", "Tutor", 1], ["extra turns", "Extra turns", 0], ["mass land denial", "Mass land denial", 0], ["foil", "Foil or etched", 0]];
  function menuRows() {
    return MARKS.map(([g, w, n], i) => `<label style="display:flex;align-items:center;gap:10px;min-height:40px;padding:0 4px;${n === 0 ? "opacity:.45" : ""}${i === 2 ? ";border-top:1px solid var(--border);margin-top:4px;padding-top:4px" : ""}"><span style="width:18px;height:18px;border-radius:4px;border:1.5px solid var(--border-strong);${i === 0 ? "background:var(--accent);border-color:var(--accent)" : ""};display:inline-flex;align-items:center;justify-content:center;color:var(--bg);font-size:12px">${i === 0 ? "✓" : ""}</span><span style="display:inline-flex;width:16px;justify-content:center">${glyph(g)}</span><span style="flex:1;font:13px var(--font-plex-sans);color:var(--fg)">${w}</span><span style="font:11px var(--font-plex-mono);color:var(--fg-faint)">${n}</span></label>`).join("");
  }
  function B(dev) {
    const marksHtml = menuRows();
    if (dev === "d") {
      const avail = $$('[data-chassis-row="controls"] button').find((b) => /^Availability/.test(b.getAttribute("aria-label") || ""));
      const wrap = avail.parentElement; const clone = wrap.cloneNode(true);
      const btn = $("button", clone); btn.setAttribute("aria-label", "Marks 1");
      $$("[data-trigger-label]", btn).forEach((s) => (s.textContent = "Marks 1")); $$("[data-sizer]", btn).forEach((s) => s.setAttribute("data-sizer", "Marks 1"));
      $$("span", btn).forEach((s) => { if (/^Availabilit/.test(s.textContent) && s.children.length === 0) s.textContent = "Marks 1"; });
      btn.style.borderColor = "var(--accent)";
      wrap.after(clone);
      clone.appendChild(h(`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:40;width:300px;background:var(--elevated);border:1px solid var(--border-strong);border-radius:10px;padding:8px 10px 10px;box-shadow:0 12px 30px rgba(0,0,0,.45)"><p style="margin:2px 4px 6px;font:10px var(--font-plex-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)">Show cards marked</p>${marksHtml}</div>`));
      chips(dev, ["Two-card combos · own both"]);
      narrow(["Avatar Aang", "Searing Touch"]); setResult(dev, 2);
    } else {
      document.body.style.overflow = "hidden";
      const sheet = h(`<div style="position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55)"><div style="position:absolute;left:0;right:0;bottom:0;max-height:82%;overflow:hidden;background:var(--elevated);border-radius:16px 16px 0 0;border-top:1px solid var(--border-strong);padding:10px 18px 24px">
        <div style="width:36px;height:4px;border-radius:2px;background:var(--border-strong);margin:0 auto 12px"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><p style="margin:0;font:600 17px var(--font-plex-sans);color:var(--fg)">Filters</p><span style="font:12px var(--font-plex-mono);color:var(--fg-muted);text-decoration:underline">Clear all</span></div>
        ${["Color", "Type", "Set", "Availability"].map((s) => `<div style="display:flex;justify-content:space-between;align-items:center;min-height:48px;border-bottom:1px solid var(--border);font:14px var(--font-plex-sans);color:var(--fg-body)"><span>${s}</span><span style="color:var(--fg-faint);font:12px var(--font-plex-mono)">Any ›</span></div>`).join("")}
        <div style="display:flex;justify-content:space-between;align-items:center;min-height:48px;font:600 14px var(--font-plex-sans);color:var(--fg)"><span>Marks</span><span style="color:var(--accent);font:12px var(--font-plex-mono)">1 on ⌄</span></div>
        <div>${marksHtml}</div>
        <div style="margin-top:14px;height:46px;border-radius:10px;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center;font:600 14px var(--font-plex-sans)">Show 2 cards</div>
      </div></div>`);
      document.body.appendChild(sheet);
    }
  }

  // ---------- C: quick chips where "No filters on" sits ----------
  const QUICK = [["free", "In no deck", 20], ["Two-card combo", "Two-card combos", 3], ["game changer", "Game changers", 1], ["tutor", "Tutors", 1]];
  function C(dev, on) {
    const row = chipsRow(); row.style.display = "flex"; row.classList.remove("hidden"); row.removeAttribute("hidden");
    const quick = QUICK.map(([g, w, n]) => `<button type="button" class="qf-quick"${on === w ? ' style="border-style:solid;border-color:var(--accent);color:var(--fg);background:color-mix(in srgb,var(--accent) 16%,transparent)"' : ""}><span style="display:inline-flex;color:var(--accent)">${g === "free" ? fits() : glyph(g)}</span>${w} <b>${n}</b>${on === w ? '<span style="color:var(--fg-muted);margin-left:2px">×</span>' : ""}</button>`).join("");
    const first = row.firstElementChild;
    first.replaceWith(h(`<span style="display:contents"><span style="font:11px var(--font-plex-mono);color:var(--fg-faint)">Quick:</span>${quick}</span>`));
    if (dev === "p") { row.style.flexWrap = "nowrap"; row.style.overflowX = "auto"; row.style.marginRight = "-16px"; row.style.paddingRight = "16px"; const clr = $$("button", row).find((b) => b.textContent.includes("Clear all")); if (clr && !on) clr.style.display = "none"; }
    $$(".qf-quick svg", row).forEach((s) => { s.setAttribute("width", "12"); s.setAttribute("height", "12"); });
    if (on === "Two-card combos") { narrow(["Avatar Aang", "Searing Touch"]); setResult(dev, 2); }
  }

  // ---------- R2: C only. Every mark gets a quick chip; a chip with no cards behind it is not drawn. ----------
  const ALL = [["free", "In no deck"], ["Two-card combo", "Two-card combos"], ["game changer", "Game changers"], ["tutor", "Tutors"], ["extra turns", "Extra turns"], ["mass land denial", "Mass land denial"], ["foil", "Foil"]];
  const COUNTSETS = {
    full: { "In no deck": 412, "Two-card combos": 3, "Game changers": 9, "Tutors": 14, "Extra turns": 2, "Mass land denial": 1, "Foil": 38 },
    sparse: { "In no deck": 17, "Two-card combos": 3, "Game changers": 1, "Tutors": 1 },
    blueInstants: { "In no deck": 1, "Game changers": 1, "Tutors": 1 },
  };
  function C2(dev, set, on, active) {
    const counts = COUNTSETS[set]; active = active || [];
    const row = chipsRow(); row.style.display = "flex"; row.classList.remove("hidden"); row.removeAttribute("hidden");
    const solid = ' style="border-style:solid;border-color:var(--accent);color:var(--fg);background:color-mix(in srgb,var(--accent) 16%,transparent)"';
    const quick = ALL.filter(([, w]) => counts[w]).map(([g, w]) => `<button type="button" class="qf-quick"${on === w ? solid : ""}><span style="display:inline-flex;color:var(--accent)">${g === "free" ? fits() : glyph(g)}</span>${w} <b>${counts[w]}</b>${on === w ? '<span style="color:var(--fg-muted);margin-left:2px">×</span>' : ""}</button>`).join("");
    const act = active.length ? `<span class="qf-div" style="margin:0 4px;flex:none"></span>${active.map((l) => `<span class="qf-chip" style="flex:none">${l}<span style="color:var(--fg-faint)">×</span></span>`).join("")}` : "";
    row.firstElementChild.replaceWith(h(`<span style="display:contents"><span style="font:11px var(--font-plex-mono);color:var(--fg-faint);flex:none">Quick:</span>${quick}${act}</span>`));
    const clr = Array.from(row.querySelectorAll("button")).find((b) => b.textContent.includes("Clear all"));
    if (clr && (on || active.length)) { clr.disabled = false; clr.style.color = "var(--fg-muted)"; }
    if (dev === "p") { row.style.flexWrap = "nowrap"; row.style.overflowX = "auto"; row.style.marginRight = "-16px"; row.style.paddingRight = "16px"; if (clr) clr.style.display = "none"; }
    Array.from(row.querySelectorAll(".qf-quick svg")).forEach((s) => { s.setAttribute("width", "12"); s.setAttribute("height", "12"); });
    if (active.length) { narrow(["Mystical Tutor"]); setResult(dev, 1); }
  }

  // ---------- Combos view: the pairs, own both / own one ----------
  const art = (n) => `art/c-${n}.jpg`;
  const PAIRS_BOTH = [
    { a: ["Avatar Aang", art("avatar-aang")], b: ["Searing Touch", art("searing-touch")], line: "Infinite damage", where: "In no deck together", isNew: true },
    { a: ["Exquisite Blood", null], b: ["Sanguine Bond", null], line: "Infinite lifeloss", where: "Both in Edgar's Bloodline" },
    { a: ["Heliod, Sun-Crowned", null], b: ["Walking Ballista", null], line: "Infinite damage", where: "In no deck together" },
  ];
  const PAIRS_ONE = [
    { a: ["Polyraptor", art("polyraptor")], b: ["Warstorm Surge", null], line: "Infinite creature tokens", where: "$2.40 on Mana Pool" },
    { a: ["Kiki-Jiki, Mirror Breaker", null], b: ["Zealous Conscripts", null], line: "Infinite creature tokens", where: "Wanted by Kiki Combo (draft)" },
    { a: ["Time Vault", null], b: ["Voltaic Key", null], line: "Infinite turns", where: "$1.10 on Mana Pool" },
  ];
  function tile(n, src, missing, w) {
    const hgt = Math.round(w * 1.395);
    if (src) return `<img src="${src}" style="width:${w}px;height:${hgt}px;object-fit:cover;border-radius:${w > 80 ? 7 : 4}px;display:block">`;
    const big = w > 80;
    if (missing) return `<div style="width:${w}px;height:${hgt}px;border-radius:${big ? 7 : 4}px;border:1.5px dashed var(--border-dashed);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:6px;text-align:center"><span style="font:${big ? 22 : 14}px var(--font-plex-sans);color:var(--fg-faint)">+</span>${big ? `<span style="font:600 11px/1.25 var(--font-plex-sans);color:var(--fg-muted)">${n}</span><span style="font:9.5px var(--font-plex-mono);color:var(--fg-faint)">not owned</span>` : ""}</div>`;
    return `<div style="width:${w}px;height:${hgt}px;border-radius:${big ? 7 : 4}px;box-sizing:border-box;padding:${big ? 6 : 3}px;background:linear-gradient(160deg,#4a4239,#2a2520);border:1px solid #5b5146;display:flex;flex-direction:column;gap:${big ? 5 : 2}px"><div style="height:${big ? 15 : 6}px;border-radius:3px;background:#c9bda8;font:600 8.5px/15px var(--font-plex-sans);color:#1b1a17;padding:0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${big ? n : ""}</div><div style="flex:1;border-radius:3px;background:linear-gradient(135deg,#6b5c4a,#3b332a)"></div><div style="height:${big ? 34 : 12}px;border-radius:3px;background:#d8cdb8;opacity:.85"></div></div>`;
  }
  function Combos(dev, which) {
    const lem = glyph("Two-card combo");
    const pairs = which === "both" ? PAIRS_BOTH : PAIRS_ONE;
    for (const it of items()) it.style.display = "none";
    keyWrap().style.display = "none";
    const seg = `<div style="display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:var(--surface-sunken);border:1px solid var(--border-strong)">
      ${[["both", "You own both", 3], ["one", "You own one", 3]].map(([k, l, n]) => `<span style="display:inline-flex;align-items:center;gap:7px;height:${dev === "p" ? 40 : 32}px;padding:0 14px;border-radius:7px;font:${k === which ? 600 : 400} 13px var(--font-plex-sans);color:${k === which ? "var(--fg)" : "var(--fg-faint)"};${k === which ? "background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong)" : ""}">${l}<span style="font:11px var(--font-plex-mono);color:${k === which ? "var(--accent)" : "var(--fg-faint)"}">${n}</span></span>`).join("")}</div>`;
    const sub = which === "both" ? "Two-card combos where both cards are in your collection." : "Combos you are one card away from, and what the missing card costs.";
    const W = dev === "d" ? 118 : 54;
    const cards = pairs.map((p) => {
      const miss = which === "one";
      const pairArt = `<div style="display:flex;align-items:center;gap:${dev === "d" ? 10 : 6}px;flex:none">${tile(p.a[0], p.a[1], false, W)}<span style="display:inline-flex;color:var(--fg-faint)">${lem}</span>${tile(p.b[0], p.b[1], miss, W)}</div>`;
      const text = `<div style="min-width:0;flex:1"><p style="margin:0;font:600 ${dev === "d" ? 14 : 13.5}px/1.3 var(--font-plex-sans);color:var(--fg)">${p.a[0]} <span style="color:var(--fg-faint);font-weight:400">+</span> ${miss ? `<span style="color:var(--fg-muted)">${p.b[0]}</span>` : p.b[0]}${p.isNew ? ' <span style="font:10px var(--font-plex-mono);color:var(--accent);border:1px solid var(--accent);border-radius:4px;padding:0 4px;vertical-align:2px;margin-left:4px">NEW</span>' : ""}</p>
        <p style="margin:3px 0 0;font:12px/1.4 var(--font-plex-sans);color:var(--fg-muted)">${p.line}</p>
        <p style="margin:4px 0 0;font:10.5px var(--font-plex-mono);color:var(--fg-faint)">${miss ? "Missing " + p.b[0].split(",")[0] + " · " + p.where : p.where}</p>
        ${dev === "d" ? `<div style="display:flex;gap:8px;margin-top:12px">${miss ? '<span style="font:600 12px var(--font-plex-sans);color:var(--fg);border:1px solid var(--border-strong);border-radius:8px;padding:7px 12px">Add to wishlist</span>' : '<span style="font:600 12px var(--font-plex-sans);color:var(--fg);border:1px solid var(--border-strong);border-radius:8px;padding:7px 12px">Find a deck</span>'}<span style="font:12px var(--font-plex-sans);color:var(--fg-muted);padding:7px 4px;text-decoration:underline">How it works</span></div>` : ""}</div>`;
      return dev === "d"
        ? `<div style="display:flex;gap:18px;align-items:flex-start;padding:14px;border-radius:12px;background:var(--surface-rail);border:1px solid var(--border)">${pairArt}${text}</div>`
        : `<div style="display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;background:var(--surface-rail);border:1px solid var(--border)">${pairArt}${text}<span style="color:var(--fg-faint)">›</span></div>`;
    }).join("");
    const block = h(`<div style="${dev === "d" ? "grid-column:1/-1;" : ""}display:flex;flex-direction:column;gap:${dev === "d" ? 14 : 10}px;padding:${dev === "d" ? "4px 0 0" : "4px 0 0"}">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">${seg}<p style="margin:0;font:12px var(--font-plex-sans);color:var(--fg-muted)">${sub}</p></div>
      <div style="display:grid;grid-template-columns:${dev === "d" ? "repeat(auto-fill,minmax(520px,1fr))" : "1fr"};gap:${dev === "d" ? 14 : 8}px">${cards}</div></div>`);
    list().appendChild(block);
    const r = $('[data-chassis-row="result"] p'); if (r) r.textContent = which === "both" ? "3 combos · 6 cards" : "3 combos · 3 of 6 cards owned";
    return block;
  }

  window.QF = function (state, dev) {
    DEV = dev;
    if (state === "base") return;
    if (state === "r2-full") return C2(dev, "full");
    if (state === "r2-sparse") return C2(dev, "sparse");
    if (state === "r2-active") return C2(dev, "blueInstants", null, ["Blue", "Instant"]);
    if (state === "r2-combo-both" || state === "r2-combo-one") { C2(dev, "full", "Two-card combos"); return Combos(dev, state.endsWith("both") ? "both" : "one"); }
    if (state === "a") return A(dev, null);
    if (state === "a-gc") return A(dev, "game changer");
    if (state === "b") return B(dev);
    if (state === "c") return C(dev, null);
    if (state === "c-on") return C(dev, "Two-card combos");
    if (state === "combo-both" || state === "combo-one") {
      C(dev, "Two-card combos");
      return Combos(dev, state === "combo-both" ? "both" : "one");
    }
  };
  const ART = {"Sai, Master Thopterist": "sai", "Dina, Essence Brewer": "dina", "Doctor Doom, King of Latveria": "doom", "Ghalta, Primal Hunger": "ghalta", "Zimone, Infinite Analyst": "zimone", "Mystical Tutor": "mystical-tutor", "Avenger of Zendikar": "avenger-of-zendikar", "Bloodline Keeper": "bloodline-keeper", "All Is Dust": "all-is-dust", "Heartless Act": "heartless-act", "Cemetery Prowler": "cemetery-prowler", "Avatar Aang": "avatar-aang", "Polyraptor": "polyraptor", "Brudiclad, Telchor Engineer": "brudiclad", "Searing Touch": "searing-touch", "Assimilation Aegis": "assimilation-aegis", "All Will Be One": "all-will-be-one"};
  Array.from(document.querySelectorAll("img:not([src])")).forEach((i) => { let e = i; for (let k = 0; k < 8 && e; k++) { e = e.parentElement; const n = e && Object.keys(ART).filter((x) => e.textContent.includes(x)).sort((a, b) => e.textContent.indexOf(a) - e.textContent.indexOf(b))[0]; if (n && e.textContent.length < 200) { i.src = "art/c-" + ART[n] + ".jpg"; break; } } });
  // eager art for the screenshot
  $$("img").forEach((i) => { i.loading = "eager"; });
})();
