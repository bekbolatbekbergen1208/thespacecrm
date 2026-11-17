import { cookies } from "next/headers";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir, getDb } from "./db";
export type Account = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher";
  position: string;
};
async function secret() {
  await getDb();
  const file = path.join(dataDir, "session-secret");
  try {
    return await readFile(file, "utf8");
  } catch {
    const value = randomBytes(48).toString("hex");
    try {
      await writeFile(file, value, { flag: "wx", mode: 0o600 });
      return value;
    } catch {
      return readFile(file, "utf8");
    }
  }
}
export async function setSession(id: string) {
  const row = (
    await (
      await getDb()
    ).query<{ session_version: number }>(
      "SELECT session_version FROM accounts WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (!row) throw new Error("Account not found");
  const payload = Buffer.from(
    JSON.stringify({
      id,
      version: row.session_version,
      expires: Date.now() + 86400000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", await secret())
    .update(payload)
    .digest("hex");
  (await cookies()).set("s7_session", `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400,
  });
}
export async function getAccount(): Promise<Account | null> {
  const value = (await cookies()).get("s7_session")?.value;
  if (!value) return null;
  try {
    const [payload, signature] = value.split(".");
    const expected = createHmac("sha256", await secret())
        .update(payload)
        .digest(),
      given = Buffer.from(signature, "hex");
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (parsed.expires < Date.now()) return null;
    const row = (
      await (
        await getDb()
      ).query<Account & { session_version: number }>(
        "SELECT id,name,email,role,position,session_version FROM accounts WHERE id=$1",
        [parsed.id],
      )
    ).rows[0];
    if (!row || row.session_version !== parsed.version) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      position: row.position,
    };
  } catch {
    return null;
  }
}
