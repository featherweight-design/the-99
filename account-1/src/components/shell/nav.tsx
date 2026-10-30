"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import { Crowned99 } from "../marks";
import { shellCopy } from "../../lib/copy/shell";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

type NavItem = {
  href: "/" | "/collection" | "/commanders" | "/decks";
  label: string;
  lockable: boolean; // Home is never locked; Collection/Commanders/Decks are.
};

// Adjudication #1: no <Mark> icons inside rail nav items — Diamond + label ONLY.
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
// Diamond bullet — active/idle/locked states per §Rail Nav item rows
// ---------------------------------------------------------------------------

/**
 * 6×6px rotated diamond for rail nav items (§Rail Nav item Active/Idle/Locked).
 * Active  → brass (#C9A24B, token: --brass)
 * Idle    → line  (#3A3229, token: --border-strong)
 * Locked  → line  (#3A3229, token: --border-strong)
 */
function RailDiamond({ active, locked }: { active: boolean; locked: boolean }) {
  const bg =
    !locked && active
      ? "var(--brass)"        // §Rail Nav item Active: diamond color accent
      : "var(--border-strong)"; // §Rail Nav item Idle + Locked: diamond color line
  return (
    <span
      aria-hidden
      className="inline-block h-[6px] w-[6px] shrink-0 rotate-45"
      style={{ background: bg }}
    />
  );
}

/**
 * 8×8px rotated diamond for tab bar items (§Tab item Active/Idle).
 * Active  → brass  (#C9A24B)
 * Idle    → #4A4033 (raw hex, no token per design table)
 * Locked  → #4A4033
 */
function TabDiamond({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block h-[8px] w-[8px] shrink-0 rotate-45"
      style={{ background: active ? "var(--brass)" : "#4A4033" }}
    />
  );
}

// ---------------------------------------------------------------------------
// NavRail — desktop only (hidden md:flex)
// §Rail container / §Rail Wordmark area / §Rail Nav section / §Rail Account trigger
// ---------------------------------------------------------------------------

