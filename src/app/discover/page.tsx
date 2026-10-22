// /discover: the Discover tab's old address. With `COMMANDERS_PLACE_ENABLED` on it redirects to
// /commanders/discover (query kept); off, it answers in place as it shipped.
import { redirect } from "next/navigation";
import { placeRedirect } from "../../lib/commanders/place-redirect";
import DiscoverPage from "../commanders/(list)/discover/page";

export default async function LegacyDiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const target = await placeRedirect("/commanders/discover", await searchParams);
  if (target) redirect(target);
  return <DiscoverPage searchParams={searchParams} />;
}
