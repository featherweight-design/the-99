// An About entry's caption, drawn as short paragraphs and lists rather than one block.
//
// The caption stays ONE string in `about.ts`, so the content hash and `check:copy-drift` keep
// reading it as they always have. Two marks shape it: a blank line
// (`\n\n`) starts a paragraph, and a block whose every line begins `- ` is a list. Nothing
// else is markup, so a hyphen inside a sentence stays a hyphen.
//
// Both widths render through this one component (the inset and full-width layouts in
// `about-page.tsx` both call it), so the phone and the desktop cannot drift apart.

export type CaptionBlock = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

const ITEM = /^- /;

/** Splits a caption into its paragraphs and lists. A caption with neither mark is one paragraph. */
export function captionBlocks(caption: string): CaptionBlock[] {
  return caption
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block): CaptionBlock => {
      const lines = block.split("\n").map((line) => line.trim());
      return lines.every((line) => ITEM.test(line))
        ? { kind: "ul", items: lines.map((line) => line.replace(ITEM, "")) }
        : { kind: "p", text: lines.join(" ") };
    });
}

/** `muted` is the page intro's ink; an entry's caption is `body`. */
export function EntryCaption({
  caption,
  className = "",
  tone = "body",
}: {
  caption: string;
  className?: string;
  tone?: "body" | "muted";
}) {
  const ink = tone === "muted" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-body)]";
  return (
    <div className={`flex flex-col gap-[8px] text-[13.5px] leading-[1.55] ${ink} ${className}`}>
      {captionBlocks(caption).map((block, i) =>
        block.kind === "p" ? (
          <p key={i}>{block.text}</p>
        ) : (
          <ul key={i} className="flex list-disc flex-col gap-[4px] pl-[18px]">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
