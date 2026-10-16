"use client";

import type { ReactNode } from "react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import { guideLook, type ScanGuess, type ScanMode, type ScanPanel, type ScanScreen, type ScanTorch } from "./scan-view";

const copy = collectionEditCopy.scan;

/**
 * The scanner's screen (card-scan PR 3, `docs/superpowers/design-tables/card-scan-viewfinder.md`): the camera's feed
 * behind guide corners, the top bar (✕, Fast/Normal, the light), the dark line, the result panel and, on the phone,
 * the tray. Drawn from `screen` alone: what the camera sees and what the server said arrive as data, and every press
 * is a callback, so the hook that runs the camera owns all state but the press.
 *
 * `layout` is the phone's full screen or the desktop's webcam panel inside the Add cards sheet (W2, W3, W6), which
 * draws no tray, no light and no dark line. `feed` is the `<video>` the hook renders into.
 */
export type ScannerViewProps = {
  layout: "phone" | "desk";
  screen: ScanScreen;
  mode: ScanMode;
  torch: ScanTorch;
  count: number;
  /** The image of the card just added (V5): the tray's count card flips to it for a moment. */
  flipTo?: string | null;
  feed?: ReactNode;
  onMode: (m: ScanMode) => void;
  onTorch: () => void;
  onClose: () => void;
  onReview: () => void;
  /** The add press: down holds the guess (V4), up on the press adds it, leaving it cancels. */
  onHold: () => void;
  onAdd: () => void;
  onCancelHold: () => void;
  onPick: (oracleId: string) => void;
  onNoneOfThese: () => void;
};

export function ScannerView(p: ScannerViewProps) {
  const phone = p.layout === "phone";
  if (p.screen.kind === "blocked") return <CameraBlocked {...p} />;
  const look = guideLook(p.screen);
  return (
    <section
      data-testid="scanner"
      data-layout={p.layout}
      className={
        phone
          ? "absolute inset-0 z-40 overflow-hidden bg-[color:var(--bg)]"
          : "mx-[22px] flex flex-col overflow-hidden rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)]"
      }
    >
      {phone ? (
        <TopBar {...p} />
      ) : (
        <DeskHead {...p} withMode />
      )}
      <div aria-hidden="true" className={phone ? "absolute inset-0" : "relative h-[250px] w-full"}>
        {p.feed}
        <Guide look={look} phone={phone} />
      </div>
      {phone && p.screen.dark && <DarkLine torch={p.torch} />}
      <div aria-live="polite" className="contents">
        <Panel {...p} panel={p.screen.panel} />
      </div>
      {phone && <Tray count={p.count} flipTo={p.flipTo ?? null} onReview={p.onReview} />}
    </section>
  );
}

function Guide({ look, phone }: { look: "dash" | "lit" | "ok"; phone: boolean }) {
  const color = look === "ok" ? "var(--success)" : look === "lit" ? "var(--accent)" : "color-mix(in srgb, var(--fg) 35%, transparent)";
  const style = look === "dash" ? "dashed" : "solid";
  const box = phone ? "left-[66px] top-[108px] h-[350px] w-[258px]" : "left-1/2 top-[10px] h-[229px] w-[174px] -translate-x-1/2";
  const size = phone ? 34 : 24;
  const corner = (sides: string) => ({
    width: size,
    height: size,
    borderColor: color,
    borderStyle: style,
    borderWidth: 0,
    ...Object.fromEntries(sides.split(" ").map((s) => [`border${s}Width`, 3])),
  });
  return (
    <div data-testid="scan-guide" data-look={look} className={`pointer-events-none absolute ${box}`}>
      <span className="absolute left-0 top-0 rounded-tl-[14px]" style={corner("Top Left")} />
      <span className="absolute right-0 top-0 rounded-tr-[14px]" style={corner("Top Right")} />
      <span className="absolute bottom-0 left-0 rounded-bl-[14px]" style={corner("Bottom Left")} />
      <span className="absolute bottom-0 right-0 rounded-br-[14px]" style={corner("Bottom Right")} />
    </div>
  );
}

