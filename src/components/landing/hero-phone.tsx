import type { CSSProperties } from "react";
import { commandersCopy } from "../../lib/copy/lanes";
import { commandersPlaceCopy } from "../../lib/copy/commanders-place";
import { landingCopy } from "../../lib/copy/landing";
import type { LandingCommander } from "../../lib/public/landing-commanders";

// The hero's screen (public landing PR 4a, call 1): the Commanders page of a made-up player, drawn as STATIC MARKUP in a phone
// frame, with the commanders' art and stored reads from the catalog (`readLandingCommanders`). It is not the signed-in
// component: that one reads a person's collection, and this page has none to read. The fit figures are the example's own
// (`landingCopy.phone.fits`). The art is Scryfall's, drawn as a CSS background like every public surface draws it.
//
// Motion: the cards drift on the shipped `.anim-breathe` (a few px of scale and translate, slow), which the shipped
// reduced-motion guard already stills. Their periods differ so they never move together.

/** The commander name's ink shadow over art: `INK_SHADOW` (`ui/art-wash.tsx`), restated because that module reaches per-user code the public walk refuses. `hero-phone.test.tsx` pins the two together. */
export const NAME_INK_SHADOW = "0 1px 3px rgba(0,0,0,.6)";

const cssUrl = (uri: string) => `url("${encodeURI(uri).replaceAll('"', "%22")}")`;
export const art = (uri: string | null): CSSProperties => (uri ? { backgroundImage: cssUrl(uri), backgroundSize: "cover", backgroundPosition: "center top" } : {});
const drift = (seconds: number, delay: number): CSSProperties => ({ animationDuration: `${seconds}s`, animationDelay: `${delay}s` });

/** A drifting card: the outer box carries the tilt and place, the inner box the drift, so the two transforms never fight. */
function DriftCard({ c, className, seconds, delay }: { c: LandingCommander; className: string; seconds: number; delay: number }) {
  if (!c.imageUri) return null;
  return (
    <span aria-hidden="true" className={`absolute block overflow-hidden rounded-[6px] shadow-[0_12px_28px_rgba(0,0,0,.5)] ${className}`}>
      <span className="anim-breathe block aspect-[63/88] w-full" style={{ ...art(c.imageUri), ...drift(seconds, delay) }} />
    </span>
  );
}

const byName = (list: readonly LandingCommander[], name: string) => list.find((c) => c.name === name);

/** The two small cards at the headline's right on the phone (the words column is their positioning parent). */
export function HeroSideCards({ commanders }: { commanders: readonly LandingCommander[] }) {
  const [jace, yshtola] = [byName(commanders, "Jace, Multiverse Architect"), byName(commanders, "Y'shtola, Night's Blessed")];
  if (!jace && !yshtola) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute right-[-4px] top-[30px] h-[190px] w-[118px] md:hidden">
      {yshtola && <DriftCard c={yshtola} className="right-[40px] top-[34px] z-[1] w-[80px] -rotate-[7deg]" seconds={7} delay={0} />}
      {jace && <DriftCard c={jace} className="right-[6px] top-0 z-[2] w-[80px] rotate-[9deg]" seconds={6} delay={0} />}
    </div>
  );
}

function Row({ c, rank }: { c: LandingCommander; rank: number }) {
  const fit = landingCopy.phone.fits[c.name];
  return (
    <div className="overflow-hidden rounded-[14px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="relative h-[150px] overflow-hidden bg-[color:var(--surface-sunken)]" style={art(c.artCropUri)}>
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,color-mix(in_oklab,var(--bg)_88%,transparent))]" />
        <span className="absolute bottom-[10px] left-[12px] z-[2] flex items-center gap-[8px] whitespace-nowrap font-display text-[14px] font-bold text-[color:var(--fg)]" style={{ textShadow: NAME_INK_SHADOW }}>
          <em className="font-sans text-[15px] font-semibold not-italic text-[color:var(--accent-text)]">{rank}</em>
          {c.name}
          <span className="inline-flex gap-[3px]">
            {c.colorIdentity.map((k) => (
              <i key={k} className="block h-[7px] w-[7px] rounded-[1px]" style={{ background: `var(--${k.toLowerCase()})` }} />
            ))}
          </span>
        </span>
        {fit !== undefined && (
          <span className="absolute bottom-[10px] right-[10px] z-[3] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:color-mix(in_oklab,var(--bg)_85%,transparent)] px-[10px] py-[5px] text-center">
            <b className="block font-sans text-[20px] font-semibold leading-none text-[color:var(--fg)]">{fit}</b>
            <span className="font-mono text-[9px] tracking-[0.08em] text-[color:var(--fg-faint)]">{commandersCopy.row.fitDenominator}</span>
          </span>
        )}
      </div>
      {c.prose && <p className="m-0 px-[14px] pb-[14px] pt-[12px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.prose}</p>}
    </div>
  );
}

/** The phone and, from `md`, the three cards fanned around it. */
export function HeroShot({ commanders }: { commanders: readonly LandingCommander[] }) {
  const rows = commanders.slice(0, 2);
  const [jace, yshtola, tam] = [byName(commanders, "Jace, Multiverse Architect"), byName(commanders, "Y'shtola, Night's Blessed"), byName(commanders, "Tam, the Possibility")];
  const tabs = commandersPlaceCopy.tabs;
  return (
    <div className="relative mx-auto mt-[28px] h-[500px] w-[340px] max-w-full md:ml-auto md:mr-0 md:mt-0 md:h-[560px] md:w-[560px]">
      <div className="max-md:hidden">
        {jace && <DriftCard c={jace} className="right-0 top-[50px] z-[2] w-[160px] rotate-[9deg]" seconds={6.5} delay={0} />}
        {yshtola && <DriftCard c={yshtola} className="left-[20px] top-[200px] z-[2] w-[160px] -rotate-[11deg]" seconds={7.5} delay={0.4} />}
        {tam && <DriftCard c={tam} className="right-[30px] top-[330px] z-[2] w-[160px] rotate-[4deg]" seconds={8} delay={0.8} />}
      </div>
      <div
        role="img"
        aria-label={landingCopy.phone.label}
        data-testid="landing-phone"
        className="absolute left-[45px] top-0 z-[3] h-[490px] w-[250px] overflow-hidden rounded-[26px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] shadow-[0_18px_44px_rgba(0,0,0,.55)] md:left-[140px] md:h-[560px] md:w-[300px] md:-rotate-2"
      >
        {/* The screen is drawn at the phone's own scale: `zoom` shrinks the page-sized drawing to the frame. */}
        <div aria-hidden="true" className="flex flex-col gap-[10px] px-[14px] pb-0 pt-[16px] font-sans text-[color:var(--fg)] [zoom:0.72] md:[zoom:0.86]">
          <div className="flex gap-[16px] border-b border-solid border-b-[color:var(--border)] px-[2px] text-[14px] text-[color:var(--fg-muted)]">
            <span className="whitespace-nowrap border-b-2 border-solid border-b-[color:var(--accent)] py-[8px] font-medium text-[color:var(--fg)]">{tabs.foryou}</span>
            <span className="whitespace-nowrap py-[8px]">{tabs.discover}</span>
            <span className="whitespace-nowrap py-[8px]">{tabs.choose}</span>
          </div>
          <b className="mt-[4px] font-display text-[19px] font-bold">{commandersPlaceCopy.title}</b>
          {rows.map((c, i) => (
            <Row key={c.name} c={c} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
