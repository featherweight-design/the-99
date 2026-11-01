// What became of the reader's own invite QR, for the sender's sheet while it is shown (plan `2026-10-16-invites.md`,
// Q2 to Q4): live with the seconds left, claimed (the newcomer pressed Send code), or expired. Its contract:
//   - the reader comes from the Clerk session, never from the request;
//   - the token's shape is checked before anything is read, and only the reader's OWN row answers: another
//     account's token reads as not found;
//   - `private, no-store`, because the answer is this reader's and changes when the newcomer claims.
// A route rather than a server action because it polls in the background, as `/api/friend-invites` does.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isQrToken } from "../../../lib/invites/rules";
import { readSenderQr } from "../../../lib/invites/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  const token = req.nextUrl.searchParams.get("t");
  if (!isQrToken(token)) return NextResponse.json(null, { status: 400, headers: HEADERS });
  const qr = await readSenderQr(userId, token);
  if (!qr) return NextResponse.json(null, { status: 404, headers: HEADERS });
  return NextResponse.json(qr, { headers: HEADERS });
}
