// Settings' Account section, read and drawn behind its own Suspense boundary (`page.tsx`): Clerk's read is a Backend round
// trip, so the rest of the page never waits on it. The name is the reader's profile name, made on first use as /friends
// makes it (`ensureSenderProfile`, READINESS clarification 3); the email and sign-in methods are Clerk's. The delete's money
// facts (clarification 4) are read here too, so the delete opens with them and has no loading state: the paid credits held
// and whether a plan is live. A failed read draws no money lines, as the menu's warning did.
import { currentUser } from "@clerk/nextjs/server";
import { ownDisplayName } from "../../lib/social/friends";
import { primaryEmail, signInMethods } from "../../lib/account/sign-in";
import { ensureSenderProfile } from "../friends/sender-profile";
import { readHeldPaid } from "../../lib/payments/held";
import { readPlanFacts } from "../../lib/payments/plan-read";
import { holdsPlan } from "../../lib/payments/subscription-rule";
import { AccountSection, type AccountFacts } from "../../components/settings/account-section";

export async function AccountSlot({ userId }: { userId: string }) {
  return <AccountSection facts={await loadAccount(userId)} />;
}

async function loadAccount(userId: string): Promise<AccountFacts> {
  // Each read fails on its own: a Clerk or profile hiccup draws the section with less, never takes Settings down with it
  // (the page has no boundary between this slot and the app's error screen).
  const [user, stored, held, plan] = await Promise.all([
    currentUser().catch(() => null),
    ownDisplayName(userId).catch(() => null),
    readHeldPaid(userId).catch(() => null),
    readPlanFacts(userId).catch(() => null),
  ]);
  // No profile yet: made as /friends makes it, then read back. A stored one is the common case and costs one read.
  const name = stored ?? (await ensureSenderProfile(userId).then(() => ownDisplayName(userId)).catch(() => null));
  return {
    name: name ?? "",
    email: user ? primaryEmail(user) : "",
    methods: user ? signInMethods(user) : [],
    held,
    planLive: plan !== null && holdsPlan(plan.status),
  };
}
