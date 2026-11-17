import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { getDb, verifyPassword } from "@/lib/center/db";
import { getAccount, setSession } from "@/lib/center/session";
import { CenterError, mutate, readState } from "@/lib/center/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const globalLimiter = globalThis as unknown as {
  s7Attempts?: Map<string, { count: number; until: number }>;
};
const attempts = (globalLimiter.s7Attempts ??= new Map());
function localOnly() {
  if (process.env.NODE_ENV !== "development")
    throw new CenterError(
      "Жергілікті CRM тек development режимінде жұмыс істейді",
      403,
    );
}
function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Өрістерді тексеріңіз" },
      { status: 400 },
    );
  if (error instanceof CenterError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  const code = (error as { code?: string })?.code;
  if (code === "23505")
    return NextResponse.json(
      {
        error:
          "Мұндай жазба бар. Email, топ немесе айлық төлем қайталанбауы керек.",
      },
      { status: 409 },
    );
  if (code === "23503")
    return NextResponse.json(
      {
        error:
          "Байланысты жазба табылмады. Топты немесе қызметкерді тексеріңіз.",
      },
      { status: 400 },
    );
  console.error("Center API:", error);
  return NextResponse.json(
    { error: "Серверде қате болды. Қайталап көріңіз." },
    { status: 500 },
  );
}
export async function GET(request: NextRequest) {
  try {
    localOnly();
    const account = await getAccount();
    if (!account) throw new CenterError("Аккаунтқа кіріңіз", 401);
    const methodId = request.nextUrl.searchParams.get("method");
    if (methodId) {
      const db = await getDb();
      if (
        account.role !== "admin" &&
        !(
          await db.query(
            "SELECT id FROM lessons WHERE method_id=$1 AND teacher_id=$2",
            [methodId, account.id],
          )
        ).rows.length
      )
        throw new CenterError("Әдістеме қолжетімсіз", 403);
      const method = (
        await db.query<{
          file_data: string;
          file_name: string;
          file_type: string;
        }>("SELECT file_data,file_name,file_type FROM methods WHERE id=$1", [
          methodId,
        ])
      ).rows[0];
      if (!method?.file_data) throw new CenterError("Файл табылмады", 404);
      return new NextResponse(
        new Uint8Array(Buffer.from(method.file_data.split(",")[1], "base64")),
        {
          headers: {
            "Content-Type": method.file_type,
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(method.file_name)}`,
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return NextResponse.json(await readState(account), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    localOnly();
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host"))
      throw new CenterError("Сұрау көзі сәйкес емес", 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new CenterError("JSON қажет", 415);
    const raw = await request.text();
    if (raw.length > 3000000) throw new CenterError("Файл ең көбі 2 МБ", 413);
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new CenterError("JSON қате");
    }
    if (!input || Array.isArray(input) || typeof input !== "object")
      throw new CenterError("Сұрау қате");
    if (input.action === "login") {
      const email = String(input.email ?? "")
          .trim()
          .toLowerCase(),
        password = String(input.password ?? "");
      if (email.length > 200 || password.length > 128)
        throw new CenterError("Email немесе құпиясөз қате", 401);
      const key = "local-login";
      const previous = attempts.get(key),
        now = Date.now();
      const rate =
        previous && previous.until > now
          ? previous
          : { count: 0, until: now + 60000 };
      if (rate.count >= 20)
        throw new CenterError(
          "Көп әрекет жасалды. Бір минуттан кейін қайталаңыз.",
          429,
        );
      rate.count++;
      attempts.set(key, rate);
      const row = (
        await (
          await getDb()
        ).query<{ id: string; password_hash: string }>(
          "SELECT id,password_hash FROM accounts WHERE email=$1",
          [email],
        )
      ).rows[0];
      if (!row || !verifyPassword(password, row.password_hash))
        throw new CenterError("Email немесе құпиясөз қате", 401);
      await setSession(row.id);
      attempts.delete(key);
      return NextResponse.json({ message: "Қош келдіңіз!" });
    }
    const account = await getAccount();
    if (!account) throw new CenterError("Аккаунтқа кіріңіз", 401);
    if (input.action === "logout") {
      (await cookies()).delete("s7_session");
      return NextResponse.json({ message: "Аккаунттан шықтыңыз" });
    }
    return NextResponse.json(await mutate(account, input));
  } catch (error) {
    return errorResponse(error);
  }
}
