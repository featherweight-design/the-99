// You have a card a friend wants (account 1, 2026-11-22), PROPOSAL: the mirror of the Wishlist's friend-spare press,
// on a FRIEND's wishlist tile, and the sheet it opens with Offer. Built from shipped parts only.
import { MarkedSpareGlyph, SpareGlyph, type SpareMark } from "../src/components/social/spare-key-item";
import { OwnershipDot } from "../src/components/ui/ownership-dot";
import { TOUCH_HIT } from "../src/components/ui/touch-hit";
import { ModalChrome } from "../src/components/decks/receipt-modal";
import { ReplacingLine, Thumb } from "../src/components/decks/stand-ins-sheet";
import { CardDetailTrigger } from "../src/components/cards/card-detail-provider";
import { AnswerPresses } from "../src/components/social/spare-answer";
import { HoverPreviewProvider } from "../src/components/decks/hover-preview";

/** Every new string (copy strings.ts holds the same). */
export const haveCopy = {
  key: { spare: "you can spare", deck: "in your decks", asked: "asked you", offered: "offered", sparing: "sparing" },
  aria: (card: string, kind: "spare" | "deck") => (kind === "spare" ? `You can spare ${card}` : `${card} is in your decks`),
  title: "You have this",
  kicker: (friend: string, wants: number) => `on ${friend}’s wishlist · wants ${wants}`,
  section: (n: number) => `Your copies · ${n}`,
  spare: (n: number) => (n === 1 ? "1 spare" : `${n} spares`),
  spareSub: "not in a deck or draft",
  offer: "Offer",
  offerAria: (friend: string, card: string) => `Offer ${friend} ${card}`,
  offered: "Offered",
  sparing: "Sparing",
  declined: "Declined",
  daysLeft: (n: number) => (n === 1 ? "1 day left" : `${n} days left`),
  asked: (friend: string, n: number) => `${friend} asked for ${n}`,
  inDeck: (n: number) => (n === 1 ? "1 copy" : `${n} copies`),
  foot: {
    offer: (friend: string) => `Offer, and ${friend} answers yes or no. The trade (or the goat) is between you.`,
    offered: (friend: string) => `${friend} has been told. You’ll hear when they answer.`,
    asked: (friend: string) => `${friend} asked you for it. Yes tells them it’s theirs.`,
    sparing: (friend: string) => `${friend} said yes. Hand it over when you meet; your collection stays as it is until you change it.`,
    deck: "Every copy is in a deck, so it isn’t a spare. Free one up and you can offer it here.",
  },
  // The friend's side: a Waiting on you row (kind, title, detail), Yes and No as an ask's.
  waiting: {
    kind: "Spare offer",
    title: (from: string, card: string) => `${from} can spare you ${card}`,
    detail: (from: string, spare: number, want: number) => `${from} has ${spare} spare. You want ${want}.`,
  },
  // The head line's sentence (idea B).
  headCount: (n: number) => (n === 1 ? "you have 1" : `you have ${n}`),
};

export type HaveKind = "spare" | "deck";

/** The tile's press: the #3202 box, over the caption's lower right, the tile press's sibling. */
export function HavePress({ kind, mark = null, name, open = false }: { kind: HaveKind; mark?: SpareMark; name: string; open?: boolean }) {
  return (
    <span className="absolute bottom-[8px] right-[6px] z-[1] md:bottom-[9px] md:right-[8px]">
      <button type="button" aria-label={haveCopy.aria(name, kind)} aria-haspopup="dialog" aria-expanded={open} data-dz="have"
        className={`flex cursor-pointer items-center border-0 bg-transparent p-0 ${TOUCH_HIT}`}>
        <span aria-hidden
          className={`flex h-[26px] min-w-[26px] items-center justify-center rounded-[6px] px-[5px] [border:1px_solid_var(--border-strong)] ${open ? "outline-solid outline-2 outline-offset-[2px] outline-[color:var(--accent)]" : ""}`}
          style={{ background: "var(--surface)", ["--row-bg" as string]: "var(--surface)" }}>
          {kind === "spare" ? <MarkedSpareGlyph mark={mark} size={15} /> : <OwnershipDot owned committed size={8} />}
        </span>
      </button>
    </span>
  );
}

/** The line under the head: the key, only the items a tile draws. */
export function HaveKey({ items, count }: { items: (keyof typeof haveCopy.key)[]; count?: number }) {
  const g = (k: string) => k === "deck" ? <OwnershipDot owned committed size={8} /> : <MarkedSpareGlyph mark={k === "asked" || k === "offered" ? "requested" : k === "sparing" ? "accepted" : null} size={14} />;
  return (
    <p className="m-0 mt-[10px] flex flex-wrap items-center gap-x-[14px] gap-y-[6px] font-mono text-[11px] text-[color:var(--fg-muted)]" style={{ ["--row-bg" as string]: "var(--bg)" }}>
      {count != null ? <span className="text-[color:var(--fg-body)]">{haveCopy.headCount(count)}</span> : null}
      {items.map((k) => <span key={k} className="inline-flex items-center gap-[6px]">{g(k)}{haveCopy.key[k]}</span>)}
    </p>
  );
}

