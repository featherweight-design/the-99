export function toDecklistText(args: {
  commanderName: string;
  cards: { name: string; quantity: number }[];
}): string {
  return [
    `1 ${args.commanderName}`,
    ...args.cards.map((c) => `${c.quantity} ${c.name}`),
  ].join("\n");
}