function ModeSegment({ mode, onMode, desk }: { mode: ScanMode; onMode: (m: ScanMode) => void; desk: boolean }) {
  const btn = (m: ScanMode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => onMode(m)}
      className={`rounded-[9px] px-[14px] font-medium ${desk ? "h-[30px] min-w-[64px] text-[13px]" : "h-[38px] min-w-[76px] text-[14px]"} ${
        mode === m
          ? "bg-[color:var(--elevated)] text-[color:var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]"
          : "bg-transparent text-[color:var(--fg-body)]"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label={copy.mode.label}
      className={`inline-flex gap-[2px] rounded-[12px] border border-[color:var(--border)] p-[3px] ${
        desk ? "bg-[color:var(--bg)]" : "mx-auto bg-[color:color-mix(in_srgb,var(--bg)_78%,transparent)]"
      }`}
    >
      {btn("fast", copy.mode.fast)}
      {btn("normal", copy.mode.normal)}
    </div>
  );
}

const ROUND = "flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full";
const SCRIM = "bg-[color:color-mix(in_srgb,var(--bg)_72%,transparent)] text-[color:var(--fg)]";

function TopBar(p: ScannerViewProps) {
  const dark = p.screen.kind === "scanning" && p.screen.dark;
  return (
    <div className="absolute inset-x-0 top-0 z-[3] flex h-[68px] items-center gap-[10px] px-[12px] pt-[12px]">
      <button type="button" aria-label={copy.close} onClick={p.onClose} className={`${ROUND} ${SCRIM} text-[15px]`}>
        ✕
      </button>
      <ModeSegment mode={p.mode} onMode={p.onMode} desk={false} />
      {p.torch.available ? (
        <button
          type="button"
          aria-label={copy.view.light}
          aria-pressed={p.torch.on}
          onClick={p.onTorch}
          data-ring={dark && !p.torch.on ? "" : undefined}
          className={`${ROUND} ${
            p.torch.on
              ? "bg-[color:var(--fg)] text-[color:var(--bg)]"
              : dark
                ? `${SCRIM} text-[color:var(--accent)] shadow-[0_0_0_2px_var(--accent)]`
                : SCRIM
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" />
          </svg>
        </button>
      ) : (
        // No torch (V8): no control at all, never a greyed one; the space keeps the segment centred.
        <span aria-hidden="true" className="h-[44px] w-[44px] flex-none" />
      )}
    </div>
  );
}

function DeskHead(p: ScannerViewProps & { withMode: boolean }) {
  return (
    <div className="flex items-center gap-[8px] border-b-[1px] border-b-[color:var(--border)] py-[8px] pl-[14px] pr-[8px]">
      <span className="flex-1 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]">
        {copy.camera.webcam}
      </span>
      {p.withMode && <ModeSegment mode={p.mode} onMode={p.onMode} desk />}
      <button
        type="button"
        onClick={p.onClose}
        className="rounded-[8px] border border-[color:var(--border)] bg-transparent px-[12px] py-[7px] text-[13px] text-[color:var(--fg)]"
      >
        {copy.camera.stop}
      </button>
    </div>
  );
}

function DarkLine({ torch }: { torch: ScanTorch }) {
  return (
    <div
      role="status"
      className="absolute inset-x-[12px] top-[72px] z-[3] flex items-start gap-[10px] rounded-[12px] border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] px-[14px] py-[11px] text-[13.5px] leading-[1.5] text-[color:var(--fg)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="mt-[2px] flex-none text-[color:var(--warning)]">
        <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
      </svg>
      <span>{torch.available ? copy.view.darkTorch : copy.view.darkNoTorch}</span>
    </div>
  );
}

const PANEL_PHONE =
  "absolute inset-x-[8px] bottom-[92px] z-[3] flex flex-col rounded-[18px] border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)] p-[16px] shadow-[0_-10px_40px_rgba(0,0,0,.35)]";
const PANEL_DESK = "flex flex-col gap-[12px] border-t-[1px] border-t-[color:var(--border)] px-[14px] py-[12px]";
const HEAD = "m-0 text-[16px] font-semibold text-[color:var(--fg)]";
const BODY = "m-0 text-[14px] leading-[1.55] text-[color:var(--fg-body)]";
const BIG = "h-[52px] w-full rounded-[12px] border-0 bg-[color:var(--accent)] text-[16px] font-semibold text-[color:var(--bg)]";
const BIG_OUTLINE = "h-[52px] w-full rounded-[12px] border border-[color:var(--border-strong)] bg-transparent text-[15px] font-medium text-[color:var(--fg)]";
const BIG_DESK = "h-[40px] flex-none whitespace-nowrap rounded-[8px] border-0 bg-[color:var(--accent)] px-[18px] text-[14px] font-semibold text-[color:var(--bg)]";

