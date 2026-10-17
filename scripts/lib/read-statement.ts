// The statements a read-only measurement may send (`measure:friend-spares`' fits mode): a read, or the transaction
// control a read runs inside. Anything else is refused before it reaches the database; the connection is also set
// `read only`, so this is the first of two locks, not the only one.
export function isReadStatement(text: string): boolean {
  const t = text.replace(/^\s*(--[^\n]*\n\s*)*/, "").trim().toLowerCase();
  if (/^(begin|start transaction|commit|rollback|show)\b/.test(t)) return !/\bread write\b/.test(t);
  if (/^set\s+(transaction|session characteristics as transaction)\b/.test(t)) return !/\bread write\b/.test(t);
  if (!/^(select|with|\()/.test(t)) return false;
  return !/\b(insert|update|delete|merge|truncate|create|drop|alter|grant|revoke|copy|lock|nextval|setval|pg_advisory_lock|pg_advisory_xact_lock)\b/.test(t);
}

