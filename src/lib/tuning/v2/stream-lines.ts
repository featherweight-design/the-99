/**
 * Suggested changes v2's line-by-line read of a streamed reply (handoff H1, G1). Pure. The reply is one JSON object holding
 * one list, `{"additions":[{line},...]}` or `{"cuts":[...]}`; it arrives as text deltas cut anywhere, mid-string or
 * mid-escape. Each line object is handed back the moment its closing brace arrives, so it can be validated and saved
 * while the rest of the reply is still being written.
 *
 * A line is an object directly inside an array directly inside the top-level object. Braces and brackets inside strings
 * do not count, and a backslash escapes the next character (so `\"` never closes a string). A line whose text does not
 * parse is counted as `malformed` and skipped; the lines around it still arrive. `end()` says whether the whole reply
 * closed: a reply cut off mid-line keeps every line that completed before the cut.
 */
export type LineStream = {
  /** Feed the next delta; returns every line object completed by it, in order. */
  push(delta: string): unknown[];
  /** The reply's end: whether the top-level object closed, and how many line objects failed to parse. */
  end(): { complete: boolean; malformed: number };
};

export function lineStream(): LineStream {
  // The open containers, outermost first: "{" or "[".
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let line: string[] | null = null;
  let malformed = 0;
  let closed = false;
  let broken = false;

  const atLineDepth = () => stack.length === 2 && stack[0] === "{" && stack[1] === "[";

  return {
    push(delta) {
      const out: unknown[] = [];
      for (const ch of delta) {
        if (broken) break;
        if (line) line.push(ch);
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === "\\") escaped = true;
          else if (ch === "\"") inString = false;
          continue;
        }
        if (ch === "\"") {
          inString = true;
        } else if (ch === "{" || ch === "[") {
          if (ch === "{" && atLineDepth()) line = [ch];
          if (stack.length === 0) closed = false;
          stack.push(ch);
        } else if (ch === "}" || ch === "]") {
          const open = stack.pop();
          if (open === undefined || (open === "{") !== (ch === "}")) {
            // An unbalanced close: the reply is malformed from here, so no later line is trusted.
            stack.length = 0;
            line = null;
            broken = true;
            continue;
          }
          if (ch === "}" && line && atLineDepth()) {
            try {
              out.push(JSON.parse(line.join("")));
            } catch {
              malformed += 1;
            }
            line = null;
          }
          if (stack.length === 0) closed = true;
        }
      }
      return out;
    },
    end() {
      return { complete: !broken && closed && stack.length === 0 && !inString, malformed };
    },
  };
}
