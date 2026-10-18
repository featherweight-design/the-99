/**
 * A caption's lead, read by the Reference's closed row and by the ? panel's rows (discovery R2·6a, R2·8). Its own
 * module so the ? can read it in every page's bundle without the Reference's model, which carries the screen frames.
 *
 * The caption's own marks (`entry-caption.tsx`): a blank line starts a paragraph, a `- ` line is a list item.
 */

/** The caption's first paragraph as one line of text (a list reads its items in order), or "" for none. */
function firstParagraph(caption: string): { text: string; items: string[] | null } {
  const block = caption.split(/\n\s*\n/).map((b) => b.trim()).find((b) => b.length > 0);
  if (!block) return { text: "", items: null };
  const lines = block.split("\n").map((l) => l.trim());
  if (lines.every((l) => l.startsWith("- "))) {
    const items = lines.map((l) => l.slice(2));
    return { text: items[0], items };
  }
  return { text: lines.join(" "), items: null };
}

function sentenceOf(text: string): string {
  const m = /^.*?[.?!](?=\s|$)/.exec(text);
  return m ? m[0] : text;
}

/** The first sentence of the caption's first paragraph (a caption that opens with a list reads its first item). */
export function firstSentence(caption: string): string {
  return sentenceOf(firstParagraph(caption).text);
}

/**
 * The rest of the caption's first paragraph after `firstSentence`: an open row's paragraph in the ? (design table
 * R2·8 row 88). "" when the first sentence is the whole paragraph. A list's later items follow its first, in order.
 */
export function restOfFirstParagraph(caption: string): string {
  const { text, items } = firstParagraph(caption);
  const rest = [text.slice(sentenceOf(text).length).trim(), ...(items ? items.slice(1) : [])];
  return rest.filter((r) => r.length > 0).join(" ");
}
