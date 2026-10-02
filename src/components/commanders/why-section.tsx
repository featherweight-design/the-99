// "Why this commander" — one paragraph of up to three sentences (#345).
//
// Sentence 1 is the stored string, identical for every player. Sentences 2 and 3 are
// templated from this player's collection, which is why the paragraph cannot be stored
// whole. Each sentence can be absent independently, and when all of them are the section
// unmounts rather than drawing a heading over nothing.

import type { JSX, ReactNode } from "react";
import { explainedCopy, ROLE_SUBJECTS, spellOut } from "../../lib/copy/commander-explained";
import type { RoleName } from "../../lib/recs/score";
import { weakestRole } from "../../lib/recs/weakest-role";
import type { ProfileRoleTargets } from "../../lib/profile/types";
import { roleAnchorId } from "./role-anchor";

/**
 * Draw the figures inside a templated sentence at full strength.
 *
 * The copy file returns whole sentences, so the figures have to be found in the finished
 * string rather than assembled here — the alternative is re-writing the sentence at the
 * call site, which is how the two surfaces drift apart. Each figure is matched once, in
 * order, on a word boundary: "ten" must not match inside "often".
 */
function withFigures(text: string, figures: string[]): ReactNode[] {
  const parts: ReactNode[] = [];
  let rest = text;
  figures.forEach((figure, i) => {
    const at = rest.search(new RegExp(`\\b${figure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
    if (at === -1) return;
    parts.push(rest.slice(0, at));
    parts.push(
      <strong key={i} className="font-[600]" style={{ color: "var(--fg)", fontWeight: 600 }}>
        {figure}
      </strong>,
    );
    rest = rest.slice(at + figure.length);
  });
  parts.push(rest);
  return parts;
}

type WhySectionProps = {
  prose: string | null;
  edhrecOwnedCount: number | null;
  edhrecTotal: number | null;
  roleCounts: Record<RoleName, number>;
  /** The role targets the commander's fit score was graded against, so the role this names as
      thinnest is the one the score docked. */
  roleTargets: ProfileRoleTargets;
  /** The deck holding the most of the owned support, and how many it holds —
      both counted over that one deck. `topDeck` null means there is none. */
  committedSupport?: { count: number; topDeck: string | null };
  width: "desktop" | "phone";
};

export function WhySection({
  prose,
  edhrecOwnedCount,
  edhrecTotal,
  roleCounts,
  roleTargets,
  committedSupport = { count: 0, topDeck: null },
  width,
}: WhySectionProps): JSX.Element | null {
  // The deck clause needs both a deck to name and a count above zero: naming a
  // deck that holds none of these cards is a sentence about nothing.
  const namedDeck =
    committedSupport.topDeck !== null && committedSupport.count > 0
      ? committedSupport.topDeck
      : null;
  const standing =
    edhrecOwnedCount !== null && edhrecTotal !== null
      ? namedDeck !== null
        ? explainedCopy.prose.standingWithDeck(
            edhrecOwnedCount,
            edhrecTotal,
            committedSupport.count,
            { name: namedDeck },
          )
        : explainedCopy.prose.standing(edhrecOwnedCount, edhrecTotal)
      : null;
  const weakest = weakestRole(roleCounts, roleTargets.targets);
  const measured = roleTargets.of !== "flat";

  // State 4: nothing stored and nothing to template. The heading would be a promise the
  // paragraph does not keep, so the whole section goes.
  if (prose === null && standing === null && weakest === null) return null;

  return (
    <div>
      <h2 className="font-display font-[600] m-0" style={{ fontSize: 20, color: "var(--fg)" }}>
        {explainedCopy.prose.heading}
      </h2>
      <p
        className="m-0"
        style={{
          fontSize: 13.5,
          lineHeight: 1.6,
          margin: "8px 0 0",
          maxWidth: 640,
          color: "var(--fg-muted)",
        }}
      >
        {prose !== null && (
          <>
            <span style={{ color: "var(--fg-body)" }}>{prose}</span>{" "}
          </>
        )}
        {standing !== null && (
          <>
            {withFigures(standing, [
              edhrecOwnedCount!.toLocaleString("en-US"),
              edhrecTotal!.toLocaleString("en-US"),
              // The deck clause's count is spelled out in the sentence, so the
              // figure run has to be matched in the same form the copy emitted.
              ...(namedDeck !== null ? [spellOut(committedSupport.count)] : []),
            ])}{" "}
          </>
        )}
        {weakest !== null && (
          <>
            {explainedCopy.prose.gap(weakest.role)}
            {explainedCopy.prose.gapJoin}
            <a
              href={`#${roleAnchorId(width, weakest.role)}`}
              aria-label={explainedCopy.prose.gapLinkAria(ROLE_SUBJECTS[weakest.role])}
              className="text-[var(--accent)] border-b border-b-[color:var(--accent-shadow)]"
            >
              {/* The figures here are not drawn at --fg like the ones in sentence 2: this
                  clause is the link, and a run inside it that changed colour would read as
                  two links. The link ink is the emphasis. */}
              {explainedCopy.prose.gapFigures(weakest.have, weakest.target, measured)}
            </a>
            {explainedCopy.prose.sentenceEnd}
          </>
        )}
      </p>
    </div>
  );
}
