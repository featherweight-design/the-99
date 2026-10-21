import type { Bracket } from "../../lib/bracket/types";
import { identityGradient } from "../../lib/cards/gradients";
import { shortName } from "../../lib/cards/short-name";
import { guildLabel } from "../../lib/copy/color-labels";
import { BRACKET_NAMES } from "../../lib/copy/deck-analysis";
import { publicPagesCopy } from "../../lib/copy/public-pages";
import type { PublicCommander } from "../../lib/public/commander";
import { BracketMark } from "../decks/bracket-mark";
import { PublicCardArt } from "./card-art";
import { cardPagePath, commanderPagePath } from "./links";
import { SignedOutBlock } from "./signed-out-block";
import { PublicTopBar } from "./top-bar";

const c = publicPagesCopy.commander;

/**
 * How many of each list the page draws. The loader reads up to 12 signature and 12 similar commanders, and EDHREC tags a
 * commander with a median of 37 themes (staging, 2026-10-18; at most 244). The boards draw at most 8 themes and 6 of each
 * list (B1, B2), so those are the caps.
 */
export const THEMES_SHOWN = 8;
export const MOST_PLAYED_SHOWN = 6;
export const SIMILAR_SHOWN = 6;

const BRACKETS: readonly Bracket[] = [1, 2, 3, 4, 5];

const number = (n: number) => n.toLocaleString("en-US");

function identityName(identity: string[]): string {
  return identity.length === 0 ? c.colorless : guildLabel(identity.map((x) => x.toUpperCase()));
}

/** The heading's identity line: one pip per color, in the catalog's order, then the identity's name (B1). */
function IdentityRow({ identity }: { identity: string[] }) {
  return (
    <div data-testid="public-commander-identity" className="mt-[10px] flex items-center gap-[5px] md:mt-0">
      {identity.map((color) => (
        <span
          key={color}
          aria-hidden="true"
          className="inline-block h-[14px] w-[14px] flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.4)] md:h-[16px] md:w-[16px]"
          style={{ background: `var(--${color.toLowerCase()})` }}
        />
      ))}
      <span className={`font-mono text-[12px] leading-[normal] text-[color:var(--fg-faint)] ${identity.length > 0 ? "ml-[4px]" : ""}`}>
        {identityName(identity)}
      </span>
    </div>
  );
}

function SectionHead({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <>
      <h2 id={id} className="m-0 font-display font-semibold text-[18px] md:text-[20px] leading-[1.25] text-[color:var(--fg)]">
        {title}
      </h2>
      <p className="m-0 mt-[4px] font-mono text-[11.5px] leading-[1.5] text-[color:var(--fg-faint)]">{sub}</p>
    </>
  );
}

/** `Why this commander`: the stored sentence, the column's lead (README call 3). Unmounted, heading too, when there is none. */
function Why({ prose }: { prose: string }) {
  return (
    <section aria-labelledby="public-commander-why" data-testid="public-commander-why" className="max-w-[640px]">
      <h2 id="public-commander-why" className="m-0 font-display font-semibold text-[18px] md:text-[20px] leading-[normal] text-[color:var(--fg)]">
        {c.why}
      </h2>
      <p className="m-0 mt-[10px] text-[16px] md:text-[17.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty]">{prose}</p>
    </section>
  );
}

