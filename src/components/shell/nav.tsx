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

// The handoff writes the locked colour as a bare Amonkhet hex, which would
// stay Amonkhet under the other five themes. It is spent here as
// `--fg-locked`, which every theme already defines against its own surfaces.
// Awaiting Design's ratification; the intent is unchanged.

// Decorative, because every locked item already carries the reason in words.
function LockGlyph() {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      fill="none"
      stroke="var(--fg-locked)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.75" y="6.5" width="10.5" height="8" rx="3" />
      <path d="M4.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// NavRail — desktop only (hidden md:flex)
// §Rail container / §Rail Wordmark area / §Rail Nav section / §Rail Account trigger
// ---------------------------------------------------------------------------

// A locked item is not a link — the handoff takes it out of the tab order in
// both chromes, so there is nothing to point an href at. Rendering a <span>
// with role="link" + aria-disabled keeps the name, the role and the unlock
// reason in the accessibility tree without a focus stop or a dead navigation,
// which is what a disabled <Link href="#"> would have been. Discovery is
// covered in visible copy: the first-run checklist cards state the same unlock
// condition on the page itself.
type NavSlotProps = {
  href: NavHref;
  active: boolean;
  className: string;
  children: React.ReactNode;
} & (
  | // A locked slot has no visible label to fall back on in the rail, and in the
  // tab bar its visible label omits the reason — so the name is required, and
  // the union is what stops a future call site from dropping it.
  { isLocked: true; name: string }
  // Unlocked, undefined leaves the name to the visible label, which is what the
  // tab bar wants; the rail passes its label because it shows none.
  | { isLocked: false; name: string | undefined }
);

function NavSlot({ isLocked, href, name, active, className, children }: NavSlotProps) {
  if (isLocked) {
    return (
      // A locked route is still reachable — /collection with no cards renders
      // its empty state rather than redirecting — so a locked slot can be the
      // current page, and saying so is orthogonal to saying it cannot be
      // followed.
      <span
        role="link"
        title={name}
        aria-label={name}
        aria-disabled="true"
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      title={name}
      aria-label={name}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}

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
      className="hidden md:flex md:flex-col items-center w-[62px] shrink-0 h-screen sticky top-0 z-30 py-[14px]"
      style={{
        background: "var(--surface-rail)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* The app mark — 26px, rotated 45°, 4px radius, 1.5px --accent, and 16px
          of air under it. Once, at the top: it is the mark, not a nav item
          (CHROME §The rail). */}
      <span
        data-nav-diamond
        aria-hidden
        className="block h-[26px] w-[26px] rotate-45 rounded-[4px] mb-4"
        style={{ border: "1.5px solid var(--accent)" }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Nav section — icon-only, 38px squares, 4px apart                    */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex flex-col items-center gap-1" aria-label="Primary">
        {ITEMS.map(({ href, label, lockable }) => {
          const isLocked = locked && lockable;
          // Read off the pathname alone. A locked slot can be the current page,
          // and that is a fact about where the reader is, not about whether the
          // slot can be followed; the fill below still lets locked win.
          const active = isActive(pathname, href);
          // Spread rather than two props: the union needs `isLocked` narrowed to
          // a literal before it can vouch for `name`, and a boolean prop is not.
          const slot = isLocked
            ? ({ isLocked: true, name: refreshCopy.firstRun.lockedItemAria(label) } as const)
            : ({ isLocked: false, name: label } as const);
          return (
            <NavSlot
              key={href}
              {...slot}
              href={href}
              active={active}
              // Locked is tested first: a locked slot stays inert-looking even
              // on its own route, or the active fill would advertise a
              // destination the reader cannot reach from here.
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-[10px] transition-colors ${
                isLocked
                  ? "bg-transparent text-[color:var(--fg-locked)]"
                  : active
                    ? "bg-elevated text-[color:var(--fg)]"
                    : "bg-transparent text-[color:var(--fg-faint)] hover:bg-elevated-hover"
              }`}
            >
              <NavIcon href={href} />
            </NavSlot>
          );
        })}

        {locked && (
          <>
            {/* 8px of its own on top of the list's 4px gap, per the frame. */}
            <span
              aria-hidden
              className="my-2 block h-px w-[34px]"
              style={{ background: "var(--border)" }}
            />
            <LockGlyph />
          </>
        )}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Account trigger — §Rail: 30px circle, pinned to the bottom.         */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-auto">
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
      // 8px all round with 14px at the bottom for the home indicator, which
      // with the 52px item is exactly --tabbar-h.
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex h-[var(--tabbar-h)] items-center px-2 pt-2 pb-[14px]"
      style={{
        background: "var(--surface-rail)",
        borderTop: "1px solid var(--border)",
      }}
      aria-label="Primary"
    >
      {ITEMS.map(({ href, label, lockable }) => {
        const isLocked = locked && lockable;
        const active = isActive(pathname, href);
        // Unlocked, the visible label is the name; locked, it is replaced by the
        // same label plus the reason it cannot be reached.
        const slot = isLocked
          ? ({ isLocked: true, name: refreshCopy.firstRun.lockedItemAria(label) } as const)
          : ({ isLocked: false, name: undefined } as const);

        return (
          <NavSlot
            key={href}
            {...slot}
            href={href}
            active={active}
            // The active fill is a surface, not a coloured label: locked ruling
            // 13 reserves colour for status. One `color` on the slot serves both
            // the icon (currentColor) and the label.
            // Locked first, as in the rail.
            className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px] ${
              isLocked
                ? "bg-transparent text-[color:var(--fg-locked)]"
                : active
                  ? "bg-[color:var(--surface-inset)] text-[color:var(--fg)]"
                  : "bg-transparent text-[color:var(--fg-faint)]"
            }`}
          >
            <NavIcon href={href} />
            <span className="font-mono text-[9px] tracking-[0.06em]">{label}</span>
          </NavSlot>
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
