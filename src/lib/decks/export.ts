export function toDecklistText(args: {
  commanderName: string;
  cards: { name: string; quantity: number }[];
}): string {
  return [
    `1 ${args.commanderName}`,
    ...args.cards.map((c) => `${c.quantity} ${c.name}`),
  ].join("\n");
}

export function toShoppingListText(cards: { name: string }[]): string {
  return cards.map((c) => c.name).join("\n");
}
