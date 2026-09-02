"use client";

// The theme picker, hosted inline in the account menu (§C, answering handoff
// §9.2 and §9.3). Six miniatures — 3×2 in the desktop popover, 2×3 at a 44px
// minimum in the mobile sheet. No new route, no second sheet, no Save.
//
// A miniature previews the three things a theme actually changes — chrome
// temperature, accent, display face — rather than standing in for them with a
// swatch. It manages that by setting `data-theme` on the miniature itself,
// which re-binds every token inside that box to the theme on offer. The default
// carries its own attribute selector in globals.css for exactly this reason.
// The chip's label and ring stay in the ambient theme, as the canvas draws them:
// the preview is the picture, not the row around it.
//
// Selection is a ring *and* a tick, never colour alone: a picker that says
// "this one" in a colour is unreadable to exactly the people most likely to be
// choosing a theme deliberately.

import { useState } from "react";
import { themeCopy } from "../../lib/copy/theme";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEMES,
  isThemeKey,
  type ThemeKey,
} from "../../lib/theme/themes";

type PanelKind = "popover" | "sheet";

/**
 * The miniature: canvas, panel with "99" set in the theme's display face, an
 * accent bar and the chrome beside it. Full-width at 46px tall in the popover;
 * a fixed 52×38 thumbnail in the sheet, where the label sits alongside.
 */
function Miniature({ theme, compact, selected }: { theme: ThemeKey; compact: boolean; selected: boolean }) {
  return (
    <span
      // Everything inside this box resolves against `theme`, not the theme in force.
      data-theme={theme}
      aria-hidden
      className={`relative block shrink-0 overflow-hidden rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] ${
        compact ? "h-[38px] w-[52px]" : "h-[46px] w-full"
      }`}
    >
      <span
        className={`absolute flex items-center justify-center rounded-[3px] bg-[color:var(--surface)] ${
          compact ? "inset-x-[4px] top-[5px] h-[16px]" : "inset-x-[5px] top-[6px] h-[20px]"
        }`}
      >
        <span
          className="font-display font-bold leading-none text-[color:var(--fg)]"
          style={{ fontSize: compact ? 10 : 12 }}
        >
          99
        </span>
      </span>
      <span
        className={`absolute rounded-[2px] bg-[color:var(--accent)] ${
          compact ? "bottom-[5px] left-[4px] h-1 w-[16px]" : "bottom-[6px] left-[5px] h-1 w-[18px]"
        }`}
      />
      {/* The chrome the accent sits against. Popover only — at 52px wide there
          is no room for a second bar beside the accent. */}
      {!compact && (
        <span className="absolute bottom-[6px] left-[27px] right-[5px] h-1 rounded-[2px] bg-[color:var(--border)]" />
      )}
      {selected && (
        <span
          data-selected-tick
          className="absolute right-[4px] top-[3px] flex h-[13px] w-[13px] items-center justify-center rounded-full bg-[color:var(--accent)] text-[9px] font-bold leading-none text-[color:var(--bg)]"
        >
          ✓
        </span>
      )}
    </span>
  );
}

/**
 * Paint the choice and remember it. Lives outside the component because it
 * touches the document rather than React state, and the compiler's immutability
 * rule rightly objects to that happening in a component's own scope.
 */
function applyTheme(key: ThemeKey) {
  document.documentElement.dataset.theme = key;
  // Secure over HTTPS only: on plain-HTTP localhost the attribute makes the
  // browser drop the cookie outright, so setting it unconditionally would
  // reintroduce the flash of the default theme in development.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${key}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * What the app is wearing right now, which is not always what the server said.
 * The account menu unmounts the picker when it closes, so a second opening
 * remounts it against a `current` prop that was resolved on the last navigation
 * — before any choice made in the first opening. The document attribute is the
 * live truth, since `applyTheme` is what writes it.
 */
function themeInForce(fallback: ThemeKey): ThemeKey {
  if (typeof document === "undefined") return fallback;
  const painted = document.documentElement.dataset.theme;
  return isThemeKey(painted) ? painted : fallback;
}

export function ThemePicker({
  current,
  panel = "popover",
}: {
  current: ThemeKey;
  panel?: PanelKind;
}) {
  const [selected, setSelected] = useState<ThemeKey>(() => themeInForce(current));
  const [announcement, setAnnouncement] = useState("");
  const compact = panel === "sheet";

  function choose(key: ThemeKey, name: string) {
    setSelected(key);
    applyTheme(key);
    setAnnouncement(themeCopy.applied(name));
  }

  // Roving tabindex, per the picker rules: arrows move focus and select in one
  // step. Both axes step by one — a radiogroup treats Right/Down as "next" and
  // Left/Up as "previous" however the options are laid out, so the 3-up and
  // 2-up grids need no separate handling.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + THEMES.length) % THEMES.length;
    const chips = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
    chips?.[next]?.focus();
    choose(THEMES[next].key, THEMES[next].name);
  }

  return (
    <div>
      <p className="m-0 px-1 pb-[6px] pt-[10px] font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">
        {themeCopy.label}
      </p>
      <div
        role="radiogroup"
        aria-label={themeCopy.groupLabel}
        className={`grid ${compact ? "grid-cols-2 gap-[10px]" : "grid-cols-3 gap-2"}`}
      >
        {THEMES.map(({ key, name, plane }, i) => {
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={themeCopy.optionLabel(name, plane)}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => choose(key, name)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`rounded-[10px] text-left transition-colors duration-[120ms] ${
                compact
                  ? "flex min-h-[44px] items-center gap-[11px] p-[10px]"
                  : "flex flex-col gap-[5px] p-[5px]"
              } ${
                isSelected
                  ? "bg-[color:var(--elevated)] outline outline-1 outline-[color:var(--accent)]"
                  : "hover:bg-[color:var(--surface-raised)]"
              }`}
            >
              <Miniature theme={key} compact={compact} selected={isSelected} />
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span
                  className={`truncate font-medium leading-[1.25] ${
                    isSelected ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"
                  }`}
                  style={{ fontSize: compact ? 12.5 : 10.5 }}
                >
                  {name}
                </span>
                {/* The plane before its colon. "Kamigawa: Neon Dynasty" does not
                    fit a 90px chip, and the full name is still what the option
                    is announced as. */}
                <span
                  // The canvas paints this --fg-locked, which is a 3:1 token
                  // meant for struck-through chrome. At 8.5px that is not
                  // readable text; --fg-muted holds 4.5:1 in all six.
                  className="truncate font-mono leading-[1.2] tracking-[0.04em] text-[color:var(--fg-muted)]"
                  style={{ fontSize: compact ? 9 : 8.5 }}
                >
                  {plane.split(":")[0]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
