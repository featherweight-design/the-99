import type { ReactNode } from "react";

/** The copy module formats every count it interpolates through
    `toLocaleString("en-US")`, so a figure has to be searched for in that form to
    be found inside a rendered sentence. */
export const localised = (v: number) => v.toLocaleString("en-US");

/**
 * Wraps the first occurrence of each value in an emphasised span, in order.
 *
 * The design bolds figures INSIDE finished sentences (`you own 12 of the 40
 * cards…`, `61 of 3,326 are Green · Black and nothing else`), and the copy
 * module owns those sentences whole. Composing them from fragments at the call
 * site would put half of each string in a component file, which is exactly what
 * the copy module exists to prevent — so the sentence is rendered as written and
 * the figures are found within it.
 *
 * A value the sentence does not contain is skipped rather than thrown on: the
 * plural forms differ, so a caller cannot know which figures a given phrasing
 * ended up printing.
 */
export function Emphasised({
  text,
  values,
  color,
  weight = 600,
}: {
  text: string;
  values: string[];
  color: string;
  /** 400 where the drawing marks a figure by colour alone, as the exclusion line
      does; the default bolds, which is what every other marked sentence does. */
  weight?: number;
}) {
  const nodes: ReactNode[] = [];
  let rest = text;
  values.forEach((value, i) => {
    const at = rest.indexOf(value);
    if (at === -1) return;
    nodes.push(rest.slice(0, at));
    // A figure the drawing marks by colour alone is not emphasised, it is tinted,
    // and `<strong>` would put a stress in a screen reader that no sighted reader
    // hears. Only the bolded form claims importance.
    const Tag = weight === 400 ? "span" : "strong";
    nodes.push(
      <Tag key={i} style={{ color, fontWeight: weight }}>
        {value}
      </Tag>,
    );
    rest = rest.slice(at + value.length);
  });
  nodes.push(rest);
  return <>{nodes}</>;
}
