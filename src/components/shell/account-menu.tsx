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

import { forgetThisDevice } from "../../lib/push/forget-device";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClerk, useUser } from "@clerk/nextjs";
import { clearRecent } from "../../lib/card-search/recent";
import { leaveDialogsForNavigation, useDialogA11y } from "../../lib/a11y/dialog";
import { useMomentHold } from "../../lib/moments/hold";
import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";
import { TargetBox } from "../discovery/targets-provider";
import Link from "next/link";
import { shellCopy } from "../../lib/copy/shell";
import { aboutMenuCopy } from "../../lib/copy/about";
import { adminCopy } from "../../lib/copy/admin";
import { socialCopy } from "../../lib/copy/social";
import { TOUR_HREF, tourAgainCopy } from "../../lib/copy/discovery";
import { accountIdentity, type AccountIdentity } from "../../lib/shell/identity";
import { ThemePicker } from "./theme-picker";
import type { ThemeKey } from "../../lib/theme/themes";
import { usePendingPush } from "./pending-push";
import { CreditChip } from "./credit-chip";
import { chipAction } from "../../app/credits/actions";
import type { ChipState } from "../../lib/payments/chip-rule";
import { heldPaidAction } from "../../app/account/delete-warning-actions";
import { warnsBeforeDelete, type HeldPaid } from "../../lib/payments/held-rule";
import { DeleteWarning } from "../credits/delete-warning";

const { manageAccount, signOut: signOutLabel, triggerLabel, settings: settingsLabel } = shellCopy.accountMenu;

// About sits first and carries no badge, at any width, ever: Home's banner is
// the notification, so a dot here would announce a thing the reader has
// already been shown.
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
  /** Leaves for /about. Owned by `AccountMenu`, which outlives the panel: the press closes the
   *  panel and the link with it, and a link that is gone cannot report its navigation pending. */
  onAbout: () => void;
  /** The admin's environment when this reader holds the door (admin STATES D1), else null: no row. */
  admin: string | null;
  /** Leaves for /admin, as `onAbout` leaves for /about. */
  onAdmin: () => void;
  /** `SOCIAL_FRIENDS_ENABLED` for this reader, decided on the server: the Friends row, else no row. */
  friends: boolean;
  /** Leaves for /friends, as `onAbout` leaves for /about. */
  onFriends: () => void;
  /** Friends is in the bar (`COMMANDERS_PLACE_ENABLED` with `friends`): Settings takes the Friends row's place. */
  settings: boolean;
  /** Leaves for /settings, as `onAbout` leaves for /about. */
  onSettings: () => void;
  /** The credit chip (M1b), or null: absent for a reader who does not see credits. */
  chip: ChipState | null;
  /** Leaves for /credits, as `onAbout` leaves for /about. */
  onCredits: () => void;
  /** Leaves for `/?tour=1`, which starts the tour on Home, as `onAbout` leaves for /about. */
  onTour: () => void;
};

/**
 * The `role="menuitem"` children (About, then Friends and Admin where they are drawn, then the two
 * buttons), shared by both panels. Roving focus:
 * exactly one item is tabbable at a time and ↑/↓ move between them with wrap
 * (X11). Table ambiguity 3 — the handoff specs hover but no roving-focus
 * visual, so focus reuses the hover background rather than inventing one.
 */
