(() => { const s = document.querySelector("[data-install-slot]"), card = document.getElementById("card"); if (!s || !card) return;
 const r = s.getBoundingClientRect(), pad = 5;
 const c = { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
 const cut = document.getElementById("cut"); Object.entries({ x: c.x, y: c.y, width: c.w, height: c.h, rx: 14 }).forEach(([k, v]) => cut.setAttribute(k, v));
 Object.assign(document.getElementById("ring").style, { left: c.x + "px", top: c.y + "px", width: c.w + "px", height: c.h + "px", borderRadius: "14px" }); })();
