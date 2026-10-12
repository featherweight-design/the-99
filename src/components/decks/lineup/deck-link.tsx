import Link from "next/link";
import { IdentityMark } from "./identity-mark";

/** A deck's name as the Stats view draws it everywhere: its identity mark, then a link to the deck
 *  with the tile's dotted accent underline (handoff R1 call 11). */
export function DeckName({ id, name, identity, small = false, accent = false, bold = accent }: {
  id: string;
  name: string;
  identity: readonly string[];
  small?: boolean;
  /** The chosen deck: its name in accent. */
  accent?: boolean;
  /** And at 600, which Worth and Jobs draw and a bracket chip does not. */
  bold?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-[7px]">
      <IdentityMark identity={identity} />
      <Link
        href={`/decks/${id}`}
        className={`min-w-0 truncate underline decoration-dotted decoration-[color:var(--accent)] underline-offset-[3px] ${small ? "text-[12.5px]" : "text-[13px]"} leading-[1.4] ${accent ? "text-[color:var(--accent)]" : "text-[color:var(--fg)]"} ${bold ? "font-semibold" : ""}`}
      >
        {name}
      </Link>
    </span>
  );
}