function Panel(p: ScannerViewProps & { panel: ScanPanel }) {
  const phone = p.layout === "phone";
  const { panel } = p;
  const gap = panel.kind === "added" ? "gap-[6px]" : panel.kind === "notSure" ? "gap-[12px]" : "gap-[14px]";
  const box = phone ? `${PANEL_PHONE} ${gap}` : PANEL_DESK;
  switch (panel.kind) {
    case "looking":
      return (
        <div data-testid="scan-panel" data-state="looking" className={box}>
          <p className={HEAD}>{copy.view.looking}</p>
          <p className={BODY}>
            <b className="font-semibold text-[color:var(--fg)]">{p.mode === "fast" ? copy.mode.fast : copy.mode.normal}:</b>{" "}
            {p.mode === "fast" ? copy.mode.fastLine : copy.mode.normalLine}
          </p>
        </div>
      );
    case "unsure":
      return (
        <div data-testid="scan-panel" data-state="unsure" role="status" className={box}>
          <div className="flex items-center justify-between">
            <p className={HEAD}>{copy.view.unsure}</p>
            <span aria-hidden="true" className="flex gap-[6px]">
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  data-on={i < panel.agreeing ? "" : undefined}
                  className={`block h-[8px] w-[8px] rounded-full ${i < panel.agreeing ? "bg-[color:var(--accent)]" : "bg-[color:var(--border-strong)]"}`}
                />
              ))}
            </span>
          </div>
          <p className={BODY}>{copy.view.unsureBody}</p>
        </div>
      );
    case "sure":
      return <SurePanel {...p} panel={panel} box={box} />;
    case "added":
      return (
        <div data-testid="scan-panel" data-state="added" role="status" className={box}>
          <p className={HEAD}>
            <span aria-hidden="true" className="text-[color:var(--success)]">✓ </span>
            {copy.view.added(panel.name)}
          </p>
          <p className={BODY}>{copy.view.next}</p>
        </div>
      );
    case "notSure":
      return (
        <div data-testid="scan-panel" data-state="notSure" className={box}>
          <p className={HEAD}>{copy.view.notSure}</p>
          <div className={phone ? "flex flex-col gap-[12px]" : "flex gap-[14px]"}>
            <div className={`grid grid-cols-3 gap-[10px] ${phone ? "" : "w-[270px] flex-none"}`}>
              {panel.guesses.map((g) => (
                <button
                  key={g.oracleId}
                  type="button"
                  onClick={() => p.onPick(g.oracleId)}
                  className="flex min-w-0 flex-col gap-[6px] border-0 bg-transparent p-0 text-left"
                >
                  <Thumb guess={g} className="aspect-[63/88] w-full rounded-[9px]" />
                  <span className={`line-clamp-2 leading-[1.3] text-[color:var(--fg)] ${phone ? "text-[12px]" : "text-[11.5px]"}`}>{g.name}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-[8px]">
              {panel.sleeves && (
                <p className={`m-0 leading-[1.55] text-[color:var(--fg-body)] ${phone ? "text-[13px]" : "text-[12.5px]"}`}>{copy.view.sleeves}</p>
              )}
              <button
                type="button"
                onClick={p.onNoneOfThese}
                className="min-h-[44px] border-0 bg-transparent p-0 text-left text-[13.5px] text-[color:var(--accent)]"
              >
                {copy.view.noneOfThese}
              </button>
            </div>
          </div>
        </div>
      );
  }
}

function Thumb({ guess, className }: { guess: ScanGuess; className: string }) {
  return (
    <span className={`block overflow-hidden bg-[color:var(--elevated)] shadow-[inset_0_0_0_1px_rgba(0,0,0,.35)] ${className}`}>
      {guess.imageUri && <img src={guess.imageUri} alt="" className="h-full w-full object-cover" />}
    </span>
  );
}

function SurePanel(p: ScannerViewProps & { panel: Extract<ScanPanel, { kind: "sure" }>; box: string }) {
  const phone = p.layout === "phone";
  const { guess, held, again } = p.panel;
  const label = again?.kind === "duplicate" ? copy.again.addAnother : again?.kind === "second" ? copy.again.addSecond : copy.view.add;
  const press = (
    <button
      type="button"
      data-held={held ? "" : undefined}
      onPointerDown={p.onHold}
      onPointerUp={p.onAdd}
      onPointerLeave={held ? p.onCancelHold : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          p.onAdd();
        }
      }}
      className={
        !phone
          ? BIG_DESK
          : again?.kind === "duplicate"
            ? BIG_OUTLINE
            : `${BIG} ${held ? "scale-[.985] bg-[color:var(--accent-hover)]" : ""}`
      }
    >
      {label}
    </button>
  );
  return (
    <div data-testid="scan-panel" data-state="sure" className={`${p.box} ${phone ? "relative" : ""}`}>
      {held && phone && (
        <span className="absolute right-[14px] top-[14px] rounded-[4px] border border-[color:var(--warning)] px-[6px] py-[2px] font-mono text-[10px] uppercase tracking-[.14em] text-[color:var(--warning)]">
          {copy.view.held}
        </span>
      )}
      <div className="flex items-center gap-[14px]">
        <Thumb guess={guess} className={`flex-none rounded-[6px] shadow-[0_6px_14px_rgba(0,0,0,.4)] ${phone ? "h-[89px] w-[64px]" : "h-[70px] w-[50px]"}`} />
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <b className="text-[16px] font-semibold text-[color:var(--fg)]">{guess.name}</b>
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{guess.typeLine}</span>
          {again?.kind === "duplicate" && <span className="font-mono text-[12px] text-[color:var(--success)]">{copy.again.stillOn(again.count)}</span>}
          {again?.kind === "second" && <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.again.already(again.count)}</span>}
        </div>
        {!phone && press}
      </div>
      {phone && press}
    </div>
  );
}

