"use client";

// The arrivals banner (upcoming precons, plan PR 3): handoff `design/design_handoff_the99_upcoming_precons/`,
// frames `R1 - Home-Banner`, STATES H1–H8 and rules 5–8, design table `design-tables/upcoming-precons.md`
// (`ArrivalsBanner`). In Home's flow between the header and Ready to build: never fixed, no modal, no focus grab,
// no scroll lock and no live region. The server draws it, so it is in the document when the page loads, and a
// screen reader meets it in reading order and by landmark (a labelled `<section>`).
//
// About's lines (About visual build, plan `2026-10-27-about-visual.md` PR 6b; handoff `design_handoff_the99_about_visual`,
// call 7, Ways-In "Banner"): the only place a launch is announced, now the one-time sheet has retired. Drawn first.
// One launch alone takes the one-line shape with the diamond mark swapped for a crop of its label's region (64x48 on a
// phone, 56x38 from `md`, each cut from the capture at that width, call 0): "New on Decks:", the unit's words, Show me.
// Two or more launches, or About beside arrivals, take the `New in the app` band, a crop per About line (44x32) and
// "and N more" past four. A rule has no region, so its line keeps the diamond mark. A first-run reader's line (A3) is
// unchanged and points at the `/about` index. One ✕ dismisses both halves. On the first-run checklist the band draws
// About's line alone, with no ✕ (`closable={false}`): the checklist is itself the first-run surface.

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { dismissArrivals } from "../../app/arrivals-actions";
import { bannerCap, cropStyle, type AboutLaunch, type AboutLine, type BannerCrop } from "../../lib/about/banner-line";
import { arrivalsCopy as copy } from "../../lib/copy/arrivals";
import type { ArrivalsBannerData, BannerLine } from "../../lib/precons/banner";
import { aboutAcknowledged, aboutFirstRunOver, acknowledgeHeld, arrivalsAcknowledged, launchAcknowledged } from "./arrivals-seen";
import { ThemeRefresh } from "../about/pages/theme-refresh";
import { AboutText } from "../about/pages/about-text";
import { PendingReporter } from "../shell/pending-reporter";
import { useTarget } from "../discovery/targets-provider";
import { Mark } from "./banner-mark";
import { HOME_HEADING_ID } from "./home-heading";

/** Where a first-run reader's Show me goes, and a launch line's "and N more": the `/about` index (call 3). */
export const ABOUT_INDEX_HREF = "/about";
/** The close: a height collapse this long, instant under reduced motion. */
export const COLLAPSE_MS = 160;

/**
 * The banners dismissed by ✕ in this document, by their keys. ✕ writes the seen state and the next load draws
 * nothing, but a client navigation back to Home (Back included) re-mounts the payload the router already holds, so
 * the press records the banner here and that re-mount stays closed. A ✕ whose write fails takes its entry back out.
 * A Precons visit that acknowledged the arrivals is the other way a re-mount stays closed (`arrivals-seen.ts`).
 * Only ever written by a press, so the server's copy of the module stays empty.
 */
const dismissed = new Set<string>();

const RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";
const LINK =
  "text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px] " +
  "hover:decoration-[color:var(--fg)] rounded-[3px] " + RING;
const CLOSE =
  "flex flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[color:var(--fg-faint)] " +
  "hover:text-[color:var(--fg)] rounded-[6px] " + RING;
/** A launch's line in the band (Ways-In `.bn2 li`): the crop beside the words, 8px above and below at every width. */
const LAUNCH_LINE =
  "border-t border-solid border-[color:var(--border)] py-[8px] text-[14px] leading-[1.45] text-[color:var(--fg-body)] sm:text-[13.5px]";
/** One line of the A2 band. */
const LINE =
  "border-t border-solid border-[color:var(--border)] py-[9px] text-[14px] leading-[1.5] text-[color:var(--fg-body)] sm:py-[8px] sm:text-[13.5px]";
const SHELL =
  "box-border rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)]";

/** One arrival: the set's name in `--fg`, then the rest of its sentence. */
function Sentence({ line }: { line: BannerLine }) {
  return (
    <>
      <span className="text-[color:var(--fg)]">{line.name}</span>
      {line.kind === "set" ? copy.announced(line.revealed) : copy.listed(line.count)}
    </>
  );
}