type Row =
  | { kind: "spare"; spare: number; state: "offer" | "offered" | "sparing" | "declined"; days?: number }
  | { kind: "asked"; copies: number; days: number; spare: number }
  | { kind: "deck"; deck: string; art: string; copies: number };

const ASK_INK = "font-semibold text-[color:var(--accent-text)] [border:1px_solid_var(--accent)]";
const PRESS = "flex flex-none cursor-pointer items-center justify-center whitespace-nowrap bg-transparent font-sans h-[36px] min-w-[64px] rounded-[9px] px-[14px] text-[13px] md:h-[32px] md:rounded-[8px]";
const STATUS = "inline-flex flex-none items-center gap-[6px] whitespace-nowrap font-sans text-[13px] font-medium";

function Lead({ children }: { children: React.ReactNode }) {
  return <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center overflow-hidden rounded-[8px] [border:1px_solid_var(--border)]" style={{ background: "var(--bg)" }}>{children}</span>;
}

/** The sheet: the shipped spares-only modal's shell and card box, then YOUR copies with Offer (or the ask's Yes and No). */
export function HaveSheet({ card, friend, wants, rows, foot }: {
  card: { oracleId: string; name: string; imageUri: string }; friend: string; wants: number; rows: Row[]; foot: string;
}) {
  const total = rows.reduce((n, r) => n + (r.kind === "deck" ? r.copies : r.spare), 0);
  return (
    <HoverPreviewProvider waitForMove>
      <ModalChrome title={haveCopy.title} closeLabel="Close" onClose={() => {}} width={640}>
        <div className="flex flex-col gap-[12px] px-[16px] pb-[24px] pt-[14px] md:gap-[14px] md:px-[18px] md:pb-[18px] md:pt-[16px]">
          <section className="flex flex-col gap-[6px] rounded-[10px] border border-[color:var(--border)] px-[13px] pb-[12px] pt-[11px]" style={{ background: "var(--bg)" }}>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: "var(--fg-faint)" }}>{haveCopy.kicker(friend, wants)}</span>
            <ReplacingLine imageUri={card.imageUri}>
              <Thumb imageUri={card.imageUri} side="head" />
              <CardDetailTrigger oracleId={card.oracleId} name={card.name} className="cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-semibold" style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}>{card.name}</CardDetailTrigger>
            </ReplacingLine>
          </section>
          <section className="flex flex-col">
            <div className="flex items-center justify-between gap-[12px] pb-[6px]">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">{haveCopy.section(total)}</span>
            </div>
            <ul role="list" className="m-0 list-none p-0">
              {rows.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px] py-[9px]">
                  {r.kind === "deck" ? (
                    <>
                      <Lead><img src={r.art} alt="" className="block h-full w-full object-cover" /></Lead>
                      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <b className="truncate text-[15px] font-semibold text-[color:var(--fg)]"><span style={{ borderBottom: "1px dotted var(--border-strong)" }}>{r.deck}</span></b>
                        <span className="inline-flex items-center gap-[6px] font-mono text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)]"><OwnershipDot owned committed size={7} />{haveCopy.inDeck(r.copies)}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Lead><span className="text-[color:var(--fact)]" style={{ ["--row-bg" as string]: "var(--bg)" }}><MarkedSpareGlyph mark={r.kind === "asked" || (r.kind === "spare" && r.state === "offered") ? "requested" : r.kind === "spare" && r.state === "sparing" ? "accepted" : null} size={16} /></span></Lead>
                      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <b className="truncate text-[15px] font-semibold text-[color:var(--fg)]">{r.kind === "asked" ? haveCopy.asked(friend, r.copies) : haveCopy.spare(r.spare)}</b>
                        <span className="font-mono text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)]">
                          {r.kind === "asked" ? `${haveCopy.spare(r.spare)} · ${haveCopy.spareSub}` : r.state === "offered" ? haveCopy.daysLeft(r.days ?? 14) : haveCopy.spareSub}
                        </span>
                      </span>
                      {r.kind === "asked" ? (
                        <span className="w-full md:w-auto"><AnswerPresses friend={friend} card={card.name} daysLeft={r.days} busy={null} locked={false} onAnswer={() => {}} size="row" /></span>
                      ) : r.state === "offer" ? (
                        <button type="button" aria-label={haveCopy.offerAria(friend, card.name)} className={`${PRESS} ${ASK_INK}`}>{haveCopy.offer}</button>
                      ) : r.state === "offered" ? (
                        <span className={`${STATUS} text-[color:var(--fg-muted)]`}><MarkedSpareGlyph mark="requested" size={13} />{haveCopy.offered}</span>
                      ) : r.state === "sparing" ? (
                        <span className={`${STATUS} text-[color:var(--success)]`}><MarkedSpareGlyph mark="accepted" size={13} />{haveCopy.sparing}</span>
                      ) : (
                        <span className={`${STATUS} text-[color:var(--fg-muted)]`}>{haveCopy.declined}</span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-[4px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{foot}</p>
          </section>
        </div>
      </ModalChrome>
    </HoverPreviewProvider>
  );
}

export { SpareGlyph };
