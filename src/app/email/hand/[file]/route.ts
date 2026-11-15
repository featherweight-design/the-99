import { InviteHand, HAND_SIZE } from "../../../../components/email/invite-hand-image";
import { readHero } from "../../../../lib/invites/hero-read";
import { inviteSecret } from "../../../../lib/invites/tokens";
import { inlineImage, servePreview } from "../../../../lib/og/serve";

/**
 * The invite email's hand image (branded emails R2, G1; eng item 3): `GET /email/hand/<key>.png`, drawn by `next/og` when a mail
 * client fetches it (Gmail's proxy, Apple Mail's prefetch), never inside a send. Public, with no session: its path has a dot, so
 * `src/proxy.ts` skips it, and this route refuses bad input itself. The key is the sealed reservation id (`heroKey`); a live email
 * invite draws the sender's hand (their name and commander art, read through `readInviteSender`), and EVERYTHING else (a malformed
 * key, one this server did not make, a gone or ended invite, Scryfall not answering) draws the plain hand, never a 404, so an old
 * email still shows an image and an unknown key reveals nothing. The plain answers are `no-store` only when the art could not be
 * fetched (`servePreview`'s fallback); a deliberate plain hand is cached.
 */
export const dynamic = "force-dynamic";

/** The picture of a live invite: an hour, short because the invite can end (a revoked invite's hand may still show in a client for that long). The plain hand is a static picture. */
const LIVE_CACHE = "public, max-age=3600";
const PLAIN_CACHE = "public, max-age=86400";
const KEY_SHAPE = /^[A-Za-z0-9_-]{59}\.png$/;

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
  const { file } = await params;
  const secret = inviteSecret({ INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET });
  const plain = () => servePreview({
    key: ["invite-hand-plain"], revalidate: 604800, label: "invite hand (plain)", size: HAND_SIZE, cacheControl: PLAIN_CACHE,
    draw: async () => InviteHand({ face: null }),
  });
  if (!KEY_SHAPE.test(file)) return plain();
  const key = file.slice(0, -4);
  let view;
  try {
    view = await readHero(key, secret);
  } catch (error) {
    // A read failure draws the plain hand, uncached: the next fetch tries again.
    console.warn("[email-hand] read failed:", error instanceof Error ? error.name : "unknown");
    const res = await plain();
    return new Response(res.body, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
  }
  if (view.kind === "plain") return plain();
  const { name, commander } = view;
  return servePreview({
    // Keyed on the sealed key itself: it never leaves the server's data cache, and a change of the sender's face reaches the next
    // revalidation.
    key: ["invite-hand", key],
    revalidate: 86400,
    label: "invite hand",
    size: HAND_SIZE,
    cacheControl: LIVE_CACHE,
    draw: async (withArt) => InviteHand({
      face: withArt ? { name, commanderName: commander.name, art: await inlineImage(commander.artCropUri) } : null,
    }),
  });
}
