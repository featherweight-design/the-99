// What a `/sign-up` address asks for, in a module with no React in it, so the server page reads it without the flow's client
// pieces. `?ticket=` is an invitation's ticket (Clerk's own `__clerk_ticket` is read too, the name its accept link adds when it
// hands the reader back); `?google=missing` is the way back from Google with a name or a password still owed (Q6,
// `app/sso-callback`). An address with neither asks for no sign-up: it is the invite-only page (R1).

export type SignUpQuery = Record<string, string | string[] | undefined>;

/** The ticket a link carries: one non-empty value, or none (a repeated param is not a ticket). */
export function ticketOf(query: SignUpQuery): string | null {
  for (const key of ["ticket", "__clerk_ticket"]) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** The sign-up an address asks for, or null for none. Q6 holds no ticket, whatever else the address carries. */
export function signUpEntry(query: SignUpQuery): { ticket: string | null; googleMissing: boolean } | null {
  if (query.google === "missing") return { ticket: null, googleMissing: true };
  const ticket = ticketOf(query);
  return ticket ? { ticket, googleMissing: false } : null;
}
