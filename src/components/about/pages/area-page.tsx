// One of About's six pages (About visual build, plan `2026-10-27-about-visual.md`, PR 3, Task 3.1; handoff
// `design/design_handoff_the99_about_visual/`, call 3, boards Decks-Phone and Decks-Desktop `.ap`).
//
// The head (About The 99, the area's name and line), the six pages in the shipped place strip, On this page, then each
// section the reader is drawn, in order, at `#<section id>`: its labelled screen, then Good to know (PR 4: the rules the
// reader is drawn, none and no heading when there are none), then Try it (PR 5: the section's tool cards, none and no
// heading when there are none). A Show me landing (`?lit=`) lights its label through `LabelLanding`. Reached by the ?
// (PR 6a), the page holds "‹ Back to {screen}" at its top (`BackBar`) while `from` is in the address.

import { PlaceStrip, type PlaceTab } from "../../place/place-strip";
import { ABOUT_AREAS, type AboutArea } from "../../../lib/copy/about-pages";
import { aboutMenuCopy } from "../../../lib/copy/about";
import type { ScreenModel } from "../../../lib/about/pins";
import { LabelledScreen } from "./labelled-screen";
import { OnThisPage } from "./on-this-page";
import { GoodToKnow, type RuleCardModel } from "./rule-card";
import { TryIt } from "./try-it";
import { LabelLanding, type Landable, type PageCard } from "../../discovery/label-landing";
import { ThemeRefresh } from "./theme-refresh";
import { BackBar } from "./back-bar";

export type AreaSection = {
  id: string;
  name: string;
  sub: string;
  phone: ScreenModel;
  desktop: ScreenModel;
  /** The section's Good to know rules this reader is drawn, in order. */
  rules: readonly RuleCardModel[];
  /** The section's tool cards this reader is drawn, in order (`pageTools`). */
  tools: readonly PageCard[];
};

// The strip links the six pages to each other. Its links carry no `from`, so moving between pages ends the ?'s trip.
const TABS: readonly PlaceTab[] = ABOUT_AREAS.map((a) => ({ place: a.id, href: `/about/${a.id}`, label: a.name }));

export function AreaPage({
  area, sections, theme, landable = {}, initialLit = null, back = null,
}: {
  area: AboutArea;
  sections: readonly AreaSection[];
  /** The theme the captures were chosen in: a theme picked after it asks the server again. */
  theme: string;
  /** The labels this page can land a Show me on, and whether each is New to the reader (`landableIn`). */
  landable?: Landable;
  /** The request's `?lit=` when it names a landable label, so the first paint is already lit. */
  initialLit?: string | null;
  /** The ?'s way back: the validated `from` and the screen it names, or null when the request carried none. */
  back?: { from: string; screen: string } | null;
}) {
  const copy = ABOUT_AREAS.find((a) => a.id === area)!;
  return (
    <div
      className={`flex flex-col pb-[30px] md:px-[30px] md:pb-[64px] ${
        // The back bar's height, so a section brought into view starts under it, not behind it.
        back ? "[--about-back-h:47px] md:[--about-back-h:51px]" : ""
      }`}
    >
      {back && <BackBar from={back.from} screen={back.screen} />}
      <div className="w-full max-w-[1180px]">
        <header className="flex flex-col gap-[6px] px-[16px] pt-[18px] md:px-0 md:pt-[30px]">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">
            {aboutMenuCopy.label}
          </span>
          <h1 className="m-0 font-display text-[27px] font-semibold text-[color:var(--fg)] md:text-[34px] md:tracking-[0.01em]">
            {copy.name}
          </h1>
          <p className="m-0 text-[14.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.line}</p>
        </header>
        <PlaceStrip
          tabs={TABS}
          current={area}
          ariaLabel={aboutMenuCopy.label}
          testIdPrefix="about-page"
          frame="mt-[14px] px-[8px] md:mt-[22px] md:px-0"
        />
        <ThemeRefresh drawnIn={theme} />
        <OnThisPage sections={sections.map((s) => ({ id: s.id, name: s.name }))} />
        <LabelLanding landable={landable} initialLit={initialLit} initialFrom={back !== null} cards={sections.flatMap((s) => s.tools)}>
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-name`}
              // Under the back bar a section is brought in with its top rule tucked under the bar's own (Ways-In: the
              // section's head sits right under the bar, one rule between them); with no bar, 16px clear.
              className={`flex ${back ? "scroll-mt-[calc(var(--about-back-h)-1px)]" : "scroll-mt-[16px]"} flex-col gap-[16px] border-t border-t-[color:var(--border)] px-[16px] pb-[30px] pt-[26px] md:gap-[20px] md:px-0 md:pb-[40px] md:pt-[34px] ${
                i === 0 ? "mt-[18px]" : ""
              }`}
            >
              <div className="flex flex-col gap-[3px]">
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
                  {copy.name} · {s.name}
                </span>
                <h2 id={`${s.id}-name`} className="m-0 font-display text-[21px] font-semibold text-[color:var(--fg)] md:text-[24px]">
                  {s.name}
                </h2>
                <p className="m-0 text-[13.5px] text-[color:var(--fg-muted)]">{s.sub}</p>
              </div>
              <LabelledScreen phone={s.phone} desktop={s.desktop} />
              <GoodToKnow sectionId={s.id} rules={s.rules} />
              <TryIt sectionId={s.id} cards={s.tools} />
            </section>
          ))}
        </LabelLanding>
      </div>
    </div>
  );
}
