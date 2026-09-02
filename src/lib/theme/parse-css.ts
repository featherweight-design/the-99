// A deliberately small reader for globals.css: find the theme blocks, return
// their custom-property declarations verbatim. It does not resolve var(), on
// purpose — --avail-soft and --avail-hard are aliases, and the contract test
// has to be able to see that they still are.

const BLOCK = /(?:^|[};])\s*(:root|\[data-theme="([a-z]+)"\])\s*\{([^}]*)\}/gm;
const DECL = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;

export function parseThemeBlocks(css: string): Map<string, Map<string, string>> {
  const source = css.replace(COMMENT, "");
  const themes = new Map<string, Map<string, string>>();

  for (const [, selector, named, body] of source.matchAll(BLOCK)) {
    const key = selector === ":root" ? "amonkhet" : named;
    const tokens = themes.get(key) ?? new Map<string, string>();
    for (const [, name, value] of body.matchAll(DECL)) tokens.set(name, value.trim());
    themes.set(key, tokens);
  }

  return themes;
}
