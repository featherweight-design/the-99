// TEMPORARY. Read-only probe of whether `db.transaction` keeps one connection for a whole transaction.
// Removed before merge. Guarded by the sha256 of a token held outside the repository.
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "../../../db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_SHA256 = "50078fe77273e5e8b8dff5aecfa8e470f7dee52e7e59782f5c14c103ad2a92cd";

export async function GET(req: Request) {
  const token = req.headers.get("x-zz-token") ?? "";
  if (createHash("sha256").update(token).digest("hex") !== TOKEN_SHA256) return new NextResponse("not found", { status: 404 });
  const out: { same: boolean }[] = [];
  const one = () => db.transaction(async (tx) => {
    const a = (await tx.execute(sql`select pg_backend_pid() as p`)).rows[0].p;
    await new Promise((r) => setTimeout(r, 30));
    const b = (await tx.execute(sql`select pg_backend_pid() as p`)).rows[0].p;
    out.push({ same: a === b });
  }, { isolationLevel: "repeatable read" });
  await Promise.all(Array.from({ length: 12 }, one));
  return NextResponse.json({ transactions: out.length, pinned: out.filter((o) => o.same).length });
}
