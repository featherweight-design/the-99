import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

/** A trimmed real page or sitemap saved from magic.wizards.com on 2026-10-29. */
export const fixture = (name: string) => readFileSync(join(dir, name), "utf8");

export const postUrl = (slug: string) => `https://magic.wizards.com/en/news/announcements/${slug}`;
