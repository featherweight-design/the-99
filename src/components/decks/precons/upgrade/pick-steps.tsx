"use client";

// The three pick steps (handoff Commander.dc, Bracket.dc, Strategy.dc). Nothing is preselected, and a selection says select or unselect,
// never tick: each option is a radio the player presses.
import type { ReactNode } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { BRACKET_NAMES } from "../../../../lib/copy/deck-analysis";
import type { OfferedCommander, OfferedStrategy } from "../../../../lib/precons/upgrade/run";
import type { BracketTarget } from "../../../../lib/precons/upgrade/hold";
import { bracketOffers } from "../../../../lib/precons/upgrade/flow";
import { BracketMark, bracketInk } from "../../bracket-mark";
import { StrategyIcon } from "../../strategy-icon";
import type { StrategyKey } from "@/lib/strategy/score";

/** One card's art by oracle id, from the precon's own cards: the commanders and the backing cards are all in the box. */
export type UpgradeArt = ReadonlyMap<string, string | null>;

function Step({ q, sub, children }: { q: string; sub: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex flex-col gap-[4px]">
        <p className="m-0 font-display text-[18px] text-[color:var(--fg)]">{q}</p>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">{sub}</p>
      </div>
      {children}
    </div>
  );
}

const OPTION = "flex w-full cursor-pointer gap-[12px] rounded-[10px] border border-solid p-[12px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ";

function Radio({ on, ink }: { on: boolean; ink?: string }) {
  return (
    <span aria-hidden className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)]" style={on ? { borderColor: ink ?? "var(--accent)" } : undefined}>
      {on && <span className="h-[10px] w-[10px] rounded-full" style={{ background: ink ?? "var(--accent)" }} />}
    </span>
  );
}

export function CommanderStep({ options, art, picked, onPick }: { options: OfferedCommander[]; art: UpgradeArt; picked: string | null; onPick: (key: string) => void }) {
  const copy = preconUpgradeCopy.commander;
  return (
    <Step q={copy.q} sub={copy.sub}>
      <div role="radiogroup" aria-label={copy.q} className="flex flex-col gap-[10px] md:flex-row">
        {options.map((o) => {
          const on = o.key === picked;
          const names = o.cards.map((c) => c.name).join(" + ");
          const uri = art.get(o.cards[0]?.oracleId ?? "") ?? null;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(o.key)}
              className={`${OPTION}md:flex-1 ${on ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))]" : "border-[color:var(--border)] bg-[color:var(--surface)]"}`}
            >
              {uri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uri} alt="" loading="lazy" className="h-[112px] w-[80px] flex-none rounded-[6px] object-cover" />
              ) : (
                <span aria-hidden className="h-[112px] w-[80px] flex-none rounded-[6px] bg-[color:var(--surface-sunken)]" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <span className="font-display text-[15px] text-[color:var(--fg)]">{names}</span>
                {o.line && <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{o.line}</span>}
                <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                  {o.cards.map((c) => `${c.manaCost ?? ""} ${copy.manaValue(c.cmc)}`.trim()).join(" · ")}
                </span>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{o.isFace ? copy.boxOwn : copy.alternateSource}</span>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">
                  {copy.directions(o.strategies.map((s) => s.label).join(", "))}
                </span>
              </span>
              <Radio on={on} />
            </button>
          );
        })}
      </div>
    </Step>
  );
}

