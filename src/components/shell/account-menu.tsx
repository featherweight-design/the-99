"use client";
// AccountMenu — #35 branded account menu, replacing Clerk's stock <UserButton>
// dropdown. One trigger component serves all three call sites (rail foot,
// mobile header, /commanders mobile header); the `panel` prop says which
// surface it opens, because each call site is already breakpoint-gated and
// therefore only ever reaches one of them.
//
// Property table: docs/superpowers/design-tables/user-menu.md
// Corrections from design/design_handoff_the99_user_menu/READINESS.md are
// applied here and marked RD§n; the handoff itself is left verbatim.

import { useEffect, useId, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useDialogA11y } from "../../lib/a11y/dialog";
import Link from "next/link";
import { shellCopy } from "../../lib/copy/shell";
import { aboutMenuCopy } from "../../lib/copy/about";
import { accountIdentity, type AccountIdentity } from "../../lib/shell/identity";
import { ThemePicker } from "./theme-picker";
import type { ThemeKey } from "../../lib/theme/themes";

const { manageAccount, signOut: signOutLabel, triggerLabel } = shellCopy.accountMenu;

// About sits first and carries no badge, at any width, ever: the sheet is the
// notification (the redirect, while ABOUT_SHEET_ENABLED is off), so a dot here
// would announce a thing the reader has already been shown.
const aboutLabel = aboutMenuCopy.label;

type PanelKind = "popover" | "sheet";

/** 6×6 rotated diamond that leads each menu item. Decorative (X8). */
function ItemDiamond({ danger }: { danger?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block h-[6px] w-[6px] shrink-0 rotate-45"
      style={{ background: danger ? "var(--danger)" : "var(--accent)" }}
    />
  );
}

type MenuItemsProps = {
  kind: PanelKind;
  busy: boolean;
  onManage: () => void;
  onSignOut: () => void;
  /** The About row navigates client-side, so the panel has to be dismissed on
   *  the way out — otherwise the popover, or the sheet with its backdrop and
   *  focus trap, stays mounted over the destination. */
  onClose: () => void;
};

/**
 * The two `role="menuitem"` children, shared by both panels. Roving focus:
 * exactly one item is tabbable at a time and ↑/↓ move between them with wrap
 * (X11). Table ambiguity 3 — the handoff specs hover but no roving-focus
 * visual, so focus reuses the hover background rather than inventing one.
 */
function MenuItems({ kind, busy, onManage, onSignOut, onClose }: MenuItemsProps) {
  const popover = kind === "popover";
  const [active, setActive] = useState(0);
  // One ref per item, sized from the list rather than written out: the row
  // count was two for this menu's whole life and is three now, and a modulo
  // hard-coded to the old count wraps focus into the wrong row silently.
  const aboutRef = useRef<HTMLAnchorElement>(null);
  const manageRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);
  // Typed as the common supertype so one `move` can focus any of them; the
  // rows are not the same element and the focus model does not care.
  const refs: React.RefObject<HTMLElement | null>[] = [aboutRef, manageRef, signOutRef];

  function move(delta: number) {
    const next = (active + delta + refs.length) % refs.length;
    setActive(next);
    refs[next].current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    }
  }

  // About is a real link, not a button that routes: it is the one row here
  // that goes somewhere, so it should open in a new tab when a reader asks it
  // to. The other two act on the session and have no URL to offer.
  const rowClass = (i: number) =>
    `flex w-full items-center text-left text-[color:var(--fg)] transition-colors duration-[120ms] hover:bg-[color:var(--elevated)] focus-visible:bg-[color:var(--elevated)] disabled:opacity-60 ${
      popover
        ? "gap-[11px] rounded-lg px-3 py-[11px] text-[14px]"
        : // Sheet rows are divided; the first row has no top rule.
          `gap-3 px-[6px] py-[15px] text-[15px] ${
            i === 0 ? "" : "border-t border-solid border-[color:var(--border)]"
          }`
    }`;

  const buttons = [
    { label: manageAccount, onClick: onManage, danger: false },
    { label: signOutLabel, onClick: onSignOut, danger: true },
  ];

  return (
    <>
      <Link
        ref={aboutRef}
        href="/about"
        role="menuitem"
        tabIndex={active === 0 ? 0 : -1}
        onFocus={() => setActive(0)}
        onKeyDown={onKeyDown}
        // `aria-disabled` ANNOUNCES the state; it does not enforce it, and an
        // anchor has no `disabled`. Both halves are needed or the row says it
        // is unavailable and navigates anyway, racing the sign-out it claims
        // to be waiting for.
        aria-disabled={busy || undefined}
        onClick={(e) => {
          if (busy) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
        className={rowClass(0)}
      >
        <ItemDiamond />
        <span>{aboutLabel}</span>
      </Link>
      {buttons.map((item, i) => (
        <button
          key={item.label}
          ref={i === 0 ? manageRef : signOutRef}
          type="button"
          role="menuitem"
          tabIndex={active === i + 1 ? 0 : -1}
          disabled={busy}
          onFocus={() => setActive(i + 1)}
          onKeyDown={onKeyDown}
          onClick={item.onClick}
          className={rowClass(i + 1)}
        >
          <ItemDiamond danger={item.danger} />
          <span>{item.label}</span>
        </button>
      ))}
    </>
  );
}

type PanelProps = MenuItemsProps & {
  identity: AccountIdentity;
  panelId: string;
  nameId: string;
  theme: ThemeKey;
  onClose: () => void;
};

/** Desktop popover (S5). No backdrop and no scroll lock — a menu, not a modal. */
function AccountPopover(props: PanelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLElement | null>(null);
  useDialogA11y(ref, props.onClose, { lockScroll: false, initialFocusRef: chipRef });

  return (
    <div
      ref={ref}
      // 300px, not the 216px this menu shipped at: §C draws the picker's 3-up
      // grid inside a 300px popover, and at 216px the three chips fall to 61px,
      // which no theme name survives.
      className="anim-menu-in absolute bottom-[calc(100%+8px)] left-0 z-20 w-[300px] p-2"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="flex items-center gap-3"
        style={{ padding: "12px 12px 14px", borderBottom: "1px solid var(--border)" }}
      >
        <Avatar identity={props.identity} size={44} radius={12} fontSize={14} />
        <div className="min-w-0">
          <div
            id={props.nameId}
            className="truncate font-semibold"
            style={{ fontSize: 14, color: "var(--fg)" }}
          >
            {props.identity.name}
          </div>
          {props.identity.email && (
            <div
              className="truncate font-mono"
              // RD§1: the handoff's --fg-faint is 4.42:1 here and fails AA.
              // --fg-muted is 8.48:1. Do not fix this by enlarging the text.
              style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}
            >
              {props.identity.email}
            </div>
          )}
        </div>
      </div>
      {/* Neither the identity header nor the picker is a menu item, so both sit
          outside role="menu" rather than as foreign content inside it — the same
          split the sheet makes with its dialog wrapper. A radiogroup in
          particular cannot legally live inside a menu. */}
      <ThemePicker current={props.theme} panel="popover" selectedChipRef={chipRef} />
      <div
        id={props.panelId}
        role="menu"
        aria-labelledby={props.nameId}
        className="mt-[12px] flex flex-col gap-[2px] pt-[10px]"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <MenuItems {...props} />
      </div>
    </div>
  );
}