function MenuItems({ kind, busy, onManage, onSignOut, onClose, onAbout, admin, onAdmin, friends, onFriends, settings, onSettings, onTour }: MenuItemsProps) {
  const popover = kind === "popover";
  const [active, setActive] = useState(0);
  // About first, Friends under it (Social R1 placement), or Settings in that row once Friends is in the bar, Admin after them; each drawn only where it applies.
  const links: { href: string; label: string; trailing: string | null; go: () => void }[] = [
    { href: "/about", label: aboutLabel, trailing: null, go: onAbout },
    // The tour taken again sits directly under About, drawn as that row is (plan decision 6).
    { href: TOUR_HREF, label: tourAgainCopy.menu, trailing: null, go: onTour },
    // Once Friends is in the bar, Settings takes its row, in the same place, so the menu keeps its count of rows
    // (menu and Home handoff, R1 Menu 3).
    ...(settings
      ? [{ href: "/settings", label: settingsLabel, trailing: null, go: onSettings }]
      : friends
        ? [{ href: "/friends", label: socialCopy.menu.friends, trailing: null, go: onFriends }]
        : []),
    ...(admin ? [{ href: "/admin", label: adminCopy.door.label, trailing: admin, go: onAdmin }] : []),
  ];
  const buttons = [
    { label: manageAccount, onClick: onManage, danger: false },
    { label: signOutLabel, onClick: onSignOut, danger: true },
  ];
  // One ref per item, sized from the lists rather than written out (E9): the row count was two for this
  // menu's whole life and is three to five now, and a ref list or a modulo hard-coded to one count wraps
  // focus into the wrong row silently. Typed as the common supertype so one `move` can focus any of them.
  const refs = useRef<(HTMLElement | null)[]>([]);
  const count = links.length + buttons.length;

  function move(delta: number) {
    const next = (active + delta + count) % count;
    setActive(next);
    refs.current[next]?.focus();
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

  // About, Friends and Admin are real links, not buttons that route: they go somewhere,
  // so they should open in a new tab when a reader asks them to. Manage account
  // and Sign out act on the session and have no URL to offer.
  const rowClass = (i: number) =>
    `flex w-full items-center text-left text-[color:var(--fg)] transition-colors duration-[120ms] hover:bg-[color:var(--elevated)] focus-visible:bg-[color:var(--elevated)] disabled:opacity-60 ${
      popover
        ? "gap-[11px] rounded-lg px-3 py-[11px] text-[14px]"
        : // Sheet rows are divided; the first row has no top rule.
          `gap-3 px-[6px] py-[15px] text-[15px] ${
            i === 0 ? "" : "border-t border-solid border-[color:var(--border)]"
          }`
    }`;

  return (
    <>
      {links.map((link, i) => (
        <Link
          key={link.href}
          ref={(el) => {
            refs.current[i] = el;
          }}
          href={link.href}
          role="menuitem"
          tabIndex={active === i ? 0 : -1}
          onFocus={() => setActive(i)}
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
            // A modified press opens a new tab and navigates nothing here.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
              onClose();
              return;
            }
            e.preventDefault();
            link.go();
          }}
          className={rowClass(i)}
        >
          <ItemDiamond />
          <span>{link.label}</span>
          {/* The environment, named again by the page head, so hidden from the row's name. */}
          {link.trailing && (
            <span aria-hidden className="ml-auto font-mono text-[10.5px] text-[color:var(--fg-faint)]">{link.trailing}</span>
          )}
        </Link>
      ))}
      {buttons.map((item, i) => (
        <button
          key={item.label}
          ref={(el) => {
            refs.current[links.length + i] = el;
          }}
          type="button"
          role="menuitem"
          tabIndex={active === links.length + i ? 0 : -1}
          disabled={busy}
          onFocus={() => setActive(links.length + i)}
          onKeyDown={onKeyDown}
          onClick={item.onClick}
          className={rowClass(links.length + i)}
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
  // No scroll lock, so the menu tells the moments itself that it is open over the page.
  useMomentHold(true);

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
              // RD§1: the handoff's --fg-faint was 4.42:1 here and failed AA when this was ruled.
              // --fg-muted is 8.48:1. Do not fix this by enlarging the text.
              style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}
            >
              {props.identity.email}
            </div>
          )}
          {props.chip && <CreditChip chip={props.chip} sheet={false} onGo={props.onCredits} />}
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

  // Portalled to the body (card search plan PR B): the phone header that opens it is a fixed, translated layer while
  // quick return has it back over the page, which would make it the backdrop's containing block and trap both under
  // the tab bar.
  if (typeof document === "undefined") return null;
  return createPortal(
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
            {props.chip && <CreditChip chip={props.chip} sheet onGo={props.onCredits} />}
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
    </>,
    document.body,
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
        color: "var(--accent-text)",
      }}
    >
      {identity.initials}
    </span>
  );
}

