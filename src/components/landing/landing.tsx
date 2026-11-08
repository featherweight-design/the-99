import { landingCopy } from "../../lib/copy/landing";
import type { LandingClaims } from "../../lib/public/landing-claims";
import type { LandingCommander } from "../../lib/public/landing-commanders";
import type { LandingPrecon } from "../../lib/public/landing-precon";
import type { LandingStats } from "../../lib/public/landing-stats";
import { Crowned99 } from "../marks";
import { SIGN_IN_PATH } from "../public/links";
import { Bring } from "./bring";
import { HeroShot, HeroSideCards } from "./hero-phone";
import { Credits } from "./credits";
import { LaunchListProvider, LaunchPanel, type LaunchAction } from "./launch-panel";
import { Loop } from "./loop";
import { rise } from "./section";
import { ThemeSwitch } from "./theme-switch";
import { Written } from "./written";

const c = landingCopy;

const NUMBER_KEYS = ["commanders", "commandersWithProse", "precons", "combos", "cards"] as const;

/**
 * The strip's figures, or null when ANY of the five is missing: a gap is drawn around, never a zero, a dash or a strip with
 * a hole in it (`landing-stats.ts` leaves a failed count out). Pure, so a test pins the drop.
 */
export function numbersOf(stats: LandingStats): { key: (typeof NUMBER_KEYS)[number]; value: string }[] | null {
  const out = [];
  for (const key of NUMBER_KEYS) {
    const n = stats[key];
    if (n === undefined) return null;
    out.push({ key, value: n.toLocaleString("en-US") });
  }
  return out;
}

function TopBar() {
  return (
    <header className="flex flex-none items-center justify-between border-b border-solid border-b-[color:var(--border)] px-[20px] py-[16px] md:px-[40px]">
      <span className="flex items-center gap-[10px] md:gap-[12px]">
        <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-none items-center justify-center">
          <Crowned99 variant="rail-62" className="max-h-[34px] w-auto" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[color:var(--accent-text)] md:tracking-[0.4em]">
          <span className="md:hidden">{c.topBar.wordmarkPhone}</span>
          <span className="max-md:hidden">{c.topBar.wordmark}</span>
        </span>
      </span>
      <a
        href={SIGN_IN_PATH}
        className="inline-flex min-h-[44px] items-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-[16px] font-sans text-[14px] font-semibold text-[color:var(--fg)] no-underline hover:bg-[color:var(--elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:min-h-[36px]"
      >
        {c.topBar.signIn}
      </a>
    </header>
  );
}

function Hero({ commanders }: { commanders: readonly LandingCommander[] }) {
  const shot = commanders.length > 0;
  return (
    <section
      aria-labelledby="landing-title"
      className={`grid px-[20px] pb-[36px] pt-[34px] md:px-[90px] md:pb-[56px] md:pt-[64px] ${
        shot ? "md:grid-cols-[minmax(0,500px)_minmax(0,1fr)] md:gap-x-[56px]" : "md:grid-cols-[minmax(0,500px)]"
      } bg-[radial-gradient(600px_360px_at_50%_22%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] md:bg-[radial-gradient(1000px_520px_at_30%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]`}
    >
      <div className="relative md:col-start-1 md:row-start-1 md:self-end">
        <HeroSideCards commanders={commanders} />
        <p className="anim-gentle-in m-0 font-sans text-[15px] italic text-[color:var(--accent-text)] md:text-[17px]" style={rise(0)}>{c.hero.kicker}</p>
        <h1 id="landing-title" className="anim-gentle-in m-0 mt-[12px] max-w-[262px] text-balance font-display text-[31px] font-extrabold leading-[1.15] text-[color:var(--fg)] md:max-w-none md:text-[46px] md:leading-[1.1]" style={rise(1)}>
          {c.hero.title}
        </h1>
        <p className="anim-gentle-in m-0 mt-[14px] text-pretty text-[15.5px] leading-[1.6] text-[color:var(--fg-body)] md:text-[17px]" style={rise(2)}>{c.hero.line}</p>
        <div className="anim-gentle-in" style={rise(3)}>
          <LaunchPanel />
        </div>
      </div>
      {shot && (
        <div className="anim-gentle-in md:col-start-2 md:row-span-2 md:row-start-1 md:self-center" style={rise(2)}>
          <HeroShot commanders={commanders} />
        </div>
      )}
      <div className="md:col-start-1 md:row-start-2 md:self-start">
        <ThemeSwitch />
      </div>
    </section>
  );
}

function Numbers({ figures }: { figures: NonNullable<ReturnType<typeof numbersOf>> }) {
  return (
    <section
      aria-label={c.numbers.regionLabel}
      data-testid="landing-numbers"
      className="grid grid-cols-2 gap-x-[14px] gap-y-[18px] border-t border-solid border-t-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[20px] py-[26px] md:grid-cols-5 md:gap-[20px] md:px-[90px] md:py-[30px]"
    >
      {figures.map(({ key, value }, i) => (
        <div key={key} className={`anim-gentle-in flex flex-col gap-[4px] ${i === figures.length - 1 ? "max-md:col-span-2" : ""}`} style={rise(i)}>
          <b className="font-mono text-[24px] font-semibold tracking-[-0.01em] text-[color:var(--fg)] md:text-[30px]">{value}</b>
          <span className="text-[12.5px] leading-[1.4] text-[color:var(--fg-muted)]">{c.numbers[key]}</span>
        </div>
      ))}
    </section>
  );
}

function Close() {
  return (
    <section
      aria-labelledby="landing-close"
      className="border-y border-solid border-y-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[20px] pb-[40px] pt-[44px] text-center md:px-[90px] md:pb-[64px] md:pt-[70px]"
    >
      <h2 id="landing-close" className="m-0 mx-auto max-w-[560px] font-display text-[24px] font-bold leading-[1.2] text-[color:var(--fg)] md:text-[32px]">{c.close.title}</h2>
      <div className="mx-auto max-w-[560px]">
        <LaunchPanel />
      </div>
    </section>
  );
}

/**
 * The signed-out landing (public landing PRs 4a and 4b): top bar, hero with the launch panel, theme switch and the hero
 * phone, the numbers strip, how it works, Bring your collection, Written for real, free versus credits (with What credits cost and the tooltips), the
 * close and the credit line. Bring your collection follows the loop; Try it arrives in a later PR and leaves no gap here. The shipped Fan Content notice follows from the shell, so none is
 * drawn here. Every part is one component at both widths; the phone and the desktop differ in layout only, never in content or
 * order. All data comes in as props, read by `app/landing-entry.tsx`.
 */
export function Landing({ stats, commanders, launchAction, precon, claims }: { stats: LandingStats; commanders: readonly LandingCommander[]; launchAction: LaunchAction; precon: LandingPrecon | null; claims: LandingClaims }) {
  const figures = numbersOf(stats);
  return (
    <LaunchListProvider action={launchAction}>
      <main data-testid="landing" className="flex flex-1 flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
        <TopBar />
        <Hero commanders={commanders} />
        {figures && <Numbers figures={figures} />}
        <Loop />
        <Bring />
        <Written commanders={commanders} precon={precon} wordCount={stats.commandersWithProse} publicPages={claims.publicPages} />
        <Credits claims={claims} />
        <Close />
        <p className="m-0 px-[20px] pb-[20px] pt-[22px] text-center text-[11.5px] leading-[1.6] text-[color:var(--fg-muted)] md:px-[34px] md:pt-[24px] md:text-[12px]">
          {c.footer.credit}
        </p>
      </main>
    </LaunchListProvider>
  );
}
