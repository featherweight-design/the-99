export function commanderSlug(name: string): string {
  return name
    .split(" // ")[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks left by NFD
    .toLowerCase()
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
