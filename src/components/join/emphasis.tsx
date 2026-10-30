// A line of copy with emphasized phrases (`Parts`, `lib/copy/join.ts`): the `em` pieces are `--fg` at weight 500, the
// rest inherits the body colour. A plain string passes through. A run naming the sender is drawn by `PersonText`, so
// it is marked (`ph-no-capture`) and stays one text node.
import type { Parts } from "../../lib/copy/join";
import { isThirdPartyName, PersonText, type PersonParts } from "../../lib/person-name";

export function Emphasis({ parts }: { parts: string | Parts }) {
  if (typeof parts === "string") return <>{parts}</>;
  // Consecutive plain and named pieces are one run; an `em` piece stands alone.
  const runs: Array<PersonParts | { em: string }> = [];
  for (const p of parts) {
    if (typeof p === "string" || isThirdPartyName(p)) {
      const last = runs[runs.length - 1];
      if (last && !("em" in last)) runs[runs.length - 1] = [...last, p];
      else runs.push([p]);
    } else runs.push(p);
  }
  return (
    <>
      {runs.map((r, i) =>
        "em" in r ? <b key={i} className="font-medium text-[color:var(--fg)]">{r.em}</b> : <span key={i}><PersonText text={r} /></span>,
      )}
    </>
  );
}
