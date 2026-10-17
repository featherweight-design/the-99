// The statements a read-only measurement may send (`measure:friend-spares`' fits mode): a read, or the transaction
// control a read runs inside. Anything else is refused before it reaches the database; the connection is also set
// `read only`, so this is the first of two locks, not the only one.
//
// The keyword checks read CODE only: comments go, and every quoted literal or identifier is emptied, so a claim-model
// query whose comments say "copy", "update" or "delete" still reads as the select it is. Dollar-quoted text is left in,
// which can only refuse more.
export function isReadStatement(text: string): boolean {
  const t = codeOf(text).trim().replace(/;\s*$/, "").toLowerCase();
  // One statement only: a `;` left in the code would run what follows it past every check below.
  if (t.includes(";")) return false;
  if (/^(begin|start transaction|commit|rollback|show)\b/.test(t)) return !/\bread write\b/.test(t);
  if (/^set\s+(transaction|session characteristics as transaction)\b/.test(t)) return !/\bread write\b/.test(t);
  if (!/^(select|with|\()/.test(t)) return false;
  return !/\b(insert|update|delete|merge|truncate|create|drop|alter|grant|revoke|copy|lock|nextval|setval|pg_\w*advisory\w*|for\s+(?:key\s+)?share)\b/.test(t);
}


/** The statement with its comments removed and its quoted literals and identifiers emptied, scanned left to right. */
function codeOf(text: string): string {
  return text.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'|"(?:[^"]|"")*"/g, (m) =>
    m.startsWith("'") ? "''" : m.startsWith('"') ? '""' : " ",
  );
}
