import type { NextConfig } from "next";

// Deliberately empty. `experimental.staleTimes.dynamic` used to live here, to
// stop /collection and /commanders refetching their whole payload on every
// filter change — but it is a router-wide setting, so it bought that one fix
// by holding a stale copy of every dynamic page in the app. The surfaces that
// needed it now cache their own payloads in the component that renders them;
// see the caching section in AGENTS.md.
// The Server Action body limit defaults to 1 MB, below what a collection upload
// allows: a ManaBox export over 1 MB was refused with a 413 before the action ran,
// and the reader saw only a minified React error. It matches COLLECTION_FILE_MAX_BYTES
// plus room for the multipart envelope, and stays under Vercel's 4.5 MB request cap.
const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4.4mb" },
  },
};

export default nextConfig;
