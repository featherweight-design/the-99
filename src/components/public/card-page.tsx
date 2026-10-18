import { Fragment } from "react";

import { factsFor } from "../../lib/bracket/facts";
import { identityGradient } from "../../lib/cards/gradients";
import { inWubrgOrder } from "../../lib/cards/colors";
import { shortName } from "../../lib/cards/short-name";
import { cardFactName } from "../../lib/copy/card-mark";
import { publicPagesCopy } from "../../lib/copy/public-pages";
import type { PublicCard } from "../../lib/public/card";
import { CardFactMark } from "../cards/card-fact-mark";
import { ManaCost } from "../cards/mana-pips";
import { OracleText } from "../cards/oracle-text";
import { ExternalLink } from "../ui/external-link";
import { PublicCardArt } from "./card-art";
import { commanderPagePath, scryfallCardUrl } from "./links";
import { PublicPrintings } from "./printings";
import { SignedOutBlock } from "./signed-out-block";
import { PublicTopBar } from "./top-bar";

const c = publicPagesCopy.card;

/** The line the catalog joins two faces' rules text with (`modal_dfc` and `transform`; READINESS audit finding 1). */
const FACE_BREAK = "\n//\n";

const LABEL = "font-mono uppercase tracking-[0.14em] text-[color:var(--fg-faint)]";

function identityLabel(identity: string[]): string {
  if (identity.length === 0) return c.colorless;
  if (identity.length === 1) return c.colorName[identity[0]] ?? identity[0];
  return inWubrgOrder(identity).join("/");
}

/** The dot beside the identity: the colour itself for one, the faint neutral for several, none for colorless (A1, A3, A4). */
function identityDot(identity: string[]): string | null {
  if (identity.length === 0) return null;
  return identity.length === 1 ? `var(--${identity[0].toLowerCase()})` : "var(--fg-faint)";
}

const rarityLabel = (rarity: string) => c.rarity[rarity] ?? rarity.charAt(0).toUpperCase() + rarity.slice(1);

/**
 * The rules text, both faces of a two-faced card split by a `// <back name>` rule (A2). The catalog joins the faces with a
 * `//` line; a card whose text holds one face (a `transform` with no back text) draws that face alone, with no rule.
 */
function RulesText({ text, keywords, faces }: { text: string; keywords: string[]; faces: PublicCard["faces"] }) {
  const parts = text.split(FACE_BREAK);
  return (
    <div
      data-testid="public-rules"
      className="mt-[18px] md:mt-[24px] rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[16px] py-[14px] md:px-[20px] md:py-[18px] text-[14px] md:text-[15px] leading-[1.6] md:leading-[1.65] text-[color:var(--fg-body)]"
    >
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <div data-testid="public-rules-face-rule" className="mt-[14px] mb-[12px] flex items-center gap-[10px]">
              <span aria-hidden="true" className="h-px flex-1 bg-[color:var(--border)]" />
              <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{`// ${faces[i]?.name ?? ""}`.trimEnd()}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-[color:var(--border)]" />
            </div>
          ) : null}
          <OracleText text={part} keywords={keywords} symbols />
        </Fragment>
      ))}
    </div>
  );
}

