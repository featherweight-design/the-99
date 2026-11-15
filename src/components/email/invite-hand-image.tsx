import { inviteHandCopy } from "../../lib/copy/emails";
import { reveal } from "../../lib/person-name/reveal";
import type { ThirdPartyName } from "../../lib/person-name";

/**
 * The hand of cards at the top of the invite email (branded emails R2, G1): the sender's card face up, tilted -5 degrees over two
 * of The 99's card backs, in a soft brass glow, on a TRANSPARENT ground. 560x540, the board's 280x270 at 2x, so every figure here
 * is the board's doubled (`design/design_handoff_the99_emails/scratch-gen/invite-hero.html` is the reference; nothing is copied
 * from it). With no `face` the top card is one more back (the 99's crown over INVITATION): the plain hand, which is also what
 * `scripts/gen-email-images.mts` writes to `public/email/`.
 *
 * NOT a page component: it renders once into a PNG by `next/og`, which reads no stylesheet, so its colours are the email palette's
 * literals, and every box with more than one child is `display: flex` (the renderer's rule). It draws the sender's NAME as pixels,
 * which is why this file is the one `REVEAL_ALLOW` entry for it: an email image is not a page, and PostHog never sees it.
 */
export const HAND_SIZE = { width: 560, height: 540 } as const;

const INK = "#14110E";
const PANEL = "#1E1A15";
const BOX = "#2A241D";
const LINE = "#3A3229";
const BRASS = "#C9A24B";
const TEXT = "#EDE6D8";
const MUTED = "#C6B79A";
const FAINT = "#8E8269";

/** A brass diamond drawn as a rotated square: the renderer's fonts have no ◆, and it would fetch one from the network for it. */
function Diamond({ size }: { size: number }) {
  return <div style={{ display: "flex", width: size, height: size, background: BRASS, transform: "rotate(45deg)" }} />;
}

export type HandFace = { name: ThirdPartyName; commanderName: string; art: string };

/** A card back: the crowned 99 and INVITATION on the top one, the hatched ground alone on the two beneath. */
function Back({ word, transform }: { word: boolean; transform: string }) {
  return (
    <div style={{ position: "absolute", left: 130, top: 56, width: 300, height: 420, borderRadius: 18, background: INK, padding: 12, display: "flex", transform, boxShadow: "0 12px 24px rgba(0,0,0,.4), inset 0 0 0 2px " + LINE }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", borderRadius: 12, border: "2px solid #4A4035", background: `radial-gradient(circle at 50% 46%, rgba(201,162,75,.25), rgba(30,26,21,0) 72%), ${PANEL}` }}>
        {word ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: TEXT, fontFamily: "Display", fontWeight: 700, fontSize: 72, lineHeight: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
                <Diamond size={14} />
                <Diamond size={20} />
                <Diamond size={14} />
              </div>
              <div style={{ display: "flex" }}>99</div>
            </div>
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 15, letterSpacing: "0.35em", color: BRASS }}>{inviteHandCopy.backWord}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Face({ face }: { face: HandFace }) {
  const name = reveal(face.name);
  const rules = inviteHandCopy.rules(name);
  return (
    <div style={{ position: "absolute", left: 130, top: 56, width: 300, height: 420, borderRadius: 18, padding: 8, display: "flex", transform: "translate(-28px, 0px) rotate(-5deg)", background: LINE, boxShadow: "0 12px 28px rgba(0,0,0,.45), 0 0 0 2px rgba(0,0,0,.5)" }}>
      <img src={face.art} width={300} height={420} style={{ position: "absolute", left: 0, top: 0, width: 300, height: 420, borderRadius: 18, objectFit: "cover" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", height: "100%", borderRadius: 14, background: INK, padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", height: 34, borderRadius: 8, background: BOX, padding: "0 12px", color: TEXT, fontFamily: "Display", fontWeight: 700, fontSize: 18 }}>
          <div style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 232 }}>{name}</div>
        </div>
        <div style={{ display: "flex", height: 176, borderRadius: 6, overflow: "hidden" }}>
          <img src={face.art} width={256} height={176} style={{ width: 256, height: 176, objectFit: "cover" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 28, borderRadius: 6, background: BOX, padding: "0 12px", color: TEXT, fontFamily: "Sans", fontSize: 15 }}>
          <div style={{ display: "flex" }}>{inviteHandCopy.type}</div>
          <Diamond size={10} />
        </div>
        <div style={{ display: "flex", flex: 1, borderRadius: 6, background: PANEL, padding: "10px 12px", color: MUTED, fontFamily: "Sans", fontSize: 14, lineHeight: 1.4 }}>{rules}</div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", color: FAINT, fontFamily: "Mono", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          <div style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{inviteHandCopy.credit(face.commanderName)}</div>
          <div style={{ display: "flex" }}>{inviteHandCopy.mark}</div>
        </div>
      </div>
    </div>
  );
}

export function InviteHand({ face }: { face: HandFace | null }) {
  return (
    <div style={{ position: "relative", display: "flex", width: HAND_SIZE.width, height: HAND_SIZE.height }}>
      <div style={{ position: "absolute", left: 20, top: 10, width: 520, height: 520, background: "radial-gradient(circle closest-side at 50% 50%, rgba(201,162,75,.42), rgba(201,162,75,.12) 60%, rgba(201,162,75,0) 100%)" }} />
      <Back word={false} transform="translate(68px, 12px) rotate(11deg)" />
      <Back word={false} transform="translate(34px, 4px) rotate(4deg)" />
      {face ? <Face face={face} /> : <Back word transform="translate(-28px, 0px) rotate(-5deg)" />}
    </div>
  );
}