/** Mobile bottom sheet (S8) + its backdrop (S9). */
function AccountSheet(props: PanelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLElement | null>(null);
  useDialogA11y(ref, props.onClose, { initialFocusRef: chipRef });

  return (
    <>
      <div
        // A visual dismiss target only — the sheet carries the semantics.
        aria-hidden
        // z-45, not z-40: TabBar is z-40 and paints later in the DOM, so an
        // equal layer would leave the tab bar sitting on top of the backdrop.
        className="anim-backdrop-in fixed inset-0 z-[45]"
        // RD§5 gives a fixed near-black at 0.72. Every shipped overlay mixes the
        // canvas at that alpha instead, so a lighter theme dims rather than blackens.
        style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }}
        onClick={props.onClose}
      />
      {/* `aria-modal` is only valid on a dialog, so the sheet is a modal dialog
          that contains the menu rather than a menu claiming to be modal. Same
          semantics the handoff asks for (X7), expressed legally. */}
      <div
        ref={ref}
        id={props.panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.nameId}
        className="anim-sheet-up fixed inset-x-0 bottom-0 z-50"
        style={{
          // RD§2: the handoff gives a bare surface hex; that is --surface.
          background: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          borderRadius: "20px 20px 0 0",
          // The 26px bottom pad sits on top of the safe area, not instead of it.
          padding: "20px 20px calc(26px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          aria-hidden
          className="mx-auto mb-5 h-1 w-10 rounded-[2px]"
          style={{ background: "var(--border-strong)" }}
        />
        <div
          className="flex items-center gap-[14px]"
          style={{ paddingBottom: 18, borderBottom: "1px solid var(--border)" }}
        >
          <Avatar identity={props.identity} size={48} radius={14} fontSize={15} />
          <div className="min-w-0">
            <div
              id={props.nameId}
              className="truncate font-semibold"
              style={{ fontSize: 16, color: "var(--fg)" }}
            >
              {props.identity.name}
            </div>
            {props.identity.email && (
              <div
                className="truncate font-mono"
                // 4.57:1 on --surface — passes, so left as specified (RD§1).
                style={{ fontSize: 12, color: "var(--fg-faint)", marginTop: 2 }}
              >
                {props.identity.email}
              </div>
            )}
          </div>
        </div>
        <ThemePicker current={props.theme} panel="sheet" selectedChipRef={chipRef} />
        <div
          role="menu"
          aria-labelledby={props.nameId}
          className="mt-[14px] flex flex-col pt-[10px]"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <MenuItems {...props} />
        </div>
      </div>
    </>
  );
}

