import type { ReactNode } from "react";
import { manaSymbolBackground } from "../../lib/cards/mana-symbols";
import { spokenManaSymbol } from "../../lib/copy/card-surfaces";

// Renders oracle text with paragraph breaks, italic reminder text, and bolded keywords.
/**
 * A run of plain text with each mana symbol (`{R}`, `{X}`, `{T}`) drawn as its printed symbol at the text's own size,
 * spoken as the symbol. A token the sprite has no art for stays as written.
 */
function withSymbols(text: string, key: string): ReactNode[] {
  return text.split(/(\{[^}]+\})/).filter(Boolean).map((part, i) => {
    const background = /^\{[^}]+\}$/.test(part) ? manaSymbolBackground(part.slice(1, -1)) : null;
    if (!background) return part;
    return (
      <span
        key={`${key}-${i}`}
        role="img"
        aria-label={spokenManaSymbol(part)}
        className="inline-block rounded-full align-[-0.15em] mx-[0.06em] w-[1em] h-[1em]"
        style={background}
      />
    );
  });
}

/**
 * `symbols` draws each mana symbol in the text as its printed symbol (the public card page, A1 to A4). Off, the text is
 * drawn as card details has always drawn it.
 */
export function OracleText({ text, keywords, symbols = false }: { text: string; keywords: string[]; symbols?: boolean }) {
  const plain = (run: string, key: string): ReactNode | ReactNode[] => (symbols ? withSymbols(run, key) : run);
  const paragraphs = text.split("\n");

  // Build a regex that matches parenthesized runs and keyword occurrences.
  // Keywords are matched at word boundaries, case-insensitively, outside parens.
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  function renderParagraph(para: string, idx: number) {
    // Tokenize into: (paren runs), keyword runs, and plain text.
    // Process character by character: collect paren spans, then keyword matches on the rest.
    const parts: ReactNode[] = [];
    let remaining = para;
    let key = 0;

    while (remaining.length > 0) {
      // Check for parenthesized run next.
      const parenStart = remaining.indexOf("(");
      const kwPattern = escaped.length > 0
        ? new RegExp(`\\b(${escaped.join("|")})\\b`, "i")
        : null;
      const kwMatch = kwPattern ? kwPattern.exec(remaining) : null;

      // Determine which comes first: paren or keyword.
      const parenIdx = parenStart === -1 ? Infinity : parenStart;
      const kwIdx = kwMatch ? kwMatch.index : Infinity;

      if (parenIdx === Infinity && kwIdx === Infinity) {
        // Only plain text remains.
        parts.push(plain(remaining, `p${key++}`));
        break;
      }

      if (parenIdx <= kwIdx) {
        // Flush text before paren.
        if (parenStart > 0) {
          parts.push(plain(remaining.slice(0, parenStart), `p${key++}`));
        }
        const parenEnd = remaining.indexOf(")", parenStart);
        if (parenEnd === -1) {
          // Unclosed paren — treat rest as plain text.
          parts.push(plain(remaining.slice(parenStart), `p${key++}`));
          break;
        }
        const parenContent = remaining.slice(parenStart, parenEnd + 1);
        parts.push(<em key={key++} className="italic">{plain(parenContent, `e${key}`)}</em>);
        remaining = remaining.slice(parenEnd + 1);
      } else {
        // Keyword comes first — flush text before it.
        if (kwMatch!.index > 0) {
          parts.push(plain(remaining.slice(0, kwMatch!.index), `p${key++}`));
        }
        parts.push(
          <strong key={key++} className="font-semibold" style={{ color: "var(--fg)", fontWeight: 600 }}>
            {kwMatch![0]}
          </strong>
        );
        remaining = remaining.slice(kwMatch!.index + kwMatch![0].length);
      }
    }

    return <p key={idx} className={idx > 0 ? "mt-[0.5em]" : ""}>{parts}</p>;
  }

  return <>{paragraphs.map(renderParagraph)}</>;
}
