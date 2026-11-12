// The Google way back's addresses, in a module with no React in it, so the server page `app/sso-callback` can read them
// without pulling in the client pieces of `auth-parts.tsx`.

/** Where Google hands the reader back (`app/sso-callback`), and where they land once in. */
export const SSO_CALLBACK = "/sso-callback";
/** The `from` mark the invitation's Google press (`/sign-up`, R2) puts on its way back: only it is read as a sign-up. */
export const SSO_FROM_INVITE = "invite";
export const SSO_CALLBACK_INVITE = `${SSO_CALLBACK}?from=${SSO_FROM_INVITE}`;