function Avatar({
  identity,
  size,
  radius,
  fontSize,
}: {
  identity: AccountIdentity;
  size: number;
  radius: number;
  fontSize: number;
}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center font-mono"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize,
        background: "var(--bg)",
        border: "1px solid var(--accent)",
        color: "var(--accent)",
      }}
    >
      {identity.initials}
    </span>
  );
}

export function AccountMenu({ panel, theme }: { panel: PanelKind; theme: ThemeKey }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useUser();
  const clerk = useClerk();
  const panelId = useId();
  const nameId = useId();

  const identity = accountIdentity({
    firstName: user?.firstName,
    lastName: user?.lastName,
    fullName: user?.fullName,
    email: user?.primaryEmailAddress?.emailAddress,
  });

  function close() {
    setOpen(false);
  }

  // Table ambiguity 13: the menu dismisses before Clerk's modal mounts, so the
  // focus trap is handed over rather than nested. useDialogA11y returns focus
  // to the trigger on unmount, which is where the handoff wants it after the
  // modal closes too (X14).
  function onManage() {
    close();
    clerk.openUserProfile();
  }

  // A successful sign-out navigates away, so `busy` is only ever released on
  // failure — without that release the menu stays dead until a reload.
  function onSignOut() {
    setBusy(true);
    void clerk.signOut().catch(() => setBusy(false));
  }

  const label = triggerLabel(identity.name);
  const isPopover = panel === "popover";
  const wrapperRef = useRef<HTMLDivElement>(null);

  // The popover has no backdrop, so an outside press is what dismisses it
  // (N11). Scoped to the whole wrapper rather than the panel alone: a press on
  // the trigger must reach the trigger's own toggle instead of being closed
  // here and immediately re-opened. pointerdown rather than click so a
  // touch-capable desktop dismisses on the same gesture (table ambiguity 17).
  useEffect(() => {
    if (!isPopover || !open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isPopover, open]);

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Open-state marker: 4px accent diamond 6px above the trigger, desktop
          only. Absolutely positioned so opening the menu doesn't shift the
          trigger (table ambiguity 8), and centred on the 38px box rather than
          the mock's 62px wrapper (ambiguity 9 — the prose wins). 18px = the 3px
          pad ring plus half the 30px circle. */}
      {isPopover && open && (
        <span
          aria-hidden
          className="absolute bottom-[calc(100%+6px)] left-[18px] h-1 w-1 -translate-x-1/2 rotate-45"
          style={{ background: "var(--accent)" }}
        />
      )}
      <button
        type="button"
        // The sheet is a modal dialog wrapping the menu, so the trigger has to
        // announce what it actually opens.
        aria-haspopup={isPopover ? "menu" : "dialog"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        // Visual box inside a 3px pad ring (X15). The ring also keeps the focus
        // outline clear of the adjacent border.
        className="group block cursor-pointer p-[3px]"
      >
        {/* Hover and pressed are one state (N2): colour only, no scale. Open
            wins over hover, so its classes are applied instead of alongside.

            The rail wears the 2026-09-07 refresh's 30px circle on --surface
            over a --border-strong hairline; the mobile header keeps #35's 38px
            accent square, which that refresh does not redraw. 30 + the 3px ring
            is 36px, still clear of the refresh's 32px desktop target floor. */}
        <span
          // X4: the glyphs are decoration; aria-label on the button is the name.
          aria-hidden
          className={`flex items-center justify-center border border-solid font-mono transition-colors duration-[120ms] ${
            isPopover
              ? "h-[30px] w-[30px] rounded-full text-[11px]"
              : "h-[38px] w-[38px] rounded-[12px] text-[13px]"
          } ${
            open
              ? "bg-[color:var(--elevated)] border-[color:var(--accent-hover)] text-[color:var(--accent-hover)]"
              : isPopover
                ? "bg-[color:var(--surface)] border-[color:var(--border-strong)] text-[color:var(--fg-muted)] group-hover:border-[color:var(--accent-hover)] group-hover:text-[color:var(--accent-hover)]"
                : "bg-[color:var(--bg)] border-[color:var(--accent)] text-[color:var(--accent)] group-hover:bg-[color:var(--surface-raised)] group-hover:border-[color:var(--accent-hover)] group-hover:text-[color:var(--accent-hover)]"
          }`}
        >
          {identity.initials}
        </span>
      </button>
      {open &&
        (isPopover ? (
          <AccountPopover
            kind="popover"
            identity={identity}
            theme={theme}
            panelId={panelId}
            nameId={nameId}
            busy={busy}
            onClose={close}
            onManage={onManage}
            onSignOut={onSignOut}
          />
        ) : (
          <AccountSheet
            kind="sheet"
            identity={identity}
            theme={theme}
            panelId={panelId}
            nameId={nameId}
            busy={busy}
            onClose={close}
            onManage={onManage}
            onSignOut={onSignOut}
          />
        ))}
    </div>
  );
}