export function AccountMenu({
  panel,
  theme,
  adminDoor = false,
  adminEnv,
  friends = false,
  commandersPlace = false,
  homeFeed = false,
  credits = null,
  friendsMoment = false,
}: {
  panel: PanelKind;
  theme: ThemeKey;
  /** Computed on the server against `ADMIN_USER_IDS`; only this boolean reaches the client. */
  adminDoor?: boolean;
  /** The admin's environment, named at the row's end. Read only with the door. */
  adminEnv?: string;
  /** `SOCIAL_FRIENDS_ENABLED` for this reader, resolved by the shell; only the boolean reaches the client. */
  friends?: boolean;
  /** `COMMANDERS_PLACE_ENABLED` for this reader. With `friends`, Friends is in the bar: the Settings row in place of
   *  Friends, and M11 on the bar's slot rather than this button. */
  commandersPlace?: boolean;
  /** `HOME_FEED_ENABLED` for this reader: with the Commanders place, Settings has its news section, so its row is drawn
   *  even with Friends off. */
  homeFeed?: boolean;
  /** The credit chip, read per request by the shell (plan E10) and re-read on every open. */
  credits?: ChipState | null;
  /** M11, Friends after a game: resolved by the shell (a game logged, no friend yet) and drawn only beside the Friends row. */
  friendsMoment?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // The deletion warning (plan E6): the paid credits held, read as the menu opens, and the warning while it is up.
  const [held, setHeld] = useState<HeldPaid | null | undefined>(undefined);
  const [warning, setWarning] = useState<HeldPaid | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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

  // The About row's press closes this menu, which unmounts the row, so its own link status cannot
  // carry the navigation to the 400ms screen. The navigation runs as a transition here instead,
  // and this component, which stays mounted, reports it.
  const leave = usePendingPush();
  function go(href: string) {
    // Already there, the press navigates nothing: it only closes the menu, and the sheet's
    // entry has to come back off in the ordinary way or the next Back would land on this page.
    if (window.location.pathname === href) {
      close();
      return;
    }
    // The sheet's release would otherwise step back off its history entry while the page is still
    // loading, and that Back cancels the navigation.
    leaveDialogsForNavigation();
    close();
    leave.go(href);
  }
  const onAbout = () => go("/about");
  const onAdmin = () => go("/admin");
  const onFriends = () => go("/friends");
  const onSettings = () => go("/settings");
  // Settings is drawn once it has a section to show (news with the feed, Spares with Friends) and the Commanders place
  // has moved the menu's rows. With `friends` on, that is exactly "Friends is in the bar", so its row is the one taken.
  const settings = commandersPlace && (friends || homeFeed);
  const onCredits = () => go("/credits");
  // The chip is re-read each time the menu opens (plan E10): the layout does not re-render on navigation, so the
  // shell's value is only the first paint. A failed read keeps what is drawn.
  const [chip, setChip] = useState<ChipState | null>(credits);
  const [seenProp, setSeenProp] = useState(credits);
  if (seenProp !== credits) {
    setSeenProp(credits);
    setChip(credits);
  }
  // This opening's read of the held paid credits: one request per opening, which a Manage account press made before
  // it lands awaits rather than asking again. A failed read is null (no warning).
  const heldRead = useRef<Promise<HeldPaid | null> | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    chipAction().then((next) => { if (live) setChip(next); }, () => {});
    const read = heldPaidAction().catch(() => null);
    heldRead.current = read;
    read.then((next) => { if (live) setHeld(next); });
    return () => {
      live = false;
      heldRead.current = null;
    };
  }, [open]);
  const onTour = () => go(TOUR_HREF);
  const admin = adminDoor ? (adminEnv ?? "") || null : null;

  // Clerk's hosted account page, not its modal (Hugh, 2026-10-12): the app loads none of Clerk's
  // prebuilt UI, so the press navigates away. The menu closes first all the same.
  //
  // While paid credits are held (payments on or off), the press opens the deletion warning first (plan E6, D1/D2),
  // whose one press continues here. The decision comes BEFORE the menu closes: going on to Clerk must mark the
  // navigation first, or the sheet's release steps back off its history entry and that Back cancels the redirect. So
  // a read still in flight is awaited with the menu open; a failed one goes straight on.
  function toClerk() {
    leaveDialogsForNavigation();
    void clerk.redirectToUserProfile();
  }
  // The press while the read is in flight belongs to the opening it was made in: one press per opening, and a
  // dismissal (or unmount) ends that opening, so a press it left in flight does nothing when it resolves, even
  // after the menu reopens. `opening` moves on every change of `open` and on unmount.
  const opening = useRef(0);
  const pressedIn = useRef<number | null>(null);
  useEffect(() => () => {
    opening.current++;
  }, [open]);
  async function onManage() {
    const at = opening.current;
    if (pressedIn.current === at) return;
    pressedIn.current = at;
    let now: HeldPaid | null;
    try {
      now = held !== undefined ? held : await (heldRead.current ?? heldPaidAction().catch(() => null));
    } finally {
      if (pressedIn.current === at) pressedIn.current = null;
    }
    if (opening.current !== at) return;
    if (warnsBeforeDelete(now)) {
      close();
      setWarning(now);
    } else {
      toClerk();
      close();
    }
  }

  // A successful sign-out navigates away, so `busy` is only ever released on
  // failure — without that release the menu stays dead until a reload.
  function onSignOut() {
    setBusy(true);
    // Signing out ends this opening for a Manage account press still awaiting its read: it must neither warn nor go on.
    opening.current++;
    // Card search's recent cards go with the account on this device (README call 7), before the session does.
    if (user) clearRecent(user.id);
    // This browser's push subscription goes first (G7): the action needs the session, and it never blocks past its limit.
    void forgetThisDevice().then(() => clerk.signOut()).catch(() => setBusy(false));
  }

  const label = triggerLabel(identity.name);
  const isPopover = panel === "popover";
  // Below the phone header's avatar; above the rail's, which sits at the rail's foot, so the bubble flips (README, M11).
  // Once Friends is in the bar the moment sits on its slot instead (menu and Home audit, erratum 5).
  const afterGame = useMomentAnchor("friends-after-game", {
    eligible: friends && friendsMoment && !settings,
    copy: momentsCopy.friendsAfterGame,
  });
  // The trigger carries the moment's anchor and is where the deletion warning hands focus back.
  const anchorRef = afterGame.ref;
  const triggerAnchor = useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      anchorRef(el);
    },
    [anchorRef],
  );
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
        // The contact sheet's `openAccount` step finds the trigger by this mark, as `openHelp` finds the ? by its own.
        data-account-trigger=""
        {...afterGame}
        ref={triggerAnchor}
        onClick={() => {
          // Each open reads the held credits afresh: a previous open's answer is never the press's.
          if (!open) setHeld(undefined);
          setOpen((v) => !v);
        }}
        // Visual box inside a 3px pad ring (X15). The ring also keeps the focus
        // outline clear of the adjacent border.
        className="group relative block cursor-pointer p-[3px]"
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
                : "bg-[color:var(--bg)] border-[color:var(--accent)] text-[color:var(--accent-text)] group-hover:bg-[color:var(--surface-raised)] group-hover:border-[color:var(--accent-hover)] group-hover:text-[color:var(--accent-hover)]"
          }`}
        >
          {identity.initials}
        </span>
        {/* The tour's step 5 lights this button, in the rail or the header (discovery R3·1b). Last, so the
            visual box stays the button's first child. */}
        <TargetBox id="tour:account" />
      </button>
      {warning && (
        <DeleteWarning
          held={warning}
          returnFocusRef={triggerRef}
          onClose={() => setWarning(null)}
          onContinue={() => {
            setWarning(null);
            toClerk();
          }}
        />
      )}
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
            onAbout={onAbout}
            admin={admin}
            friends={friends}
            onFriends={onFriends}
            settings={settings}
            onSettings={onSettings}
            onTour={onTour}
            onAdmin={onAdmin}
            chip={chip}
            onCredits={onCredits}
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
            onAbout={onAbout}
            admin={admin}
            friends={friends}
            onFriends={onFriends}
            settings={settings}
            onSettings={onSettings}
            onTour={onTour}
            onAdmin={onAdmin}
            chip={chip}
            onCredits={onCredits}
          />
        ))}
    </div>
  );
}
