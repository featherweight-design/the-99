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

import { useRef, useState, type RefObject } from "react";
import { themeCopy } from "../../lib/copy/theme";
import {
  RETIRED_THEMES,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEMES,
  isRetiredThemeKey,
  isThemeKey,
  type ThemeKey,
} from "../../lib/theme/themes";

type PanelKind = "popover" | "sheet";

/**
 * The miniature: canvas, panel with "99" set in the theme's display face, an
 * accent bar and the chrome beside it. Full-width at 46px tall in the popover;
 * a fixed 52×38 thumbnail in the sheet, where the label sits alongside.
 */
export function ThemeMiniature({ theme, compact, selected }: { theme: ThemeKey; compact: boolean; selected: boolean }) {
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
 * The retirement notice, or nothing. Read from the cookie rather than threaded
 * down from the layout: the persisted value is the only thing that distinguishes
 * an affected user, and `theme` is already five components deep.
 *
 * Writing the survivor over the retired id is what dismisses this permanently —
 * so is choosing any theme, since both go through `applyTheme`. That is the
 * whole of "persist the dismissal": no second key, and no way for the two to
 * disagree.
 */
function retirementNotice() {
  if (typeof document === "undefined") return null;
  const persisted = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${THEME_COOKIE}=`))
    ?.slice(THEME_COOKIE.length + 1);
  if (!isRetiredThemeKey(persisted)) return null;
  const { was, survivor } = RETIRED_THEMES[persisted];
  return { was, survivor, nowCalled: THEMES.find((t) => t.key === survivor)!.name };
}

/**
 * What the app is wearing right now, which is not always what the server said.
 * The account menu unmounts the picker when it closes, so a second opening
 * remounts it against a `current` prop that was resolved on the last navigation
 * — before any choice made in the first opening. The document attribute is the
 * live truth, since `applyTheme` is what writes it.
 */
export function themeInForce(fallback: ThemeKey): ThemeKey {
  if (typeof document === "undefined") return fallback;
  const painted = document.documentElement.dataset.theme;
  return isThemeKey(painted) ? painted : fallback;
}

export function ThemePicker({
  current,
  panel = "popover",
  selectedChipRef,
}: {
  current: ThemeKey;
  panel?: PanelKind;
  /**
   * The checked chip, handed back to the hosting panel so it can be the panel's
   * initial focus. Without it the panel falls back to the first focusable in DOM
   * order, which the retirement notice's ✕ would otherwise become — a menu that
   * opens with "Dismiss" selected, one Enter away from a user losing the notice
   * they had not read yet.
   */
  selectedChipRef?: RefObject<HTMLElement | null>;
}) {
  const [selected, setSelected] = useState<ThemeKey>(() => themeInForce(current));
  const [announcement, setAnnouncement] = useState("");
  // Read at mount rather than in an effect. The account menu renders this only
  // once `open` is true, which is client state starting false — so the picker
  // never appears in server output and there is no hydration pass to mismatch.
  const [notice, setNotice] = useState(retirementNotice);
  const ownChipRef = useRef<HTMLElement | null>(null);
  const chipRef = selectedChipRef ?? ownChipRef;
  const compact = panel === "sheet";

  function choose(key: ThemeKey, name: string) {
    setSelected(key);
    applyTheme(key);
    setNotice(null);
    setAnnouncement(themeCopy.applied(name));
  }

  function dismissNotice(survivor: ThemeKey) {
    applyTheme(survivor);
    setNotice(null);
    // The button that ran this unmounts with the notice. Hand focus to the
    // checked chip rather than let it fall to the body, which would drop the
    // user out of the panel's focus trap mid-Tab.
    chipRef.current?.focus();
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
      {notice && (
        <div className="mx-1 mb-2 flex items-start gap-2 rounded-[8px] bg-[color:var(--surface-raised)] p-[10px] text-[11.5px] leading-[1.35] text-[color:var(--fg-body)]">
          <p className="m-0 min-w-0 flex-1">
            <strong className="font-semibold text-[color:var(--fg)]">
              {themeCopy.retired.headline(notice.was)}
            </strong>{" "}
            {themeCopy.retired.body(notice.nowCalled)}
          </p>
          <button
            type="button"
            aria-label={themeCopy.retired.dismiss}
            onClick={() => dismissNotice(notice.survivor)}
            // Negative margin so a 44px touch target does not force the line
            // taller than its text: the hit area grows, the footprint does not.
            className={`flex shrink-0 items-center justify-center rounded-[6px] leading-none text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors ${
              compact ? "-m-[10px] h-[44px] w-[44px]" : "-m-[5px] h-[26px] w-[26px]"
            }`}
          >
            ✕
          </button>
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={themeCopy.groupLabel}
        className={`grid ${compact ? "grid-cols-2 gap-[10px]" : "grid-cols-3 gap-2"}`}
      >
        {THEMES.map(({ key, name, plane, short }, i) => {
          const isSelected = key === selected;
          return (
            <button
              key={key}
              ref={
                isSelected
                  ? (el) => {
                      chipRef.current = el;
                    }
                  : undefined
              }
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
                  : "hover:bg-[color:var(--surface-raised)] transition-colors"
              }`}
            >
              <ThemeMiniature theme={key} compact={compact} selected={isSelected} />
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span
                  className={`truncate font-medium leading-[1.25] ${
                    isSelected ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"
                  }`}
                  style={{ fontSize: compact ? 12.5 : 10.5 }}
                >
                  {name}
                </span>
                <span
                  // The canvas paints this --fg-locked, which is a 3:1 token
                  // meant for struck-through chrome. At 8.5px that is not
                  // readable text; --fg-muted holds 4.5:1 in all six.
                  className="truncate font-mono leading-[1.2] tracking-[0.04em] text-[color:var(--fg-muted)]"
                  style={{ fontSize: compact ? 9 : 8.5 }}
                >
                  {short}
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
