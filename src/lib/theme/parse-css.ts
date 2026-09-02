// A deliberately small reader for globals.css: find the theme blocks, return
// their custom-property declarations verbatim. It does not resolve var(), on
// purpose — --avail-soft and --avail-hard are aliases, and the contract test
// has to be able to see that they still are.

// A selector list, not a single selector: the default theme is declared on
// `:root, [data-theme="amonkhet"]` at once, so a chip can preview Gilded Stone
// while another theme is in force. Both spellings name the same theme.
const SELECTOR = /:root|\[data-theme="[a-z]+"\]/;
const BLOCK = new RegExp(
  `(?:^|[};])\\s*((?:${SELECTOR.source})(?:\\s*,\\s*(?:${SELECTOR.source}))*)\\s*\\{([^}]*)\\}`,
  "gm",
);
const NAMED = /\[data-theme="([a-z]+)"\]/g;
const DECL = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;

export function parseThemeBlocks(css: string): Map<string, Map<string, string>> {
  const source = css.replace(COMMENT, "");
  const themes = new Map<string, Map<string, string>>();

  for (const [, selectors, body] of source.matchAll(BLOCK)) {
    const named = [...selectors.matchAll(NAMED)].map(([, name]) => name);
    // `:root` alone names the default; alongside its own attribute selector it
    // adds nothing, which is why the list is de-duplicated rather than summed.
    const keys = new Set(named.length ? named : ["amonkhet"]);
    for (const key of keys) {
      const tokens = themes.get(key) ?? new Map<string, string>();
      for (const [, name, value] of body.matchAll(DECL)) tokens.set(name, value.trim());
      themes.set(key, tokens);
    }
  }

  return themes;
}
