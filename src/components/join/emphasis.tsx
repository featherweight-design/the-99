// A line of copy with emphasized phrases (`Parts`, `lib/copy/join.ts`): the `em` pieces are `--fg` at weight 500, the
// rest inherits the body colour. A plain string passes through.
import type { Parts } from "../../lib/copy/join";

export function Emphasis({ parts }: { parts: string | Parts }) {
  if (typeof parts === "string") return <>{parts}</>;
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? <span key={i}>{p}</span> : <b key={i} className="font-medium text-[color:var(--fg)]">{p.em}</b>,
      )}
    </>
  );
}
