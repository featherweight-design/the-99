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
    if (ref in NAMED) return NAMED[ref];
    const accent = /^([a-z])(acute|grave|circ|uml|tilde|cedil|ring)$/i.exec(ref);
    if (accent) return (accent[1] + ACCENTS[accent[2].toLowerCase()]).normalize("NFC");
    return whole;
  });
}

/** Visible text of an HTML fragment: tags dropped, entities decoded, whitespace collapsed. */
export function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}
