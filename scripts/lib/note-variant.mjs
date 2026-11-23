// Which credit note landed beside Analyze (Hugh, 2026-10-15).
// Read from the note's rendered words, mirroring the copy in src/lib/copy/synopsis.ts, credits.ts and
// notices.ts; a note matching none is "unknown" and FAILS, so an unexpected variant never passes silently.

export function noteVariant(text) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t === "") return "none";
  if (/^Reads the bracket only; you(’|')ve used your testing share/.test(t)) return "ownerShare";
  if (/^Reads the bracket only; the overview (waits for a credit|stays as it was)\./.test(t)) return "usedUp";
  if (/^Reads the bracket only\. The overview waits until every card is legal/.test(t)) return "check";
  if (/^Also writes the overview, free this once/.test(t)) return "free";
  if (/^Also writes the overview, using a credit\./.test(t)) return "credit";
  return "unknown";
}