/** A first-run reader's line (A3): the lead in `--fg`, then the sentence. */
function FirstRunSentence() {
  return (
    <>
      <span className="text-[color:var(--fg)]">{copy.aboutFirstRunLead}</span>
      {copy.aboutFirstRunRest}
    </>
  );
}

/** A launch's line: "New on {page}:" in `--fg`, then the unit's own words. */
function LaunchSentence({ launch }: { launch: AboutLaunch }) {
  return (
    <>
      <span className="text-[color:var(--fg)]">{launch.lead}</span> <AboutText text={launch.text} bold="font-normal text-[color:var(--fg)]" />
    </>
  );
}

/** Tailwind's `md`, where the desktop capture takes over from the phone's (call 0). */
export const CROP_MEDIA = "(min-width: 48rem)";
/** A transparent pixel: the source at a width whose crop is not drawn, so no capture is fetched for it. */
export const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** The diamond mark in a crop's place, where a width has no region to show (a rule). */
function MarkBox({ w, h, className }: { w: number; h: number; className: string }) {
  return (
    <span aria-hidden="true" className={`flex flex-none items-center justify-center ${className}`} style={{ width: w, height: h }}>
      <Mark />
    </span>
  );
}

/** Each size's box at each width: a launch alone (Ways-In `.bn`), or a line in the band (`.bn2`). */
const CROP_SIZES = {
  line: { phone: [64, 48], desktop: [56, 38], box: "h-[48px] w-[64px] md:h-[38px] md:w-[56px]", round: "rounded-[7px]" },
  list: { phone: [44, 32], desktop: [44, 32], box: "h-[32px] w-[44px]", round: "rounded-[5px]" },
} as const;

/** Where a crop's image sits in its box at one width, as custom properties the image's classes read per breakpoint.
 *  Spelled out, one literal name each, so each is declared where it is set (`check:tokens`). */
function cropVars(phone: BannerCrop | null, desktop: BannerCrop | null, s: (typeof CROP_SIZES)[keyof typeof CROP_SIZES]): CSSProperties {
  const px = (n: number) => `${n}px`;
  const p = phone ? cropStyle(phone, s.phone[0], s.phone[1]) : null;
  const d = desktop ? cropStyle(desktop, s.desktop[0], s.desktop[1]) : null;
  return {
    ...(p ? { "--pl": px(p.left), "--pt": px(p.top), "--pw": px(p.width), "--ph": px(p.height) } : {}),
    ...(d ? { "--dl": px(d.left), "--dt": px(d.top), "--dw": px(d.width), "--dh": px(d.height) } : {}),
  } as CSSProperties;
}

/**
 * A launch's picture: the phone capture's crop below `md`, the desktop capture's from `md` (call 0). ONE `<picture>`,
 * so the browser fetches only the capture its width draws (two `<img>`s, one hidden by CSS, fetched both full
 * screenshots). The box and the image's place in it switch at `md` through classes and custom properties. A width with
 * no region (a rule, or a label no capture measured) draws the mark there, and its source is a blank pixel.
 */
function LaunchCrop({ launch, size }: { launch: AboutLaunch; size: "line" | "list" }) {
  const s = CROP_SIZES[size];
  const { phone, desktop } = launch;
  if (!phone && !desktop) {
    return (
      <>
        <MarkBox w={s.phone[0]} h={s.phone[1]} className="md:hidden" />
        <MarkBox w={s.desktop[0]} h={s.desktop[1]} className="hidden md:flex" />
      </>
    );
  }
  const shown = phone && desktop ? "" : phone ? "md:hidden" : "hidden md:flex";
  return (
    <>
      {!phone && <MarkBox w={s.phone[0]} h={s.phone[1]} className="md:hidden" />}
      <span
        aria-hidden="true"
        data-about-crop
        className={`relative box-content flex-none overflow-hidden border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] ${s.round} ${s.box} ${shown}`}
        style={cropVars(phone, desktop, s)}
      >
        <picture>
          <source media={CROP_MEDIA} srcSet={desktop?.src ?? BLANK_PIXEL} />
          <img
            src={phone?.src ?? BLANK_PIXEL}
            alt=""
            decoding="async"
            className={
              "absolute block max-w-none left-[var(--pl)] top-[var(--pt)] h-[var(--ph)] w-[var(--pw)] " +
              "md:left-[var(--dl)] md:top-[var(--dt)] md:h-[var(--dh)] md:w-[var(--dw)]"
            }
          />
        </picture>
      </span>
      {!desktop && <MarkBox w={s.desktop[0]} h={s.desktop[1]} className="hidden md:flex" />}
    </>
  );
}

