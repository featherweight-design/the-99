import { cookies } from "next/headers";
import { PreconsLoading } from "../../../../components/decks/precons/precons-loading";
import { parsePreconsViewCookie, PRECONS_VIEW_COOKIE } from "../../../../components/ui/view-cookie";

// The list's own boundary: tiles, or rows when this browser stored rows (the same cookie the page reads).
export default async function Loading() {
  const stored = parsePreconsViewCookie((await cookies()).get(PRECONS_VIEW_COOKIE)?.value);
  return <PreconsLoading view={stored ?? "tiles"} />;
}
