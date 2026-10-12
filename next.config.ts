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
  // One copy of the Neon driver, loaded from node_modules. drizzle-orm's `db.transaction` only checks a
  // connection out of the pool when `client instanceof Pool` against ITS copy of the driver; the server
  // bundle used to carry a second copy, the check was false, and a "transaction" ran its begin, its
  // statements and its commit on different pooled connections (a connection could go back to the pool
  // inside an open snapshot). `pnpm check:db-pool` fails the build if a bundled copy comes back.
  serverExternalPackages: ["@neondatabase/serverless"],
  experimental: {
    serverActions: { bodySizeLimit: "4.4mb" },
  },
};

export default nextConfig;
