import type { NextConfig } from "next";

// Deliberately empty. `experimental.staleTimes.dynamic` used to live here, to
// stop /collection and /commanders refetching their whole payload on every
// filter change — but it is a router-wide setting, so it bought that one fix
// by holding a stale copy of every dynamic page in the app. The surfaces that
// needed it now cache their own payloads in the component that renders them;
// see the caching section in AGENTS.md.
const nextConfig: NextConfig = {};

export default nextConfig;
