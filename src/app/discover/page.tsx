// /discover: the Discover tab's old address. It redirects to /commanders/discover (query kept).
import { redirect } from "next/navigation";
import { pathWithQuery } from "../../lib/commanders/place-redirect";

export default async function LegacyDiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  redirect(pathWithQuery("/commanders/discover", await searchParams));
}
