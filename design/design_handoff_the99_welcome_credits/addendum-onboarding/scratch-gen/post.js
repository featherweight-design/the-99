(() => { const s = document.querySelector("[data-welcome-strip]"), card = document.getElementById("card"); if (!s || !card) return;
 const phone = innerWidth < 768, pad = 8;
 if (phone) { const hd = document.querySelector("header"); const hb = hd && getComputedStyle(hd).position !== "static" ? hd.getBoundingClientRect().bottom : 0; window.scrollTo(0, window.scrollY + s.getBoundingClientRect().top - hb - 14); }
 const r = s.getBoundingClientRect();
 const c = { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
 const cut = document.getElementById("cut"); Object.entries({ x: c.x, y: c.y, width: c.w, height: c.h, rx: 16 }).forEach(([k, v]) => cut.setAttribute(k, v));
 Object.assign(document.getElementById("ring").style, { left: c.x + "px", top: c.y + "px", width: c.w + "px", height: c.h + "px", borderRadius: "16px" });
 if (phone) card.style.bottom = "100px"; else Object.assign(card.style, { left: r.left + "px", top: (r.bottom + 18) + "px" }); })();
