import { landingCopy } from "../../lib/copy/landing";
import type { LandingClaims } from "../../lib/public/landing-claims";
import { CountUp } from "../ui/count-up";
import { CostSheet } from "./cost-sheet";
import { CreditTips } from "./credit-tips";
import { Icon, type IconName } from "./icons";
import { Lead, rise, Section } from "./section";

const c = landingCopy.credits;
const TOOLS = landingCopy.tools;
/** The picture claims three runs of each of the five tools: it is drawn only when the grant is exactly that. */
const RUNS = 3;

const TILE = "flex flex-none items-center justify-center rounded-[12px] border border-solid text-[color:var(--accent-text)]";

function Tile({ icon, size, quiet }: { icon: IconName; size: number; quiet?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`${TILE} ${quiet ? "h-[38px] w-[38px] border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] !text-[color:var(--fg)]" : "h-[46px] w-[46px] border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border-strong))] bg-[color:color-mix(in_oklab,var(--accent)_12%,transparent)]"}`}
    >
      <Icon name={icon} size={size} />
    </span>
  );
}

/** Pure: whether the grant is exactly three runs of every writing tool, the claim the picture and the sentence make. */
export function coversEveryToolThreeTimes(welcome: LandingClaims["welcome"]): boolean {
  return welcome !== null && welcome.units === TOOLS.length * RUNS;
}

function ThreeTimes({ units }: { units: number }) {
  return (
    <div className="flex flex-col gap-[12px] border-t border-solid border-t-[color:var(--border)] pt-[16px] md:col-span-3">
      <p className="m-0 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">{c.threeTimes(units)}</p>
      <ul aria-hidden="true" className="m-0 grid list-none grid-cols-5 gap-[6px] p-0">
        {TOOLS.map((tool, i) => (
          <li key={tool.id} className="anim-gentle-in flex flex-col items-center gap-[7px] text-center" style={rise(i + 3)}>
            <span className="flex gap-[4px]">
              {Array.from({ length: RUNS }, (_, d) => <i key={d} className="block h-[8px] w-[8px] rotate-45 bg-[color:var(--accent)]" />)}
            </span>
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] text-[color:var(--fg-muted)]">
              <Icon name={tool.icon} size={18} />
            </span>
            <span className="text-[10.5px] font-medium leading-[1.3] text-[color:var(--fg-muted)] md:text-[12px]">{tool.short}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValueBlock({ claims }: { claims: LandingClaims }) {
  const { welcome, buying } = claims;
  const three = welcome !== null && coversEveryToolThreeTimes(welcome);
  const sentence = [three ? (claims.suggestedTwo ? c.enoughV2 : c.enough) : null, buying ? c.keepGoing : null].filter(Boolean).join(" ");
  return (
    <div
      data-testid="landing-value"
      className="anim-gentle-in mt-[22px] flex flex-col gap-[16px] rounded-[16px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border-strong))] bg-[radial-gradient(500px_220px_at_0%_0%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] bg-[color:var(--surface-raised)] p-[20px] md:grid md:grid-cols-[auto_auto_minmax(0,1fr)] md:items-center md:gap-x-[34px] md:gap-y-[24px] md:px-[30px] md:py-[26px]"
      style={rise(0)}
    >
      {welcome && (
        <div className="flex items-center gap-[10px]">
          <Tile icon="gift" size={24} />
          <b className="font-mono text-[52px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--accent-text)]"><CountUp value={welcome.units} /></b>
          <span className="font-sans text-[16px] font-semibold leading-[1.3] text-[color:var(--fg)]">
            {c.welcome.label}
            <small className="mt-[2px] block text-[12.5px] font-normal text-[color:var(--fg-muted)]">{c.welcome.note(welcome.days)}</small>
          </span>
        </div>
      )}
      <div className={`flex items-center gap-[10px] ${welcome ? "border-t border-solid border-t-[color:var(--border)] pt-[14px] md:border-l md:border-t-0 md:pl-[34px] md:pt-0" : ""}`}>
        <Tile icon="sun" size={20} quiet />
        <b className="font-mono text-[30px] font-semibold leading-none text-[color:var(--fg)]">{c.daily.figure}</b>
        <span className="font-sans text-[15px] font-semibold leading-[1.3] text-[color:var(--fg)]">
          {c.daily.label}
          <small className="mt-[2px] block text-[12.5px] font-normal text-[color:var(--fg-muted)]">{c.daily.note}</small>
        </span>
      </div>
      {(sentence !== "" || buying) && (
        <p className="m-0 text-[14.5px] leading-[1.6] text-[color:var(--fg-body)]">
          {sentence}
          {buying && <> <CostSheet buying={buying} /></>}
        </p>
      )}
      {three && welcome && <ThreeTimes units={welcome.units} />}
    </div>
  );
}

const COLUMN = "anim-gentle-in rounded-[14px] border border-solid bg-[color:var(--surface-inset)] p-[18px]";

/**
 * Free versus credits (public landing PR 4b): the value block led by the welcome credits, then the free column and the credits
 * column with their ⓘ tooltips. Every promise that rides a switch (`claims`) is OMITTED when its switch is off, with no off
 * state drawn: no welcome tile and no three-times picture without welcome credits, no "pack or monthly plan" and no price link
 * without payments. The prices live in the sheet (`CostSheet`), never in this section.
 */
export function Credits({ claims }: { claims: LandingClaims }) {
  return (
    <Section id="landing-credits" eyebrow={c.eyebrow} title={c.title} testId="landing-credits" lead={<Lead>{c.lead}</Lead>}>
      <ValueBlock claims={claims} />
      <div className="mt-[24px] flex flex-col gap-[14px] md:grid md:grid-cols-2 md:gap-[22px]">
        <div className={`${COLUMN} border-[color:var(--border)]`} style={rise(1)}>
          <h3 className="m-0 mb-[4px] font-sans text-[17px] font-semibold text-[color:var(--fg)]">{c.free.title}</h3>
          <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{c.free.sub}</p>
          <ul className="m-0 mt-[14px] flex list-none flex-col p-0">
            {c.free.items.map((item) => (
              <li key={item} className="flex items-baseline justify-between gap-[12px] border-t border-solid border-t-[color:var(--border)] py-[9px] text-[14px] leading-[1.45] text-[color:var(--fg-body)] first:border-t-0">
                {item}
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none self-center">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              </li>
            ))}
          </ul>
        </div>
        <div className={`${COLUMN} border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))]`} style={rise(2)}>
          <h3 className="m-0 mb-[4px] font-sans text-[17px] font-semibold text-[color:var(--fg)]">{c.paid.title}</h3>
          <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{c.paid.sub}</p>
          <CreditTips suggestedTwo={claims.suggestedTwo} />
        </div>
      </div>
    </Section>
  );
}
