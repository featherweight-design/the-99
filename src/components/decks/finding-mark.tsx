import { CardFactMark } from "../cards/card-fact-mark";
import { ComboGlyph } from "../cards/combo-glyph";
import { TutorGlyph } from "../cards/tutor-glyph";
import type { FindingId } from "../../lib/bracket/findings";

/**
 * The fact mark for a finding: bolt, peak stripped, turn again, lemniscate, drawn up.
 *
 * ALWAYS SILENT. Every surface that draws it — a finding, a climb figure, a receipt header —
 * writes the fact's name in the next element, which is the only condition under which the
 * verdict addendum lets a mark go without a key. A spoken name here would be read twice.
 *
 * `twoCardCombos` and `tutors` have their own modules because `CardFact` names only the three a
 * CARD carries; the other two are facts about the deck.
 */
export function FindingMark({ id }: { id: FindingId }) {
  if (id === "twoCardCombos") return <ComboGlyph />;
  if (id === "tutors") return <TutorGlyph />;
  const fact =
    id === "gameChangers" ? "gameChanger" : id === "massLandDenial" ? "massLandDenial" : "extraTurns";
  return <CardFactMark fact={fact} silent />;
}