/** Rank and deck count (B1). A blank figure drops; with both blank the card unmounts (C4). Never a dash. */
function OnEdhrec({ rank, deckCount }: { rank: number | null; deckCount: number | null }) {
  const figures = [
    rank !== null ? { label: c.rank, value: `#${number(rank)}` } : null,
    deckCount !== null ? { label: c.decks, value: number(deckCount) } : null,
  ].filter((f) => f !== null);
  if (figures.length === 0) return null;
  return (
    <section
      aria-label={c.onEdhrec}
      data-testid="public-commander-edhrec"
      className="box-border max-w-[640px] rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[16px] py-[18px] md:px-[24px] md:py-[22px]"
    >
      <div className="flex items-baseline justify-between gap-[12px] font-mono text-[11px] leading-[normal] text-[color:var(--fg-faint)]">
        <span className="uppercase tracking-[0.14em]">{c.onEdhrec}</span>
        <span>{c.figuresFrom}</span>
      </div>
      <dl className="m-0 mt-[14px] flex gap-[36px] md:gap-[56px]">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col-reverse gap-[6px]">
            <dt className="text-[13px] leading-[normal] text-[color:var(--fg-body)]">{f.label}</dt>
            <dd className="m-0 font-mono font-semibold text-[34px] md:text-[44px] leading-[.95] text-[color:var(--fg)]">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Themes({ tags }: { tags: PublicCommander["tags"] }) {
  const shown = [...tags].sort((a, b) => b.count - a.count).slice(0, THEMES_SHOWN);
  return (
    <section aria-labelledby="public-commander-themes" data-testid="public-commander-themes" className="max-w-[680px]">
      <SectionHead id="public-commander-themes" title={c.themes} sub={c.themesSub} />
      <ul className="m-0 mt-[14px] flex list-none flex-wrap gap-[8px] p-0">
        {shown.map((t) => (
          <li
            key={t.slug}
            className="box-border inline-flex h-[34px] items-center gap-[7px] rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface)] px-[12px]"
          >
            <span className="text-[13.5px] text-[color:var(--fg-body)]">{t.label}</span>
            <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{number(t.count)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The decks' declared brackets, one bar each, scaled to the largest (B1). */
function Brackets({ counts }: { counts: Record<string, number> }) {
  const rows = BRACKETS.map((b) => ({ bracket: b, count: counts[String(b)] ?? 0 }));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <section aria-labelledby="public-commander-brackets" data-testid="public-commander-brackets" className="max-w-[640px]">
      <SectionHead id="public-commander-brackets" title={c.brackets} sub={c.bracketsSub(number(total))} />
      <ul className="m-0 mt-[12px] flex list-none flex-col gap-[4px] p-0">
        {rows.map((r) => (
          <li
            key={r.bracket}
            className="grid min-h-[36px] grid-cols-[26px_82px_minmax(0,1fr)_52px] items-center gap-[12px] md:grid-cols-[26px_92px_minmax(0,1fr)_52px]"
          >
            <BracketMark bracket={r.bracket} px={26} />
            <span className="text-[13.5px] text-[color:var(--fg-body)]">{BRACKET_NAMES[r.bracket]}</span>
            <span aria-hidden="true" className="block h-[8px] overflow-hidden rounded-[99px] bg-[color:var(--elevated)]">
              <span
                data-testid="public-commander-bracket-bar"
                className="block h-full rounded-[99px]"
                style={{ width: `${max > 0 ? (r.count / max) * 100 : 0}%`, background: `var(--bracket-${r.bracket})` }}
              />
            </span>
            <span className="text-right font-mono text-[12px] text-[color:var(--fg)]">{number(r.count)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Rows 47px apart and tiles 48px tall: the boards set a 46px min-height that their borders sit outside. */
function MostPlayed({ short, cards }: { short: string; cards: PublicCommander["signature"] }) {
  return (
    <section aria-labelledby="public-commander-most-played" data-testid="public-commander-most-played" className="max-w-[640px]">
      <SectionHead id="public-commander-most-played" title={c.mostPlayed(short)} sub={c.mostPlayedSub(short)} />
      <ul className="m-0 mt-[12px] list-none border-b border-b-[color:var(--border)] p-0">
        {cards.slice(0, MOST_PLAYED_SHOWN).map((card) => (
          <li key={card.oracleId}>
            <a
              href={cardPagePath(card.slug)}
              className="grid min-h-[47px] grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-[14px] border-t border-[color:var(--border)] no-underline"
            >
              <span className="text-[14.5px] text-[color:var(--fg)]">{card.name}</span>
              <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">
                {card.inclusion !== null ? `${Math.round(card.inclusion)}%` : null}
              </span>
              <span aria-hidden="true" className="text-[color:var(--accent-text)]">→</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Similar({ commanders }: { commanders: PublicCommander["similar"] }) {
  return (
    <section aria-labelledby="public-commander-similar" data-testid="public-commander-similar" className="max-w-[680px]">
      <SectionHead id="public-commander-similar" title={c.similar} sub={c.similarSub} />
      <ul className="m-0 mt-[14px] grid list-none grid-cols-1 gap-[8px] p-0 md:grid-cols-2">
        {commanders.slice(0, SIMILAR_SHOWN).map((s) => (
          <li key={s.oracleId} className="min-w-0">
            <a
              href={commanderPagePath(s.slug)}
              className="flex min-h-[48px] items-center justify-between gap-[10px] rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface)] px-[14px] no-underline"
            >
              <span className="min-w-0 truncate text-[14px] text-[color:var(--fg)]">{s.name}</span>
              <span aria-hidden="true" className="text-[color:var(--accent-text)]">→</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** B3: EDHREC does not index this commander. A settled fact, drawn as the signed-in synergy note's grey chrome. */
function AbsentNote({ short }: { short: string }) {
  return (
    <div
      role="note"
      data-testid="public-commander-absent"
      className="box-content flex max-w-[640px] gap-[10px] rounded-[8px] border border-[color:var(--border-strong)] border-l-2 border-l-[color:var(--fg-faint)] bg-[color:var(--elevated-hover)] px-[16px] py-[13px]"
    >
      <span aria-hidden="true" className="text-[13px] leading-[1.6] text-[color:var(--fg-faint)]">⚠</span>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-muted)]">
        <b className="font-semibold text-[color:var(--fg-body)]">{c.absentTitle(short)}</b>
        {c.absentBody}
      </p>
    </div>
  );
}

/** B4: the support read failed. No Retry: the page is the same cached HTML for everyone, so a visitor has nothing to retry. */
function DegradedNote() {
  return (
    <div
      role="note"
      data-testid="public-commander-degraded"
      className="box-content max-w-[640px] rounded-[9px] border border-[color:var(--border)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--surface-sunken)] px-[16px] py-[13px]"
    >
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-muted)]">
        <b className="font-semibold text-[color:var(--fg-body)]">{c.degradedTitle}</b>
        {c.degradedBody}
      </p>
    </div>
  );
}

function Sections({ commander, short }: { commander: PublicCommander; short: string }) {
  if (commander.state === "absent") return <AbsentNote short={short} />;
  if (commander.state === "degraded") return <DegradedNote />;
  const hasBrackets = Object.values(commander.bracketCounts).some((n) => n > 0);
  return (
    <>
      {commander.prose ? <Why prose={commander.prose} /> : null}
      <OnEdhrec rank={commander.rank} deckCount={commander.deckCount} />
      {commander.tags.length > 0 ? <Themes tags={commander.tags} /> : null}
      {hasBrackets ? <Brackets counts={commander.bracketCounts} /> : null}
      {commander.signature.length > 0 ? <MostPlayed short={short} cards={commander.signature} /> : null}
      {commander.similar.length > 0 ? <Similar commanders={commander.similar} /> : null}
    </>
  );
}

/**
 * The public commander page (launch epic F3, B1 to B4). The card page's shell (`card-page.tsx`), at its breakpoints:
 *
 * - From `lg`, two columns in a 1120px frame: the card, the heading, the identity, the card-page link and the signed-out
 *   block on the left, 384px; the catalog on the right.
 * - Below, one column: the card on a band washed with its own art, the heading, the sections, then the signed-out block.
 *
 * Catalog only: every figure is a field of `PublicCommander`. Its `engine` and `budgetCounts` are never drawn (README call
 * 3), nor is anything that reads a visitor. In `absent` and `degraded` the right column holds the one note.
 */
export function PublicCommanderPage({ commander }: { commander: PublicCommander }) {
  const short = shortName(commander.name);
  // The catalog joins a two-faced card's names with ` // `, as the card page's loader splits them: the flip's labels name
  // each face, so a screen reader hears The Prismatic Bridge rather than "the back".
  const faces = commander.name.split(" // ").map((name) => ({ name }));
  return (
    <div className="flex min-h-dvh flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
      <PublicTopBar />
      <main data-testid="public-commander-page" className="flex-1 md:px-[40px] md:pt-[44px] md:pb-[80px]">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 lg:grid-cols-[384px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-[64px]">
          <div className="flex flex-col md:gap-[14px] lg:col-start-1 lg:row-start-1">
            {/* The card. On the phone, a band washed with its own art. */}
            <div className="relative flex justify-center overflow-hidden bg-[color:var(--surface-sunken)] pt-[26px] pb-[24px] md:overflow-visible md:bg-transparent md:p-0">
              <span
                aria-hidden="true"
                data-testid="public-commander-wash"
                className="pointer-events-none absolute inset-0 md:hidden"
                style={
                  commander.imageUri
                    ? { backgroundImage: `url("${encodeURI(commander.imageUri)}")`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(28px)", transform: "scale(1.25)", opacity: 0.55 }
                    : { background: identityGradient(commander.colorIdentity), opacity: 0.18 }
                }
              />
              {commander.imageUri ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 md:hidden"
                  style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--bg) 0%, transparent) 40%, color-mix(in srgb, var(--bg) 92%, transparent) 100%)" }}
                />
              ) : null}
              <div className="relative flex flex-col items-center">
                <PublicCardArt
                  name={commander.name}
                  faces={faces}
                  imageUri={commander.imageUri}
                  backImageUri={commander.backImageUri}
                  colorIdentity={commander.colorIdentity}
                  printing={null}
                  size="commander"
                />
              </div>
            </div>

            <div className="flex flex-col px-[16px] pt-[20px] md:mt-[10px] md:gap-[4px] md:p-0">
              <span className="font-mono text-[10.5px] leading-[normal] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{c.kicker}</span>
              <h1 className="m-0 mt-[6px] font-display font-bold text-[24px] leading-[1.15] text-[color:var(--fg)] md:mt-[2px]">
                {commander.name}
              </h1>
              <p className="m-0 mt-[6px] text-[13px] leading-[normal] text-[color:var(--fg-body)] md:mt-0">{commander.typeLine}</p>
            </div>

            <div className="px-[16px] md:p-0">
              <IdentityRow identity={commander.colorIdentity} />
            </div>

            <div className="mx-[16px] mt-[10px] border-y border-[color:var(--border)] md:mx-0 md:mt-0 md:border-b-0 md:pt-[4px]">
              <a
                href={cardPagePath(commander.slug)}
                data-testid="public-commander-card-link"
                className="inline-flex min-h-[44px] items-center gap-[8px] text-[14px] font-semibold text-[color:var(--accent-text)] no-underline"
              >
                {c.cardLink}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          {/* The catalog, in the order a stranger reads it (README call 3). */}
          <div
            data-testid="public-commander-sections"
            className="mt-[28px] flex min-w-0 flex-col gap-[32px] px-[16px] md:gap-[40px] md:px-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:pt-[6px]"
          >
            <Sections commander={commander} short={short} />
          </div>

          {/* The signed-out block: last in the left column from `lg`, last before the footer below it (README call 4). */}
          <div className="mt-[36px] px-[16px] pb-[36px] md:p-0 lg:col-start-1 lg:row-start-2 lg:mt-[26px]">
            <SignedOutBlock />
          </div>
        </div>
      </main>
    </div>
  );
}
