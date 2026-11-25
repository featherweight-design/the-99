// Its own file so a public surface (the landing demo's Upgrade step) can format a price without importing the credits page, which reads the pack and plan prices.

/** `$5`, `$12.50`: a whole-dollar price carries no cents, as the boards draw it. */
export function dollars(cents: number): string {
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}