function CloseButton({ onClose, className }: { onClose: () => void; className: string }) {
  return (
    <button type="button" aria-label={copy.dismiss} onClick={onClose} className={`${CLOSE} ${className}`}>
      <span aria-hidden="true">✕</span>
    </button>
  );
}

export function ArrivalsBanner({
  data,
  about = null,
  closable = true,
  gutter = "dashboard",
}: {
  /** The arrivals, or null when only About has something to say. */
  data: ArrivalsBannerData | null;
  /** About's line, or null. */
  about?: AboutLine | null;
  /** False on the first-run checklist: About's line alone, with no ✕. */
  closable?: boolean;
  /** The page's own gutter at desktop, so the band lines up with its heading: 26 on the Dashboard, 28 on the checklist. */
  gutter?: "dashboard" | "checklist";
}) {
  const smMx = gutter === "checklist" ? "sm:mx-[28px]" : "sm:mx-[26px]";
  const keys = data?.keys ?? [];
  const aboutIds = about?.ids ?? [];
  const id = [...keys, ...aboutIds.map((a) => `about:${a}`)].join(" ");
  // Each half on its own: a Precons visit answers the arrivals, an About page visit answers the launches on that page
  // (and a first-run reader's first visit answers their whole line), and either leaves the rest standing.
  const arrivals = data && data.lines.length > 0 && !arrivalsAcknowledged(data.keys) ? data : null;
  const firstRun = about?.kind === "firstRun" && !aboutFirstRunOver() && !aboutAcknowledged(about.ids);
  const launches = about?.kind === "launches" ? about.launches.filter((l) => !launchAcknowledged(l.key)) : [];
  const aboutShown = firstRun || launches.length > 0;
  const [phase, setPhase] = useState<"open" | "closing" | "gone">(() => (dismissed.has(id) ? "gone" : "open"));
  // The tour's step 6 lights the band (discovery R3·1b); unregistered while it is gone, so the step falls back.
  const tourTarget = useTarget("tour:banner");

  useEffect(() => {
    if (phase !== "closing") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => {
      setPhase("gone");
      document.getElementById(HOME_HEADING_ID)?.focus();
    }, reduce ? 0 : COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "gone" || (!arrivals && !aboutShown)) return null;

  const close = () => {
    dismissed.add(id);
    setPhase("closing");
    // The banner closes on the press; a write that fails leaves both halves unseen, so the next load shows them
    // again (rule 6), and a re-mount in this document draws it again too.
    // What this banner RENDERED for the write: the server writes only those of them it still announces.
    const claimed = about?.kind === "firstRun" ? (firstRun ? about.ack : []) : launches.flatMap((l) => l.ack);
    // The About keys the write confirmed are acknowledged, and end the first run in this document: a first-run line
    // in another payload of this document (one whose ids differ) is not drawn again after a ✕ that landed.
    void dismissArrivals(arrivals?.keys ?? [], claimed).then((written) => acknowledgeHeld(written ?? []), () => {
      dismissed.delete(id);
    });
  };

  const closing = phase === "closing";
  // One line: About's alone (one launch, or A3), or one arrival alone (H2, H3). Two launches, or About beside
  // arrivals, take the heading (call 7, A2).
  const single: "about" | "arrival" | null = aboutShown
    ? arrivals || launches.length > 1 ? null : "about"
    : arrivals && arrivals.lines.length === 1 ? "arrival" : null;
  const launch = single === "about" && !firstRun ? launches[0]! : null;
  const lines = arrivals?.lines ?? [];
  const { shown, more } = bannerCap(lines.length);
  const aboutCap = bannerCap(launches.length);
  const closeButton = (className: string) => (closable ? <CloseButton onClose={close} className={className} /> : null);
  // The crops are captures chosen in the theme the server drew in: a theme picked in place (the account menu repaints
  // without navigating) asks the server again, as the About pages do. Only while a crop is drawn.
  const cropTheme = about?.kind === "launches" && launches.some((l) => l.phone || l.desktop) ? about.theme : null;

  return (
    // The collapse: one grid row from its height to none. `overflow-hidden` only while closing, so a focus ring
    // at the band's edge is never clipped while it is open.
    <div
      data-arrivals-banner={phase}
      className={
        "grid transition-[grid-template-rows] duration-[160ms] ease-out motion-reduce:transition-none " +
        (closing ? "grid-rows-[0fr]" : "grid-rows-[1fr]")
      }
    >
      <div className={`min-h-0 ${closing ? "overflow-hidden" : ""}`} inert={closing}>
        {cropTheme !== null && <ThemeRefresh drawnIn={cropTheme} />}
        {single ? (
          <section
            ref={tourTarget}
            aria-label={copy.regionLabel}
            className={
              `${SHELL} mx-[16px] mt-[14px] flex items-start py-[10px] ` +
              `${smMx} sm:mt-[18px] sm:min-h-[46px] sm:items-center sm:gap-[12px] sm:py-[7px] ` +
              // A launch's crop takes the mark's place at the board's insets (Ways-In `.bn`).
              (launch ? "gap-[12px] pl-[10px] sm:pl-[8px] " : "gap-[10px] pl-[14px] ") +
              (closable ? "pr-[4px] sm:pr-[8px]" : "pr-[14px]")
            }
          >
            {launch ? <LaunchCrop launch={launch} size="line" /> : <Mark className="mt-[2px] sm:mt-0" />}
            <div
              className={
                "flex min-w-0 flex-1 flex-col gap-[4px] sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-[14px] sm:pt-0 " +
                (launch ? "pt-[1px]" : "pt-[2px]")
              }
            >
              {/* A launch's words drop to 13.5 at desktop with its link (Ways-In `.dk .bn .tx p`). */}
              <p className={`m-0 text-[14px] leading-[1.45] text-[color:var(--fg-body)] ${launch ? "sm:text-[13.5px]" : ""}`}>
                {single === "about" ? (launch ? <LaunchSentence launch={launch} /> : <FirstRunSentence />) : <Sentence line={lines[0]!} />}
              </p>
              {single === "about" ? (
                <Link
                  href={launch ? launch.href : ABOUT_INDEX_HREF}
                  data-about-link
                  className={`${LINK} min-h-[24px] self-start whitespace-nowrap text-[14px] leading-[1.45] sm:min-h-0 sm:self-auto sm:text-[13.5px]`}
                >
                  {copy.aboutShow}
                  <PendingReporter href={launch ? launch.href : ABOUT_INDEX_HREF} />
                </Link>
              ) : (
                <Link
                  href={arrivals!.href}
                  className={`${LINK} min-h-[24px] self-start whitespace-nowrap text-[14px] leading-[1.45] sm:min-h-0 sm:self-auto sm:text-[13.5px]`}
                >
                  {lines[0]!.kind === "set" ? copy.seeOne : copy.seeMany}
                  <PendingReporter href={arrivals!.href} />
                </Link>
              )}
            </div>
            {closeButton(
              `h-[44px] w-[44px] text-[14px] sm:mt-0 sm:h-[32px] sm:w-[32px] sm:text-[13px] ${launch ? "-mt-[6px]" : ""}`,
            )}
          </section>
        ) : aboutShown ? (
          // Two or more launches, or About beside arrivals (call 7, A2): the heading `New in the app` and ✕ on one row,
          // then About's lines first, each with its crop (Ways-In `.bn2`) and its own Show me, under the shipped cap;
          // then the arrivals under theirs, their one Precons link closing the last of their lines.
          <section
            ref={tourTarget}
            aria-label={copy.regionLabel}
            className={
              `${SHELL} mx-[16px] mt-[14px] flex flex-col pt-[2px] pr-[4px] pb-[6px] pl-[14px] ` +
              `${smMx} sm:mt-[18px] sm:pt-[6px] sm:pr-[8px]`
            }
          >
            <div className="flex items-center gap-[10px]">
              <Mark />
              <h2 className="m-0 min-w-0 flex-1 text-[14.5px] leading-[1.4] font-semibold text-[color:var(--fg)]">
                {copy.regionLabel}
              </h2>
              {closeButton("h-[44px] w-[44px] text-[14px] sm:h-[32px] sm:w-[32px] sm:text-[13px]")}
            </div>
            <ul className="m-0 mr-[10px] ml-[32px] list-none p-0 sm:mt-[2px] sm:mr-0">
              {firstRun && (
                <li className={LINE}>
                  <FirstRunSentence />{" "}
                  <Link href={ABOUT_INDEX_HREF} data-about-link className={`${LINK} whitespace-nowrap`}>
                    {copy.aboutShow}
                    <PendingReporter href={ABOUT_INDEX_HREF} />
                  </Link>
                </li>
              )}
              {launches.slice(0, aboutCap.shown).map((l) => (
                <li key={l.key} data-about-launch={l.key} className={`${LAUNCH_LINE} flex items-center gap-[10px]`}>
                  <LaunchCrop launch={l} size="list" />
                  <span className="min-w-0">
                    <LaunchSentence launch={l} />{" "}
                    <Link href={l.href} data-about-link className={`${LINK} whitespace-nowrap`}>
                      {copy.aboutShow}
                      <PendingReporter href={l.href} />
                    </Link>
                  </span>
                </li>
              ))}
              {aboutCap.more > 0 && (
                <li className={LINE}>
                  <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.more(aboutCap.more)}</span>{" "}
                  <Link href={ABOUT_INDEX_HREF} data-about-link className={`${LINK} whitespace-nowrap`}>
                    {copy.aboutShow}
                    <PendingReporter href={ABOUT_INDEX_HREF} />
                  </Link>
                </li>
              )}
              {lines.slice(0, shown).map((l, i) => (
                <li key={`${l.kind}:${l.code}`} className={LINE}>
                  <Sentence line={l} />
                  {i === lines.length - 1 && (
                    <>
                      {" "}
                      <Link href={arrivals!.href} className={`${LINK} whitespace-nowrap`}>
                        {l.kind === "set" ? copy.seeOne : copy.seeMany}
                        <PendingReporter href={arrivals!.href} />
                      </Link>
                    </>
                  )}
                </li>
              ))}
              {more > 0 && (
                <li className={LINE}>
                  <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.more(more)}</span>{" "}
                  <Link href={arrivals!.href} className={`${LINK} whitespace-nowrap`}>
                    {copy.seeMany}
                    <PendingReporter href={arrivals!.href} />
                  </Link>
                </li>
              )}
            </ul>
          </section>
        ) : (
          // Several arrivals: the count heading, the lines under `bannerCap`, one link and one ✕ for all. Placed
          // on a grid so the DOM reads heading, lines, link, ✕ (Tab: the link, then ✕) while the link sits on the
          // heading line at desktop and on its own 44px line last at 390.
          <section
            ref={tourTarget}
            aria-label={copy.regionLabel}
            className={
              `${SHELL} mx-[16px] mt-[14px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[10px] pt-[6px] pr-[4px] pb-[4px] pl-[14px] ` +
              `${smMx} sm:mt-[18px] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-[10px] sm:pt-[7px] sm:pr-[8px] sm:pb-[6px]`
            }
          >
            <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-[10px]">
              <Mark />
              <h2 className="m-0 min-w-0 flex-1 text-[14.5px] leading-[1.4] font-semibold text-[color:var(--fg)]">
                {copy.heading(lines.length)}
              </h2>
            </div>
            <ul
              className={
                "col-span-2 row-start-2 m-0 mt-[2px] mr-[10px] ml-[32px] list-none p-0 " +
                "sm:col-span-3 sm:mt-[4px] sm:mr-0 sm:grid sm:grid-cols-2 sm:gap-x-[28px]"
              }
            >
              {lines.slice(0, shown).map((l) => (
                <li
                  key={`${l.kind}:${l.code}`}
                  className="border-t border-solid border-[color:var(--border)] py-[8px] text-[14px] leading-[1.4] text-[color:var(--fg-body)] sm:text-[13.5px]"
                >
                  <Sentence line={l} />
                </li>
              ))}
              {more > 0 && (
                <li className="border-t border-solid border-[color:var(--border)] py-[8px] font-mono text-[11px] leading-[1.4] text-[color:var(--fg-muted)]">
                  {copy.more(more)}
                </li>
              )}
            </ul>
            <Link
              href={arrivals!.href}
              className={
                `${LINK} col-span-2 row-start-3 flex min-h-[44px] items-center justify-self-start pl-[32px] text-[14px] ` +
                "sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:min-h-0 sm:pl-0 sm:text-[13.5px]"
              }
            >
              {copy.seeMany}
              <PendingReporter href={arrivals!.href} />
            </Link>
            {closeButton(
              "col-start-2 row-start-1 -mt-[8px] h-[44px] w-[44px] text-[14px] sm:col-start-3 sm:mt-0 sm:h-[32px] sm:w-[32px] sm:text-[13px]",
            )}
          </section>
        )}
      </div>
    </div>
  );
}
