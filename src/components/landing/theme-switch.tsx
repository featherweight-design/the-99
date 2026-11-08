"use client";

// The landing's theme switch (public landing PR 4a, call 2): `See it in` and six round swatches, the chosen one ringed and
// named. It sets the shipped `the99_theme` cookie with the account menu's own writer (`lib/theme/apply.ts`, a client-side
// `document.cookie` write: a public page reads no cookie on the server) and re-themes the page by `data-theme` on the
// document, so a visitor who signs in keeps what they picked. Each swatch re-binds the tokens inside itself to its own
// theme (`data-theme`, as the picker's miniature does), so no color is typed here.
//
// What is in force is read from the document, not from the server, and followed with a MutationObserver: the server answer
// cannot know the cookie, and the account menu or another tab's write moves the same attribute.

import { useSyncExternalStore, type KeyboardEvent } from "react";
import { landingCopy } from "../../lib/copy/landing";
import { themeCopy } from "../../lib/copy/theme";
import { applyTheme } from "../../lib/theme/apply";
import { DEFAULT_THEME, THEMES, isThemeKey, type ThemeKey } from "../../lib/theme/themes";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const inForce = (): ThemeKey => {
  const painted = document.documentElement.dataset.theme;
  return isThemeKey(painted) ? painted : DEFAULT_THEME;
};

export function ThemeSwitch() {
  // Before hydration the default stands in; the document's own theme replaces it on the first client render.
  const current = useSyncExternalStore(subscribe, inForce, () => DEFAULT_THEME);
  const name = THEMES.find((t) => t.key === current)?.name ?? "";

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + THEMES.length) % THEMES.length;
    e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
    applyTheme(THEMES[next].key);
  }

  return (
    <div data-testid="landing-theme-switch" className="mt-[22px] flex flex-wrap items-center justify-center gap-[10px] md:mt-[20px] md:justify-start">
      <span className="w-full text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] md:mr-[4px] md:w-auto md:text-left">
        {landingCopy.theme.label}
      </span>
      <div role="radiogroup" aria-label={themeCopy.groupLabel} className="flex items-center">
        {THEMES.map(({ key, name: themeName, plane }, i) => {
          const on = key === current;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={themeCopy.optionLabel(themeName, plane)}
              tabIndex={on ? 0 : -1}
              onClick={() => applyTheme(key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="relative flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--accent)]"
            >
              {/* The ring is on this wrapper, in the page's own tokens: the swatch inside re-binds its own. */}
              <span className={`block h-[26px] w-[26px] rounded-full ${on ? "shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--fg)]" : ""}`}>
                <i
                  data-theme={key}
                  aria-hidden="true"
                  className="relative block h-full w-full overflow-hidden rounded-full border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)]"
                >
                  <span className="absolute inset-y-0 right-0 w-1/2 bg-[color:var(--accent)]" />
                </i>
              </span>
            </button>
          );
        })}
      </div>
      <span role="status" className="text-[13px] text-[color:var(--fg-body)]">{name}</span>
    </div>
  );
}
