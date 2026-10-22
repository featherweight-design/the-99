/** A basic land, by its type line (`Basic Land — Island`, `Basic Snow Land — Forest`): listed at the foot of Lands on a
 *  read-only list and never counted in what the reader owns. Pure, so a client view and a server read share it. */
export const isBasicType = (typeLine: string) => /^Basic\b/.test(typeLine);
