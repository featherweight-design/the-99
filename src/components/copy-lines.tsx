import { Fragment } from "react";

/**
 * Draws several copy lines as one run of text, each line in its own span so the copy editor finds each row.
 * The copy editor matches a whole text node (or a whole element) to ONE copy row, so lines joined into a single
 * string with `.join` or a template literal match nothing. The separator sits between the spans, as its own text.
 * Empty entries are dropped, as `.filter(Boolean).join` did.
 */
export function CopyLines({ lines, sep = " " }: { lines: readonly (string | null | undefined | false)[]; sep?: string }) {
  const kept = lines.filter((line): line is string => Boolean(line));
  return (
    <>
      {kept.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && sep}
          <span>{line}</span>
        </Fragment>
      ))}
    </>
  );
}
