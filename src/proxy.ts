import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Sign-in/up happen on Clerk's hosted Account Portal (the default when no
// NEXT_PUBLIC_CLERK_SIGN_IN_URL is set) — there are no in-app auth routes to allowlist.
const isPublic = createRouteMatcher(["/api/cron(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