function BracketFacts({ card }: { card: PublicCard }) {
  const facts = factsFor(card.gameChanger, card.bracket);
  if (!facts) return null;
  return (
    <div
      data-testid="public-bracket-facts"
      className="mt-[16px] rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[16px] py-[14px] md:px-[20px] md:py-[16px]"
    >
      <h2 className={`m-0 mb-[10px] font-normal text-[9.5px] md:text-[10px] ${LABEL}`}>{c.bracketFacts}</h2>
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        {facts.map((fact) => (
          <li key={fact} className="flex items-center gap-[10px] text-[14px] md:text-[15px] text-[color:var(--fg-body)]">
            <CardFactMark fact={fact} silent />
            {cardFactName(fact)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px] md:gap-[6px] bg-[color:var(--surface)] px-[12px] py-[11px] md:bg-transparent md:p-0">
      <dt className={`text-[9.5px] md:text-[10px] ${LABEL}`}>{c.facts[label as keyof typeof c.facts]}</dt>
      <dd className="m-0 text-[13px] md:text-[14px]">{children}</dd>
    </div>
  );
}

function FactsRow({ card }: { card: PublicCard }) {
  const dot = identityDot(card.colorIdentity);
  return (
    <dl
      data-testid="public-facts"
      className="m-0 mt-[18px] grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-[color:var(--border)] bg-[color:var(--border)] md:mt-[24px] md:flex md:gap-[44px] md:overflow-visible md:rounded-none md:border-0 md:bg-transparent"
    >
      <Fact label="identity">
        <span className="inline-flex items-center gap-[7px] text-[color:var(--fg)]">
          {dot ? (
            <span
              aria-hidden="true"
              className="inline-block h-[12px] w-[12px] flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.4)]"
              style={{ background: dot }}
            />
          ) : null}
          {identityLabel(card.colorIdentity)}
        </span>
      </Fact>
      <Fact label="rarity">
        <span className="font-mono text-[color:var(--accent)]">{rarityLabel(card.rarity)}</span>
      </Fact>
      <Fact label="commander">
        <span className="text-[color:var(--fg)]">{card.commanderLegal ? c.legal : c.notLegal}</span>
      </Fact>
    </dl>
  );
}

function LinksOut({ card, commanderLinks }: { card: PublicCard; commanderLinks: boolean }) {
  return (
    <div className="mt-[28px] md:mt-[36px] border-b border-b-[color:var(--border)]">
      {commanderLinks && card.commanderSlug ? (
        <a
          href={commanderPagePath(card.commanderSlug)}
          data-testid="public-commander-link"
          className="flex min-h-[52px] items-center justify-between gap-[12px] border-t border-[color:var(--border)] py-[10px] no-underline"
        >
          <span className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-semibold text-[color:var(--accent)]">{c.asCommander(shortName(card.name))}</span>
            <span className="text-[12.5px] text-[color:var(--fg-faint)]">{c.asCommanderSub}</span>
          </span>
          <span aria-hidden="true" className="text-[18px] text-[color:var(--accent)]">→</span>
        </a>
      ) : null}
      <div className="flex min-h-[52px] items-center border-t border-[color:var(--border)]">
        <ExternalLink href={scryfallCardUrl(card.name, card.printings[0]?.scryfallId === card.scryfallId ? card.printings[0] : undefined)} label={c.scryfall} />
      </div>
    </div>
  );
}

/**
 * The public card page (launch epic F3, A1 to A4 and C1). One tree at both widths:
 *
 * - From `md`, two columns in a 1104px frame: the card (with its printing or turn under it) and the signed-out block under
 *   that on the left, 384px; the catalog on the right, at most 640px.
 * - On the phone, one column: the card on a band washed with its own art (or its identity gradient at 18%), the catalog,
 *   then the signed-out block last before the footer.
 *
 * Catalog only: every figure is a field of `PublicCard`. No price, no search box, nothing that reads a visitor.
 */
export function PublicCardPage({
  card,
  commanderLinks,
}: {
  card: PublicCard;
  /** Whether `/commander/[slug]` is served, so the `{name} as a commander` link has somewhere to go (F3 PR 3). */
  commanderLinks: boolean;
}) {
  const pictured = card.imageUri !== null;
  // The read puts the card's own printing first when it has one; only then is the first chip the one pictured.
  const shown = pictured && card.printings[0]?.scryfallId === card.scryfallId ? card.printings[0] : null;
  const printing = shown ? `${shown.setCode.toUpperCase()} · ${shown.collectorNumber}` : null;
  const twoFaces = card.faces.length > 1;
  return (
    <div className="flex min-h-dvh flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
      <PublicTopBar />
      <main
        data-testid="public-card-page"
        className="flex-1 md:px-[40px] md:pt-[52px] md:pb-[80px]"
      >
        {/* Two columns from `lg`: below it the catalog column would be too narrow for a long cost (ten pips, 305px). */}
        <div className="mx-auto grid max-w-[1104px] grid-cols-1 lg:grid-cols-[384px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-[64px]">
          {/* The card. On the phone, a band washed with its own art. */}
          <div className="relative flex flex-col items-center overflow-hidden bg-[color:var(--surface-sunken)] pt-[28px] pb-[22px] lg:col-start-1 lg:row-start-1 md:gap-[18px] md:overflow-visible md:bg-transparent md:p-0">
            <span
              aria-hidden="true"
              data-testid="public-card-wash"
              className="pointer-events-none absolute inset-0 md:hidden"
              style={
                pictured
                  ? { backgroundImage: `url("${encodeURI(card.imageUri!)}")`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(28px)", transform: "scale(1.25)", opacity: 0.55 }
                  : { background: identityGradient(card.colorIdentity), opacity: 0.18 }
              }
            />
            {pictured ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 md:hidden"
                style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--bg) 0%, transparent) 40%, color-mix(in srgb, var(--bg) 92%, transparent) 100%)" }}
              />
            ) : null}
            <div className="relative flex flex-col items-center md:gap-[18px]">
              <PublicCardArt
                name={card.name}
                faces={card.faces}
                imageUri={card.imageUri}
                backImageUri={card.backImageUri}
                colorIdentity={card.colorIdentity}
                printing={printing}
              />
            </div>
          </div>

          {/* The catalog, in the order a stranger reads it (README call 1). */}
          <div className="min-w-0 px-[16px] pt-[22px] lg:col-start-2 lg:row-span-2 lg:row-start-1 md:max-w-[640px] md:px-0 md:pt-[8px]">
            {/* The cost beside the title only from `xl`: at `lg` a ten-pip cost (305px) would leave the title too little room. */}
            <div className="grid xl:grid-cols-[minmax(0,1fr)_auto] xl:gap-x-[24px]">
              <h1 className="m-0 font-display font-bold text-[25px] md:text-[34px] leading-[1.12] text-[color:var(--fg)] [text-wrap:balance] xl:col-start-1">
                {card.faces[0]?.name ?? card.name}
              </h1>
              {twoFaces ? (
                <p
                  data-testid="public-card-back-name"
                  className="m-0 mt-[4px] font-display font-semibold text-[17px] md:text-[20px] leading-[1.2] text-[color:var(--fg-muted)] xl:col-start-1"
                >
                  <span aria-hidden="true" className="mr-[6px] font-mono text-[13px] text-[color:var(--fg-faint)]">{"//"}</span>
                  {card.faces[1].name}
                </p>
              ) : null}
              <div className="mt-[10px] xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:mt-0 xl:pt-[6px]">
                <ManaCost cost={card.manaCost} />
              </div>
              <p className="m-0 mt-[8px] text-[14px] md:mt-[10px] md:text-[15px] leading-[1.45] text-[color:var(--fg-muted)] xl:col-start-1">
                {card.faces.map((f) => f.typeLine).join(" // ")}
              </p>
            </div>
            {card.oracleText ? <RulesText text={card.oracleText} keywords={card.keywords} faces={card.faces} /> : null}
            <BracketFacts card={card} />
            <FactsRow card={card} />
            <PublicPrintings
              name={card.name}
              printings={card.printings}
              capped={card.printingsCapped}
              marked={card.printings[0]?.scryfallId === card.scryfallId}
              pictured={shown !== null}
            />
            <LinksOut card={card} commanderLinks={commanderLinks} />
          </div>

          {/* The signed-out block: under the card from `md`, last before the footer on the phone (README call 4). */}
          <div className="mt-[32px] px-[16px] pb-[36px] lg:col-start-1 lg:row-start-2 md:mt-[40px] md:p-0">
            <SignedOutBlock />
          </div>
        </div>
      </main>
    </div>
  );
}
