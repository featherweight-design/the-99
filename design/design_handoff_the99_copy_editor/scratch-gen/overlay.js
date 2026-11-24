// Copy editor R1 overlay: CE(state, dev). Draws the mode over the rendered page from its real DOM.
window.CE = function (state, dev) {
  const D = dev === "d";
  const css = `
  .ce-on [data-ce]{outline:1px dashed color-mix(in srgb,var(--accent) 60%,transparent);outline-offset:2px;border-radius:3px;cursor:text}
  .ce-on [data-ce=ro]{outline:1px dotted color-mix(in srgb,var(--fg-faint) 80%,transparent);cursor:not-allowed}
  .ce-on [data-ce-edited]{outline:1px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .ce-on [data-ce-hot]{outline:2px solid var(--accent)!important;outline-offset:3px;background:color-mix(in srgb,var(--accent) 14%,transparent)}
  .ce-on [data-ce=ro][data-ce-hot]{outline-color:var(--fg-muted)!important;background:color-mix(in srgb,var(--fg-muted) 12%,transparent)}
  #ce{position:fixed;inset:0;pointer-events:none;z-index:9999;font-family:var(--font-sans);color:var(--fg)}
  #ce *{box-sizing:border-box}
  .ce-m{font-family:var(--font-mono)}
  .ce-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 16px;border-radius:999px;font:500 13.5px var(--font-sans);border:1px solid var(--border-strong);color:var(--fg);background:transparent;white-space:nowrap}
  .ce-pri{background:var(--accent);border-color:var(--accent);color:var(--bg)}
  .ce-dis{opacity:.45}
  .ce-card{background:var(--surface-raised,var(--elevated));border:1px solid var(--border-strong);box-shadow:var(--modal-shadow,0 30px 80px rgba(0,0,0,.6))}
  .ce-chip{display:inline-flex;align-items:center;gap:3px;height:22px;padding:0 7px 0 5px;margin:0 2px;border-radius:6px;vertical-align:1px;font:500 12px var(--font-mono);color:var(--accent-text);background:color-mix(in srgb,var(--accent) 16%,transparent);border:1px solid color-mix(in srgb,var(--accent) 55%,transparent)}
  .ce-chip i{font-style:normal;opacity:.6;font-size:10px;letter-spacing:-1px}
  .ce-lab{font:500 10.5px var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
  .ce-field{border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-sunken,var(--bg));padding:10px 12px;font-size:15px;line-height:1.55;color:var(--fg)}
  .ce-focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
  .ce-err{border-color:var(--danger);box-shadow:0 0 0 3px color-mix(in srgb,var(--danger) 16%,transparent)}
  .ce-now{font-size:14px;line-height:1.55;color:var(--fg-muted)}
  .ce-caret{display:inline-block;width:1.5px;height:18px;background:var(--accent);vertical-align:-3px;margin-left:1px}
  .ce-bad{background:color-mix(in srgb,var(--danger) 26%,transparent);border-radius:3px;box-shadow:inset 0 -2px 0 var(--danger)}
  .ce-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--warning)}
  .ce-row{display:flex;flex-direction:column;gap:4px;padding:11px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-sunken,var(--bg))}
  .ce-spin{width:14px;height:14px;border-radius:50%;border:2px solid color-mix(in srgb,var(--bg) 40%,transparent);border-top-color:var(--bg)}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const root = document.createElement("div"); root.id = "ce"; document.body.appendChild(root);
  const H = (h) => { const t = document.createElement("div"); t.innerHTML = h.trim(); const e = t.firstElementChild; root.appendChild(e); return e; };
  const chip = (n) => `<span class="ce-chip"><i>⠿</i>{${n}}</span>`;

  // The page's visible text, found by its words: every leaf text element.
  const leaves = [...document.querySelectorAll("main *")].filter((e) => {
    if (e.closest("#ce") || e.closest("svg")) return false;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });
  const find = (t) => leaves.find((e) => e.textContent.trim() === t) || leaves.find((e) => e.textContent.trim().startsWith(t));
  const on = state !== "off";
  if (on) {
    document.documentElement.classList.add("ce-on");
    leaves.forEach((e) => e.setAttribute("data-ce", ""));
    const ro = find("Dinosaurs"); if (ro) ro.setAttribute("data-ce", "ro");
  }
  const T = {
    title: find("Help me choose"), fill: find("Any identity that includes"), picks: find("12 picks"), ro: find("Dinosaurs"),
  };
  const edited = ["tray", "submitting", "failed"].includes(state) || state.startsWith("ed-");
  const n = { tray: 3, submitting: 3, failed: 3 }[state] ?? (edited ? 2 : 0);
  if (edited && on) {
    if (T.title && state !== "ed-err") { T.title.textContent = "Help me pick"; T.title.setAttribute("data-ce-edited", ""); }
    if (T.fill && state !== "ed-fill") { T.fill.textContent = "Any color identity with White and Blue in it."; T.fill.setAttribute("data-ce-edited", ""); }
    if (n === 3 && T.picks) { T.picks.textContent = "12 fits"; T.picks.setAttribute("data-ce-edited", ""); }
  }
  if (state === "submitted") { /* staging keeps its wording until the PR merges */ }

  // ---- The bar: toggle + count + tray door ----
  const pr = state === "submitted" ? `<span class="ce-m" style="font-size:11.5px;color:var(--success)">PR #3301 open</span>` : "";
  const count = n ? `<span style="display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border-radius:999px;background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent-text);font:500 12.5px var(--font-sans)">${n} edit${n === 1 ? "" : "s"} <span style="opacity:.8">›</span></span>` : (pr || `<span style="font-size:12.5px;color:var(--fg-muted)">Click any text</span>`);
  const offPill = `<span style="display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px 0 13px;border-radius:999px;font:500 13.5px var(--font-sans);color:var(--fg)"><span style="font-size:15px">✎</span> Edit copy <span class="ce-dot"></span></span>`;
  const onBar = `<span style="display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 6px 0 14px"><span class="ce-dot"></span><span style="font:500 13.5px var(--font-sans)">Editing copy</span><span class="ce-m" style="font-size:10.5px;color:var(--fg-faint)">staging</span>${count}<span class="ce-btn" style="height:32px;padding:0 13px;font-size:12.5px">Done</span></span>`;
  if (D) {
    H(`<div class="ce-card" style="position:absolute;right:24px;bottom:24px;border-radius:999px;pointer-events:auto">${on ? onBar : offPill}</div>`);
  } else if (on) {
    const hh = Math.max(...[...document.querySelectorAll("header")].map((h) => h.getBoundingClientRect().bottom).filter((b) => b > 0 && b < 140), 0) || 79;
    H(`<div style="position:absolute;left:0;right:0;top:${hh}px;display:flex;align-items:center;justify-content:space-between;height:46px;padding:0 10px 0 16px;background:var(--surface-raised,var(--elevated));border-bottom:1px solid var(--border-strong);box-shadow:0 10px 24px rgba(0,0,0,.35)">
      <span style="display:flex;align-items:center;gap:8px"><span class="ce-dot"></span><span style="font:500 13.5px var(--font-sans)">Editing copy</span></span>
      <span style="display:flex;align-items:center;gap:8px">${n ? count : pr || `<span style="font-size:12px;color:var(--fg-muted)">Tap any text</span>`}<span class="ce-btn" style="height:30px;padding:0 12px;font-size:12.5px">Done</span></span></div>`);
  } else {
    // Off, phone: the pencil sits in the mobile header beside search (admins on staging only).
    const s = [...document.querySelectorAll("header button, header a")].find((b) => /search/i.test(b.getAttribute("aria-label") || ""));
    const r = s ? s.getBoundingClientRect() : { left: 230, top: 24, height: 40 };
    H(`<div style="position:absolute;left:${r.left - 52}px;top:${r.top + r.height / 2 - 20}px;width:40px;height:40px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--bg)">✎<span class="ce-dot" style="position:absolute;right:3px;top:3px"></span></div>`);
  }

  // ---- Targeted ----
  const tag = (el, txt, sub) => {
    const r = el.getBoundingClientRect();
    H(`<div style="position:absolute;left:${r.left - 3}px;top:${r.top - 34}px;display:flex;align-items:center;gap:8px;height:26px;padding:0 10px;border-radius:7px;background:var(--accent);color:var(--bg);font:500 11.5px var(--font-mono);white-space:nowrap">${txt}<span style="font-family:var(--font-sans);font-weight:600">${sub}</span></div>`);
  };
  if (state === "target") { T.title.setAttribute("data-ce-hot", ""); tag(T.title, "help-me-choose · intake.title", D ? "Click to edit" : "Tap again to edit"); }

  // ---- Editor ----
  const ed = {
    "ed-plain": { el: T.title, key: "intake.title", file: "help-me-choose", kind: "title · up to 8 words", now: "Help me choose",
      body: `<div class="ce-field ce-focus">Help me pick<span class="ce-caret"></span></div>`, rule: `<span>3 of 8 words</span>`, ok: true },
    "ed-fill": { el: T.fill, key: "intake.colorsAny", file: "help-me-choose", kind: "caption", now: `Any identity that includes ${chip("names")}.`,
      body: `<div class="ce-field ce-focus">Any color identity with ${chip("names")} in it.<span class="ce-caret"></span></div>`,
      help: `<span style="color:var(--fg-muted)">${chip("names")} is filled in by the app (here: White and Blue). Drag it to move it; it can’t be deleted.</span>`,
      rule: `<span>Preview: Any color identity with White and Blue in it.</span>`, ok: true },
    "ed-var": { el: T.picks, key: "row.picks", file: "help-me-choose-history", kind: "2 variations · chip", now: `${chip("n")} pick / ${chip("n")} picks`,
      body: `<div style="display:flex;flex-direction:column;gap:10px">
        <div><div class="ce-m" style="font-size:11px;color:var(--fg-muted);margin-bottom:5px">When n is 1 · now “${chip("n")} pick”</div><div class="ce-field">${chip("n")} fit</div></div>
        <div><div class="ce-m" style="font-size:11px;color:var(--fg-muted);margin-bottom:5px">Otherwise · now “${chip("n")} picks”</div><div class="ce-field ce-focus">${chip("n")} fits<span class="ce-caret"></span></div></div></div>`,
      rule: `<span>Preview: 1 fit · 12 fits</span>`, ok: true },
    "ed-err": { el: T.title, key: "intake.title", file: "help-me-choose", kind: "title · up to 8 words", now: "Help me choose",
      body: `<div class="ce-field ce-err">Help me choose<span class="ce-bad"> — </span>find your next commander, fast<span class="ce-bad">!</span><span class="ce-caret"></span></div>`,
      rule: `<span style="display:flex;flex-direction:column;gap:5px;color:var(--danger)"><span>⚠ No em dash. Use a comma, a colon or two sentences.</span><span>⚠ No exclamation mark.</span><span>⚠ 9 words. A title is 8 at most.</span></span>`, ok: false },
    "ed-ro": { el: T.ro, ro: true, key: "theme · dinosaurs", file: "EDHREC data", kind: "read only", now: "Dinosaurs" },
  }[state];
  if (ed) {
    ed.el.setAttribute("data-ce-hot", "");
    const head = `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span class="ce-m" style="font-size:12px;color:var(--fg)">${ed.file} <span style="color:var(--fg-faint)">·</span> ${ed.key}</span>
      <span class="ce-m" style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:${ed.ro ? "var(--fg-muted)" : "var(--fg-faint)"}">${ed.ro ? "🔒 " : ""}${ed.kind}</span></div>
      <span style="flex:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--fg-muted)">✕</span></div>`;
    const inner = ed.ro
      ? `${head}<div style="display:flex;flex-direction:column;gap:6px"><span class="ce-lab">Now</span><div class="ce-now" style="color:var(--fg)">${ed.now}</div></div>
         <div style="display:flex;gap:10px;padding:11px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken,var(--bg));font-size:13.5px;line-height:1.55;color:var(--fg-body)"><span>🔒</span><span>A theme name from EDHREC’s list, not the app’s wording, so it can’t be changed here. Card names in demo decks read the same way.</span></div>
         <div style="font-size:12.5px;line-height:1.5;color:var(--fg-muted)">The other read-only kind is text marked <span class="ce-m" style="color:var(--fg-body)">edit in code</span>, such as the “White and Blue” join: its reason names the helper that builds it.</div>
         <div style="display:flex;justify-content:flex-end;gap:8px"><span class="ce-btn">Copy key</span><span class="ce-btn">Close</span></div>`
      : `${head}<div style="display:flex;flex-direction:column;gap:6px"><span class="ce-lab">Now</span><div class="ce-now">${ed.now}</div></div>
         <div style="display:flex;flex-direction:column;gap:6px"><span class="ce-lab">New</span>${ed.body}</div>
         ${ed.help ? `<div style="font-size:12.5px;line-height:1.5">${ed.help}</div>` : ""}
         <div style="font-size:12.5px;line-height:1.5;color:var(--fg-muted)">${ed.rule}</div>
         <div style="display:flex;justify-content:flex-end;gap:8px"><span class="ce-btn">Cancel</span><span class="ce-btn ce-pri ${ed.ok ? "" : "ce-dis"}">Add to edits</span></div>`;
    if (D) {
      const r = ed.el.getBoundingClientRect(); const w = 420;
      const left = Math.min(Math.max(r.left - 8, 80), innerWidth - w - 16);
      const top = r.bottom + 14;
      H(`<div class="ce-card" style="position:absolute;left:${left}px;top:${top}px;width:${w}px;border-radius:14px;padding:16px 18px 16px;display:flex;flex-direction:column;gap:14px;pointer-events:auto">
        <span style="position:absolute;top:-7px;left:${Math.max(18, r.left - left + 16)}px;width:12px;height:12px;transform:rotate(45deg);background:inherit;border-left:1px solid var(--border-strong);border-top:1px solid var(--border-strong)"></span>${inner}</div>`);
    } else {
      H(`<div style="position:absolute;inset:0;background:rgba(8,6,4,.55)"></div>`);
      H(`<div class="ce-card" style="position:absolute;left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:10px 18px 26px;display:flex;flex-direction:column;gap:14px">
        <span style="align-self:center;width:38px;height:4px;border-radius:2px;background:var(--border-strong)"></span>${inner}</div>`);
    }
  }

  // ---- Tray ----
  const rows = [
    ["help-me-choose · intake.title", "Help me choose", "Help me pick"],
    ["help-me-choose · intake.colorsAny", `Any identity that includes ${chip("names")}.`, `Any color identity with ${chip("names")} in it.`],
    ["help-me-choose-history · row.picks", `${chip("n")} pick / ${chip("n")} picks`, `${chip("n")} fit / ${chip("n")} fits`],
  ];
  if (["tray", "submitting", "submitted", "failed"].includes(state)) {
    const busy = state === "submitting", fail = state === "failed", done = state === "submitted";
    const list = rows.map(([k, a, b], i) => {
      const stale = fail && i === 0;
      return `<div class="ce-row" style="${busy ? "opacity:.55;" : ""}${stale ? "border-color:var(--danger);box-shadow:inset 3px 0 0 var(--danger);" : ""}">
        <div style="display:flex;justify-content:space-between;gap:8px"><span class="ce-m" style="font-size:11px;color:var(--fg-faint)">${k}</span>${busy ? "" : `<span style="font-size:12px;color:var(--accent-text)">${stale ? "Redo" : "Edit"} · <span style="color:var(--fg-muted)">Remove</span></span>`}</div>
        <div style="font-size:13px;color:var(--fg-faint);text-decoration:line-through">${a}</div><div style="font-size:14px;color:var(--fg)">${b}</div>
        ${stale ? `<div style="font-size:12.5px;line-height:1.5;color:var(--danger)">Changed on main since this page loaded (now “Help me find a commander”). Reload, then redo this one.</div>` : ""}</div>`;
    }).join("");
    let body;
    if (done) {
      body = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:6px 0 2px">
        <span style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--success) 18%,transparent);color:var(--success);font-size:19px">✓</span>
        <span style="font:600 20px var(--font-display)">Pull request #3301 opened</span>
        <span style="font-size:14px;line-height:1.55;color:var(--fg-body)">3 edits on <span class="ce-m" style="font-size:12.5px">copy-edit-2026-11-24-2245</span>. Staging shows the new wording once it merges; until then this page keeps today’s text.</span>
        <div style="display:flex;gap:8px;margin-top:4px"><span class="ce-btn ce-pri">Open on GitHub ↗</span><span class="ce-btn">Done</span></div></div>`;
    } else {
      const sub = fail
        ? `<div style="display:flex;gap:10px;padding:11px 12px;border-radius:10px;background:color-mix(in srgb,var(--danger) 12%,transparent);border:1px solid color-mix(in srgb,var(--danger) 45%,transparent);font-size:13.5px;line-height:1.5"><span style="color:var(--danger)">⚠</span><span>No pull request opened. One edit is out of date; your edits are kept.</span></div>`
        : `<div style="font-size:13.5px;line-height:1.5;color:var(--fg-muted)">One pull request for all of them. Staging doesn’t change until it merges.</div>`;
      const btn = busy ? `<span class="ce-btn ce-pri"><span class="ce-spin"></span>Opening pull request…</span>` : `<span class="ce-btn ce-pri">${fail ? "Try again" : "Open pull request"}</span>`;
      body = `${sub}<div style="display:flex;flex-direction:column;gap:8px">${list}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-size:13px;color:${busy ? "var(--fg-faint)" : "var(--fg-muted)"}">${busy ? "Checking the rules, then pushing a branch" : "Clear all"}</span>${btn}</div>`;
    }
    const head = `<div style="display:flex;justify-content:space-between;align-items:center"><span style="font:600 19px var(--font-display)">${done ? "Submitted" : "Copy edits · 3"}</span><span style="width:30px;height:30px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--fg-muted)">✕</span></div>`;
    if (D) {
      H(`<div class="ce-card" style="position:absolute;right:24px;bottom:84px;width:420px;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px">${head}${body}</div>`);
    } else {
      H(`<div style="position:absolute;inset:0;background:rgba(8,6,4,.55)"></div>`);
      H(`<div class="ce-card" style="position:absolute;left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:10px 18px 26px;display:flex;flex-direction:column;gap:14px"><span style="align-self:center;width:38px;height:4px;border-radius:2px;background:var(--border-strong)"></span>${head}${body}</div>`);
    }
  }
};
