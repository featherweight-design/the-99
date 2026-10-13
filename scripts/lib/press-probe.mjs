// In-page timing for a press, read back by measure-load.mjs. Each probe is passed to `page.evaluate`, so
// it is serialized and runs in the page: it must close over nothing outside itself.
//
// Why in the page: Playwright's own waits re-check on a backoff that reaches 500ms, so a figure taken
// as "the harness's clock when its wait returned" is quantized. The card press read as ~230, ~330 or
// ~830ms, a false "slow mode" in 2 of 7 runs, where a trace of every run showed the dialog at 204-338ms
// (2026-10-13).

/**
 * Arms one card press's timing, in the page: the press's pointerdown (a capture listener, so nothing
 * the app does first can delay it), then the first animation frame holding the details dialog, then
 * the first holding its art. Read back as `window.__press`.
 */
export const PRESS_PROBE = () => {
  const stamps = { at: null, dialog: null, art: null };
  window.__press = stamps;
  window.addEventListener("pointerdown", () => { stamps.at ??= performance.now(); }, { capture: true, once: true });
  const tick = () => {
    if (window.__press !== stamps) return;
    const d = document.querySelector('[role="dialog"][aria-labelledby="card-modal-title"]');
    if (stamps.at != null && d) {
      stamps.dialog ??= performance.now();
      if ([...d.querySelectorAll("*")].some((el) => /scryfall/.test(getComputedStyle(el).backgroundImage))) {
        stamps.art = performance.now();
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/**
 * Arms one client navigation's timing, in the page: from the press (`at` given, for a push the
 * harness makes itself, or else the next pointerdown) to the first animation frame where the
 * destination's path is current and `<main>` holds content rather than a loading screen. Read back
 * as `window.__nav`. In the page so the figure carries no harness round trip and no polling interval,
 * and so it starts at the press itself rather than at whenever the harness's next command ran.
 */
export const NAV_PROBE = ({ path, at }) => {
  const stamps = { at: at ?? null, drew: null };
  window.__nav = stamps;
  if (at == null) window.addEventListener("pointerdown", () => { stamps.at ??= performance.now(); }, { capture: true, once: true });
  const tick = () => {
    if (window.__nav !== stamps) return;
    const main = document.querySelector("main");
    if (
      stamps.at != null && location.pathname === path && main &&
      !main.querySelector('[role="status"][class*="min-h-[420px]"]') && main.innerText.trim().length > 40
    ) {
      stamps.drew = performance.now();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/**
 * Arms one Analysis-tab press's timing, in the page: the press's pointerdown, then the first frame
 * where the tab's panel is no longer busy and holds the Tuning hub's landing. The hub itself, not just
 * any text under a settled panel: a build that has not yet drawn the Tuning tools must not read as
 * done. Read back as `window.__tab`.
 */
export const TAB_PROBE = () => {
  const stamps = { at: null, drew: null };
  window.__tab = stamps;
  window.addEventListener("pointerdown", () => { stamps.at ??= performance.now(); }, { capture: true, once: true });
  const tick = () => {
    if (window.__tab !== stamps) return;
    const panel = document.getElementById("panel-analysis");
    if (stamps.at != null && panel && !panel.hasAttribute("aria-busy") && panel.querySelector("[data-tuning-hub]")) {
      stamps.drew = performance.now();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
