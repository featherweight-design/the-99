"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./account-menu";
import { NavIcon, type NavHref } from "./nav-icons";
import { Crowned99 } from "../marks";
import { refreshCopy } from "../../lib/copy/refresh";
import type { ThemeKey } from "../../lib/theme/themes";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

type NavItem = {
  href: NavHref;
  label: string;
  lockable: boolean; // Home is never locked; Collection/Commanders/Decks are.
};

// Adjudication #1 (no <Mark> icons in rail nav items — Diamond + label ONLY) was
// RETIRED by the 2026-09-07 refresh, on client instruction. The reason it
// existed still holds where it was made: the Mark inside a nav row was a second
// logo. A 19px stroke glyph is not the Mark, and at 62px the rail has no room
// for labels — so the labels moved into aria-label + title instead of coming
// out. See design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md.
// If the ruling is ever reinstated, the rail widens to hold labels and the
// icons come out. A 62px rail with labels is not a third option.
const ITEMS: NavItem[] = [
  { href: "/",           label: "Home",       lockable: false },
  { href: "/collection", label: "Collection", lockable: true  },
  { href: "/commanders", label: "Commanders", lockable: true  },
  { href: "/decks",      label: "Decks",      lockable: true  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ---------------------------------------------------------------------------
// Lock glyph — the one padlock under the rail's locked items
// ---------------------------------------------------------------------------

// Decorative, because every locked item already carries the reason in words.
function LockGlyph() {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      fill="none"
      stroke="var(--fg-faint)"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-2"
    >
      <rect x="2.25" y="6.75" width="9.5" height="7.5" rx="1.5" />
      <path d="M4.5 6.75V4.75a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// NavRail — desktop only (hidden md:flex)
// §Rail container / §Rail Wordmark area / §Rail Nav section / §Rail Account trigger
// ---------------------------------------------------------------------------

export function NavRail({ locked, theme }: { locked: boolean; theme: ThemeKey }) {
  const pathname = usePathname();

  return (
    <aside
      // `sticky` makes this a stacking context, so the account popover's own
      // z-index cannot lift it past the main column — the rail as a whole has
      // to outrank that column, or content with any positive z-index (the
      // collection filter bar, a rec card's overlay) paints over the open menu.
      // Below the tab bar, the menu backdrop and the modals, which all sit at
      // 40 or above.
      className="hidden md:flex md:flex-col w-[62px] shrink-0 h-screen sticky top-0 z-30"
      style={{
        background: "var(--surface-rail)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* The app mark — 26px, rotated 45°, 1.5px --accent. Once, at the top:
          it is the mark, not a nav item (CHROME §The rail). */}
      <div className="flex justify-center pt-4 pb-4">
        <span
          data-nav-diamond
          aria-hidden
          className="block h-[26px] w-[26px] rotate-45"
          style={{ border: "1.5px solid var(--accent)" }}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Nav section — icon-only, 38px squares, 4px apart                    */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex flex-col items-center gap-1 px-3" aria-label="Primary">
        {ITEMS.map(({ href, label, lockable }) => {
          const isLocked = locked && lockable;
          const active = !isLocked && isActive(pathname, href);
          const name = isLocked ? refreshCopy.firstRun.lockedItemAria(label) : label;
          return (
            <Link
              key={href}
              href={isLocked ? "#" : href}
              title={name}
              aria-label={name}
              aria-current={active ? "page" : undefined}
              aria-disabled={isLocked ? "true" : undefined}
              onClick={isLocked ? (e) => e.preventDefault() : undefined}
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-[10px] transition-colors ${
                active
                  ? "bg-elevated text-[color:var(--fg)]"
                  : "bg-transparent text-[color:var(--fg-faint)]"
              } ${isLocked ? "cursor-default" : "hover:bg-elevated-hover"}`}
            >
              <NavIcon href={href} />
            </Link>
          );
        })}

        {locked && (
          <>
            <span className="mt-2 block h-px w-[34px]" style={{ background: "var(--border)" }} />
            <LockGlyph />
          </>
        )}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Account trigger — §Rail: Account trigger row                        */}
      {/* mt-auto; outer padding 14px 12px. #35 replaced the pill with the     */}
      {/* avatar-only trigger, so the row is now just the 38px box.           */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-auto flex py-[14px] px-3">
        <AccountMenu panel="popover" theme={theme} />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// TabBar — mobile only (md:hidden, fixed bottom)
// §Tab bar container / §Tab item Active / §Tab item Idle
// ---------------------------------------------------------------------------

export function TabBar({ locked }: { locked: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      // Held to --tabbar-h rather than sized by its contents: the bar is fixed,
      // so every surface that has to sit clear of it reserves that height by
      // hand, and an intrinsic height gives them nothing exact to reserve.
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex h-[var(--tabbar-h)] items-center px-[6px] pt-[10px] pb-[22px]"
      style={{
        background: "var(--surface-rail)",
        borderTop: "1px solid var(--border-strong)",
      }}
      aria-label="Primary"
    >
      {ITEMS.map(({ href, label, lockable }) => {
        const isLocked = locked && lockable;
        const active = !isLocked && isActive(pathname, href);
        const name = isLocked ? refreshCopy.firstRun.lockedItemAria(label) : label;

        return (
          <Link
            key={href}
            href={isLocked ? "#" : href}
            aria-label={isLocked ? name : undefined}
            aria-current={active ? "page" : undefined}
            aria-disabled={isLocked ? "true" : undefined}
            onClick={isLocked ? (e) => e.preventDefault() : undefined}
            // The active fill is a surface, not a coloured label: locked ruling
            // 13 reserves colour for status.
            className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-[5px] rounded-[12px] ${
              active ? "bg-[color:var(--surface-inset)]" : "bg-transparent"
            } ${isLocked ? "cursor-default" : ""}`}
          >
            <span style={{ color: active ? "var(--fg)" : "var(--fg-faint)" }}>
              <NavIcon href={href} />
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.06em",
                color: active ? "var(--fg)" : "var(--fg-faint)",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// MobileHeader — mobile only (md:hidden)
// §Mobile Top Header / §Mobile Wordmark
// ---------------------------------------------------------------------------

export function MobileHeader({ theme }: { theme: ThemeKey }) {
  return (
    <header
      className="md:hidden flex items-center justify-between px-5 pt-5 pb-[14px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Wordmark: gap 3px, items-end */}
      <div className="flex items-end gap-[3px]">
        {/* "THE": mono 9px, 0.4em tracking, accent, pb 4px */}
        <span
          className="pb-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.4em",
            color: "var(--accent)",
          }}
        >
          THE
        </span>
        {/* Adjudication #1: variant="mobile-header" (5/7/5px diamonds, 24px numeral) */}
        <Crowned99 variant="mobile-header" />
      </div>

      {/* Avatar — §Mobile top-right avatar trigger: 38×38px, br 12px, accent border */}
      <AccountMenu panel="sheet" theme={theme} />
    </header>
  );
}