function Tray({ count, flipTo, onReview }: { count: number; flipTo: string | null; onReview: () => void }) {
  const empty = count === 0;
  return (
    <div className="absolute inset-x-0 bottom-0 z-[4] flex h-[84px] items-center gap-[12px] border-t-[1px] border-t-[color:var(--border)] bg-[color:var(--bg)] px-[14px] pb-[8px]">
      {!empty && <CountCard count={count} flipTo={flipTo} />}
      <span data-testid="scan-tray-count" className={`flex-1 text-[14px] ${empty ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg-body)]"}`}>
        {empty
          ? copy.view.emptyList
          : copy.view.onList(count).map((part, i) =>
              part.strong ? (
                <b key={i} className="font-semibold text-[color:var(--fg)]">
                  {part.text}
                </b>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
      </span>
      <button
        type="button"
        aria-disabled={empty || undefined}
        onClick={empty ? undefined : onReview}
        className={`h-[48px] rounded-[10px] border-0 bg-[color:var(--accent)] px-[20px] text-[15px] font-semibold text-[color:var(--bg)] ${empty ? "opacity-40" : ""}`}
      >
        {empty ? copy.view.reviewEmpty : copy.view.review(count)}
      </button>
    </div>
  );
}

/**
 * Three fanned cards, the front one carrying the count. While `flipTo` is set (the hook holds it about 0.8s after an
 * add) the front card turns to show the added card's image; under reduced motion it never turns and the count just
 * ticks, as READINESS says both animations drop.
 */
function CountCard({ count, flipTo }: { count: number; flipTo: string | null }) {
  const back = "absolute top-[4px] h-[45px] w-[32px] rounded-[4px] shadow-[0_2px_6px_rgba(0,0,0,.5)]";
  return (
    <span aria-hidden="true" className="relative h-[52px] w-[62px] flex-none">
      <span className={`${back} left-[2px] -rotate-[8deg] border border-[color:var(--border)] bg-[color:var(--elevated)]`} />
      <span className={`${back} left-[13px] -rotate-[1deg] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]`} />
      <span
        data-testid="scan-count-card"
        data-flip={flipTo ? "" : undefined}
        className={`${back} left-[24px] flex rotate-[7deg] items-center justify-center overflow-hidden border border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_14%,var(--surface))] font-display text-[17px] font-bold text-[color:var(--accent)] transition-transform duration-300 motion-reduce:transition-none ${
          flipTo ? "motion-safe:[transform:rotate(7deg)_perspective(200px)_rotateY(18deg)]" : ""
        }`}
      >
        {flipTo ? (
          <>
            <img src={flipTo} alt="" className="hidden h-full w-full object-cover motion-safe:block" />
            <span className="motion-safe:hidden">{count}</span>
          </>
        ) : (
          count
        )}
      </span>
    </span>
  );
}

function CameraBlocked(p: ScannerViewProps) {
  if (p.layout === "desk") {
    return (
      <section data-testid="scanner" data-layout="desk" className="mx-[22px] flex flex-col overflow-hidden rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)]">
        <DeskHead {...p} withMode={false} />
        <div className="flex flex-col items-start gap-[12px] px-[16px] py-[22px]">
          <CameraIcon size={44} radius={12} />
          <b className="font-display text-[18px] font-bold text-[color:var(--fg)]">{copy.camera.noWebcamTitle}</b>
          <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.camera.noWebcamBody}</p>
        </div>
      </section>
    );
  }
  return (
    <section data-testid="scanner" data-layout="phone" className="absolute inset-0 z-40 flex flex-col bg-[color:var(--bg)]">
      <div className="relative h-[60px] px-[12px] pt-[12px]">
        <button type="button" aria-label={copy.close} onClick={p.onClose} className={`${ROUND} bg-[color:var(--elevated)] text-[15px] text-[color:var(--fg)]`}>
          ✕
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-[16px] px-[22px] py-[24px]">
        <span className="mt-[30px]">
          <CameraIcon size={56} radius={14} />
        </span>
        <h3 className="m-0 font-display text-[24px] font-bold text-[color:var(--fg)]">{copy.camera.blockedTitle}</h3>
        <p className="m-0 text-[15px] leading-[1.6] text-[color:var(--fg-body)]">{copy.camera.blockedBody}</p>
      </div>
    </section>
  );
}

function CameraIcon({ size, radius }: { size: number; radius: number }) {
  return (
    <span
      className="flex items-center justify-center bg-[color:var(--elevated)] text-[color:var(--warning)]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    </span>
  );
}