export function BracketStep({ boxBracket, picked, onPick }: { boxBracket: number | null; picked: BracketTarget | null; onPick: (b: BracketTarget) => void }) {
  const copy = preconUpgradeCopy.bracket;
  return (
    <Step q={copy.q} sub={copy.sub(boxBracket ?? 2)}>
      <div role="radiogroup" aria-label={copy.q} className="flex flex-col gap-[8px] rounded-[11px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] p-[11px] md:p-[14px]">
        {bracketOffers(boxBracket).map((b) => {
          const on = b === picked;
          const ink = bracketInk(b);
          return (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(b)}
              data-bracket={b}
              className={`grid min-h-[44px] cursor-pointer gap-[7px] rounded-[8px] border border-solid px-[11px] py-[10px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:grid-cols-[186px_1fr] md:items-center md:gap-[14px] md:px-[12px] ${on ? "" : "border-[color:var(--border)]"}`}
              // The rung takes its rank's ink (`--bracket-N`, a runtime pick of one of three), and has no hover state to kill.
              // eslint-disable-next-line no-restricted-syntax -- background and border follow the picked rank's ink; genuinely dynamic
              style={on ? { background: `color-mix(in oklab, ${ink} 12%, var(--surface))`, borderColor: ink } : undefined}
            >
              <span className="flex items-center gap-[8px] md:gap-[9px]">
                <span className="md:hidden"><BracketMark bracket={b} px={on ? 26 : 22} /></span>
                <span className="hidden md:inline-flex"><BracketMark bracket={b} px={on ? 36 : 26} /></span>
                <span className="flex flex-1 items-baseline gap-[8px] md:flex-none md:flex-col md:items-start md:gap-[2px]">
                  <span className={on ? "text-[13px] font-semibold text-[color:var(--fg)]" : "text-[12.5px] font-semibold text-[color:var(--fg-body)]"}>{BRACKET_NAMES[b]}</span>
                  {b === boxBracket && <span className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] md:ml-0 md:text-[9px]">{copy.boxOwn}</span>}
                </span>
                <span className="md:hidden"><Radio on={on} ink={ink} /></span>
              </span>
              <span className="flex items-start gap-[10px]">
                <span className="flex-1 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.blurbs[b]}</span>
                <span className="hidden md:block"><Radio on={on} ink={ink} /></span>
              </span>
            </button>
          );
        })}
      </div>
    </Step>
  );
}

export function StrategyStep({ lead, bracket, options, art, picked, onPick }: {
  lead: string; bracket: number; options: OfferedStrategy[]; art: UpgradeArt; picked: string | null; onPick: (key: string) => void;
}) {
  const copy = preconUpgradeCopy.strategy;
  return (
    <Step q={copy.q} sub={copy.sub(lead, bracket)}>
      <div role="radiogroup" aria-label={copy.q} className="grid gap-[10px] md:grid-cols-2">
        {options.map((s) => {
          const on = s.key === picked;
          const shown = s.backing.slice(0, 3);
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(s.key)}
              className={`${OPTION}flex-col ${on ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))]" : "border-[color:var(--border)] bg-[color:var(--surface)]"}`}
            >
              <span className="flex items-start gap-[10px]">
                <span className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[color:var(--surface-sunken)] text-[color:var(--fg-body)]">
                  <StrategyIcon strategy={s.key as StrategyKey} size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="font-display text-[15px] text-[color:var(--fg)]">{s.label}</span>
                  <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.count(s.backing.length)}</span>
                </span>
                <Radio on={on} />
              </span>
              <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{s.blurb}</span>
              <span className="grid grid-cols-3 gap-[8px]">
                {shown.map((c) => {
                  const uri = art.get(c.oracleId) ?? null;
                  return (
                    <span key={c.oracleId} className="flex min-w-0 flex-col items-center gap-[4px] text-center">
                      {uri ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={uri} alt="" loading="lazy" className="aspect-[5/7] w-full max-w-[64px] rounded-[4px] object-cover" />
                      ) : (
                        <span aria-hidden className="aspect-[5/7] w-full max-w-[64px] rounded-[4px] bg-[color:var(--surface-sunken)]" />
                      )}
                      <span className="w-full truncate text-[11px] text-[color:var(--fg-muted)]">{c.name}</span>
                    </span>
                  );
                })}
              </span>
              {s.backing.length > shown.length && <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.more(s.backing.length - shown.length)}</span>}
            </button>
          );
        })}
      </div>
    </Step>
  );
}