export function NavRail({ locked }: { locked: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex md:flex-col w-[236px] shrink-0 h-screen sticky top-0"
      style={{
        background: "var(--surface-rail)",       // #1A160F
        borderRight: "1px solid var(--border-strong)", // #3A3229 (token: line)
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Wordmark — §Rail: Wordmark area                                     */}
      {/* padding: 22px 20px 20px; border-bottom: 1px solid #2A241D (elevated)*/}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex items-end gap-[7px] px-5 pt-[22px] pb-5"
        style={{ borderBottom: "1px solid var(--border)" }} // var(--border) = #2A241D = elevated
      >
        {/* "THE" label: mono 10px, 0.42em tracking, brass, pb 5px */}
        <span
          className="pb-[5px]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.42em",
            color: "var(--brass)",
          }}
        >
          THE
        </span>
        {/* Adjudication #1: variant="rail" (6/8/6px diamonds, 30px numeral) */}
        <Crowned99 variant="rail" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Nav section — §Rail: Nav section                                    */}
      {/* padding: 16px 12px; flex-col; gap: 4px                             */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Primary">
        {/* §Rail: Nav group label ("Play") — mono 10px, 0.18em, uppercase, faint */}
        <div
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--fg-faint)",
            padding: "6px 12px 8px",
          }}
        >
          Play
        </div>
        {ITEMS.map(({ href, label, lockable }) => {
          const isLocked = locked && lockable;
          const active = !isLocked && isActive(pathname, href);

          if (isLocked) {
            // §Rail Nav item — Locked: non-interactive, color #8E8269 (--fg-faint) — lifted for AA per the richness pass
            // Diamond + label ONLY (adjudication #1 — no Mark icon)
            return (
              <div
                key={href}
                className="flex items-center gap-[11px] rounded-lg px-3 py-[10px] text-sm cursor-default"
                style={{ color: "var(--fg-faint)", fontWeight: 500 }}
                // aria-disabled needs a widget role; per ARIA authoring
                // practices, disabled items stay focusable (but inoperable)
                // so AT users can discover them.
                role="link"
                aria-disabled="true"
                tabIndex={0}
              >
                <RailDiamond active={false} locked={true} />
                <span>{label}</span>
              </div>
            );
          }

          // §Rail Nav item — Active / Idle / Hover
          // Active  → bg-elevated text-fg font-semibold
          // Idle    → bg-transparent text-fg-muted font-medium hover:bg-elevated-hover hover:text-fg
          // (--color-elevated-hover = #211C15 per token; matches table's Idle-hover background)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-[11px] rounded-lg px-3 py-[10px] text-sm transition-colors ${
                active
                  ? "bg-elevated text-fg font-semibold"
                  : "bg-transparent text-fg-muted font-medium hover:bg-elevated-hover hover:text-fg"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <RailDiamond active={active} locked={false} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* §Rail: Locked surfaces caption — mono 10px, #8E8269, 4px 12px, lh 1.5 */}
        {locked && (
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-faint)",
              padding: "4px 12px",
              lineHeight: 1.5,
            }}
          >
            {shellCopy.firstRun.railLockedCaption}
          </p>
        )}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Account trigger — §Rail: Account trigger row                        */}
      {/* mt-auto; outer padding 14px 12px; inner: br 14px, p 2px 12px 2px 2px */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-auto py-[14px] px-3">
        <AccountTrigger />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// AccountTrigger — pill wrapper around Clerk's UserButton
// §Rail: Account trigger row + §Rail: Avatar badge.
//
// #31 — the pill visually reads as a click target but only the inner Clerk
// avatar was interactive. Rather than strip the pill (which the §Rail spec
// intends), forward clicks that land on the wrapper surface to the Clerk
// button so the whole affordance opens the menu. Only wrapper-surface clicks
// are forwarded (e.target === e.currentTarget) — clicks that already reach
// the Clerk button/avatar bubble up unchanged, so we don't double-fire and
// re-close the menu.
// ---------------------------------------------------------------------------
function AccountTrigger() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    wrapperRef.current?.querySelector<HTMLButtonElement>("button")?.click();
  }

  return (
    <div
      ref={wrapperRef}
      // §Rail Account trigger — Hover: border-color accent (#C9A24B).
      // cursor-pointer signals the widened click area introduced by #31.
      className="flex items-center gap-3 rounded-[14px] py-[2px] pr-3 pl-[2px] bg-[color:var(--surface-raised)] border border-[color:var(--border-strong)] hover:border-[color:var(--brass)] transition-colors cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) openMenu();
      }}
    >
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox:
              "h-[38px] w-[38px] rounded-[12px] border border-[color:var(--brass)]",
          },
        }}
      />
    </div>
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
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex px-[6px] pt-[10px] pb-[22px]"
      style={{
        background: "var(--surface-rail)",           // #1A160F
        borderTop: "1px solid var(--border-strong)", // #3A3229
      }}
      aria-label="Primary"
    >
      {ITEMS.map(({ href, label, lockable }) => {
        const isLocked = locked && lockable;
        const active = !isLocked && isActive(pathname, href);

        if (isLocked) {
          // §Tab item — Locked: non-interactive, no caption (TabBar has no caption)
          return (
            <div
              key={href}
              className="flex flex-1 flex-col items-center gap-[5px] cursor-default"
              // aria-disabled needs a widget role; per ARIA authoring
              // practices, disabled items stay focusable (but inoperable)
              // so AT users can discover them.
              role="link"
              aria-disabled="true"
              tabIndex={0}
            >
              <TabDiamond active={false} />
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-faint)",
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
            </div>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-[5px]"
            aria-current={active ? "page" : undefined}
          >
            <TabDiamond active={active} />
            <span
              style={{
                fontSize: 10,
                color: active ? "var(--brass)" : "var(--fg-faint)", // #C9A24B / #8E8269
                fontWeight: active ? 600 : 500,
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

export function MobileHeader() {
  return (
    <header
      className="md:hidden flex items-center justify-between px-5 pt-5 pb-[14px]"
      style={{ borderBottom: "1px solid var(--border)" }} // #2A241D (token: elevated)
    >
      {/* Wordmark: gap 3px, items-end */}
      <div className="flex items-end gap-[3px]">
        {/* "THE": mono 9px, 0.4em tracking, brass, pb 4px */}
        <span
          className="pb-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.4em",
            color: "var(--brass)",
          }}
        >
          THE
        </span>
        {/* Adjudication #1: variant="mobile-header" (5/7/5px diamonds, 24px numeral) */}
        <Crowned99 variant="mobile-header" />
      </div>

      {/* Avatar — §Mobile top-right avatar trigger: 38×38px, br 12px, brass border */}
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox:
              "h-[38px] w-[38px] rounded-[12px] border border-[color:var(--brass)]",
          },
        }}
      />
    </header>
  );
}
