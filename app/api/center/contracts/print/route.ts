import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/center/session";
import { getDb } from "@/lib/center/db";
import { logoDataUrl } from "@/lib/center/branding";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development")
    return new NextResponse(null, { status: 403 });
  const account = await getAccount();
  if (!account)
    return NextResponse.redirect(new URL("/workspace/login", request.url));
  if (account.role !== "admin")
    return new NextResponse("Қолжетімсіз", { status: 403 });
  const contract = (
    await (
      await getDb()
    ).query<{ number: string; body: string }>(
      "SELECT number,body FROM student_contracts WHERE id=$1",
      [request.nextUrl.searchParams.get("id") ?? ""],
    )
  ).rows[0];
  if (!contract) return new NextResponse("Договор табылмады", { status: 404 });
  const logo = await logoDataUrl();
  return new NextResponse(
    `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escape(contract.number)} — S7 Robotics</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#eef2f8;color:#172335;margin:0;padding:25px}.toolbar{max-width:780px;margin:0 auto 20px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#687b97}button{background:#3564df;color:white;border:0;border-radius:6px;padding:12px 18px;cursor:pointer}.paper{max-width:780px;margin:auto;background:white;padding:42px;box-sizing:border-box}.brand{display:flex;gap:12px;align-items:center;border-bottom:1px solid #ddd;padding-bottom:16px;margin-bottom:22px;font-size:13px;font-weight:bold}.brand img{width:50px;height:35px;object-fit:contain}.body{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.65}@media print{@page{size:A4;margin:17mm}body{background:white;padding:0}.toolbar{display:none}.paper{padding:0;max-width:none}.body{font-size:10.5pt;line-height:1.5}.brand{break-after:avoid}}</style></head><body><div class="toolbar"><span>Договор ${escape(contract.number)} · Проект, не подписан</span><button onclick="window.print()">Печать / Сохранить PDF</button></div><article class="paper"><div class="brand">${logo ? `<img src="${logo}" alt="S7 Robotics">` : ""}S7 ROBOTICS</div><div class="body">${escape(contract.body)}</div></article></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
