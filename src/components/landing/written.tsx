import { landingCopy } from "../../lib/copy/landing";
import type { LandingCommander } from "../../lib/public/landing-commanders";
import type { LandingPrecon } from "../../lib/public/landing-precon";
import { commanderPagePath } from "../public/links";
import { CropArt, NAME_INK_SHADOW } from "./hero-phone";
import { ART_CROP_TRIM } from "../ui/art-crop-trim";
import { PreconCard } from "./precon-card";
import { Lead, rise, Section } from "./section";

const c = landingCopy.written;

/** The two commanders the board draws (Y'shtola and Tam): the hero phone's other cards, so the page names three commanders in all. */
export const WRITTEN_COMMANDERS = ["Y'shtola, Night's Blessed", "Tam, the Possibility"] as const;

/** Pure: the commanders to draw, in the board's order, each only with a stored read. */
export function writtenCommanders(commanders: readonly LandingCommander[]): LandingCommander[] {
  return WRITTEN_COMMANDERS.flatMap((name) => {
    const found = commanders.find((x) => x.name === name);
    return found && found.prose ? [found] : [];
  });
}

const CARD = "anim-gentle-in flex flex-col overflow-hidden rounded-[14px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-inset)]";
const BODY = "m-0 text-[14px] leading-[1.6] text-[color:var(--fg-body)]";

function CommanderCard({ commander, link, n }: { commander: LandingCommander; link: boolean; n: number }) {
  return (
    <article className={CARD} style={rise(n)}>
      <div className={`relative h-[150px] overflow-hidden bg-[color:var(--surface-sunken)] ${commander.artCropUri ? ART_CROP_TRIM.box : ""}`}>
        {commander.artCropUri && <CropArt uri={commander.artCropUri} />}
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,.7))]" />
        <h3 className="absolute bottom-[10px] left-[14px] z-[2] m-0 flex items-center gap-[8px] font-display text-[15px] font-bold text-[color:var(--fg)]" style={{ textShadow: NAME_INK_SHADOW }}>
          {commander.name}
          <span aria-hidden="true" className="inline-flex gap-[3px]">
            {commander.colorIdentity.map((k) => (
              <i key={k} className="block h-[7px] w-[7px] rounded-[1px]" style={{ background: `var(--${k.toLowerCase()})` }} />
            ))}
          </span>
        </h3>
      </div>
      <div className="flex flex-1 flex-col gap-[10px] px-[16px] pb-[16px] pt-[14px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.commanderKicker}</span>
        <p className={BODY}>{commander.prose}</p>
        {link && (
          <a
            href={commanderPagePath(commander.slug)}
            className="mt-auto inline-flex min-h-[44px] items-center text-[13.5px] text-[color:var(--accent-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:min-h-[32px]"
          >
            {c.open}
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * Written for real (public landing PR 4b): stored words a visitor reads without a call. A commander card links to its public
 * page ONLY while public pages are on (`publicPages`); the precon card never links. Nothing here is drawn for what the catalog did
 * not return: no commander with a stored read, no card; no precon, no precon card; neither, no section.
 */
// One card keeps a readable width instead of a third of the row; two share the row; the board's three fill it.
const COLUMNS: Record<number, string> = { 1: "md:max-w-[460px] md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3" };

export function Written({ commanders, precon, wordCount, publicPages }: { commanders: readonly LandingCommander[]; precon: LandingPrecon | null; wordCount: number | undefined; publicPages: boolean }) {
  const cards = writtenCommanders(commanders);
  if (cards.length === 0 && !precon) return null;
  const lead = cards.length > 0 && precon ? c.leadBoth : cards.length > 0 ? c.leadCommanders : c.leadPrecon;
  return (
    <Section
      id="landing-written"
      eyebrow={c.eyebrow}
      title={wordCount === undefined || cards.length === 0 ? c.titleNoCount : c.title(wordCount)}
      testId="landing-written"
      lead={<Lead>{lead}</Lead>}
    >
      <div className={`mt-[24px] flex flex-col gap-[16px] md:grid md:gap-[22px] ${COLUMNS[Math.min(cards.length + (precon ? 1 : 0), 3)]}`}>
        {cards.map((commander, i) => (
          <CommanderCard key={commander.name} commander={commander} link={publicPages} n={i} />
        ))}
        {precon && <PreconCard precon={precon} n={cards.length} className={CARD} />}
      </div>
    </Section>
  );
}
