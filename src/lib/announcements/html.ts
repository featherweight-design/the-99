/** Small HTML text helpers for the Announcements parsers. Pure; no DOM. */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  ndash: "–", mdash: "—", hellip: "…",
  trade: "™", reg: "®", copy: "©",
  szlig: "ß", aelig: "æ", AElig: "Æ", oslash: "ø", Oslash: "Ø",
  eth: "ð", ETH: "Ð", thorn: "þ", THORN: "Þ",
};

/** Latin-1 accented letters, `&acirc;` and the rest, spelled as base letter + accent name. */
const ACCENTS: Record<string, string> = {
  acute: "́", grave: "̀", circ: "̂", uml: "̈", tilde: "̃", cedil: "̧", ring: "̊",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const hex = ref[1] === "x" || ref[1] === "X";
      const code = hex ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    if (Object.hasOwn(NAMED, ref)) return NAMED[ref];
    const accent = /^([a-z])(acute|grave|circ|uml|tilde|cedil|ring)$/i.exec(ref);
    if (accent) return (accent[1] + ACCENTS[accent[2].toLowerCase()]).normalize("NFC");
    return whole;
  });
}

/**
 * Elements that break a line when rendered, so their tags stand for a space. Every other tag is
 * inline (`<i>`, `<em>`, `<a>`, `<span>`…) and drops out with no space, so `<em>Magic</em>'s`
 * reads `Magic's`, not `Magic 's`.
 */
const BLOCK_TAG =
  /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul|deck-list)\b[^>]*>/gi;

/** Visible text of an HTML fragment: tags dropped, entities decoded, whitespace collapsed. */
export function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(BLOCK_TAG, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}
