import { NextRequest, NextResponse } from "next/server";
import { readLogo, saveLogo } from "@/lib/center/branding";
import { getAccount } from "@/lib/center/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.NODE_ENV !== "development")
    return new NextResponse(null, { status: 403 });
  const logo = await readLogo();
  if (!logo) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(logo.data), {
    headers: { "Content-Type": logo.mime, "Cache-Control": "no-store" },
  });
}
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development")
    return NextResponse.json(
      { error: "Жергілікті режим қажет" },
      { status: 403 },
    );
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host"))
    return NextResponse.json(
      { error: "Сұрау көзі сәйкес емес" },
      { status: 403 },
    );
  const account = await getAccount();
  if (!account)
    return NextResponse.json({ error: "Аккаунтқа кіріңіз" }, { status: 401 });
  if (account.role !== "admin")
    return NextResponse.json(
      { error: "Логотипті тек әкімші өзгерте алады" },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "JSON қажет" }, { status: 415 });
  const raw = await request.text();
  if (raw.length > 2900000)
    return NextResponse.json(
      { error: "Логотип 2 МБ-тан аспауы керек" },
      { status: 413 },
    );
  try {
    const input = JSON.parse(raw);
    if (typeof input?.dataUrl !== "string")
      throw new Error("Логотип суретін таңдаңыз");
    await saveLogo(input.dataUrl);
    return NextResponse.json({
      message:
        "Логотип сақталды. Кіру бетінде, мәзірде және бейдждерде көрсетіледі.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
