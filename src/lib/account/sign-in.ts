// The "Email and sign-in" row's facts (account settings handoff R1, call 3), from Clerk's backend `User`. Pure.
import type { SignInMethod } from "../copy/account";

/** The parts of Clerk's backend `User` the row reads. */
export type UserLike = {
  passwordEnabled: boolean;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: readonly unknown[];
  externalAccounts: readonly { provider: string }[];
};

/**
 * The methods in the order the line names them: Google, password, then email code. Every account with an email address
 * can take a code (the instance's email first factor is the code), so it is named whenever an address exists.
 */
export function signInMethods(user: UserLike): SignInMethod[] {
  const out: SignInMethod[] = [];
  if (user.externalAccounts.some((x) => x.provider === "google" || x.provider === "oauth_google")) out.push("google");
  if (user.passwordEnabled) out.push("password");
  if (user.emailAddresses.length > 0) out.push("code");
  return out;
}

export function primaryEmail(user: UserLike): string {
  return user.primaryEmailAddress?.emailAddress ?? "";
}
