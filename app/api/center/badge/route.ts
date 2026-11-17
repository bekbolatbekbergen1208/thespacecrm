import { NextRequest, NextResponse } from "next/server";
import { toDataURL } from "qrcode";
import { logoDataUrl } from "@/lib/center/branding";
import { getDb } from "@/lib/center/db";
import { getAccount } from "@/lib/center/session";
import type { Student } from "@/lib/center/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development")
    return new NextResponse("Local development only", { status: 403 });
  const account = await getAccount();
  if (!account)
    return NextResponse.redirect(new URL("/workspace/login", request.url));
  const student = (
    await (
      await getDb()
    ).query<Student>(
      "SELECT s.*,g.name AS group_name FROM students s LEFT JOIN groups g ON g.id=s.group_id WHERE s.id=$1",
      [request.nextUrl.searchParams.get("id") ?? ""],
    )
  ).rows[0];
  if (!student) return new NextResponse("Оқушы табылмады", { status: 404 });
  if (
    account.role !== "admin" &&
    !(
      await (
        await getDb()
      ).query(
        "SELECT id FROM groups WHERE id=$1 AND teacher_id=$2 UNION SELECT group_id FROM lessons WHERE group_id=$1 AND teacher_id=$2",
        [student.group_id, account.id],
      )
    ).rows.length
  )
    return new NextResponse("Қолжетімсіз", { status: 403 });
  const logo = await logoDataUrl();
  const qr = await toDataURL(`s7:${student.qr_token}`);
  return new NextResponse(
    `<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>S7 • ${escape(student.name)}</title><style>body{font-family:Arial,sans-serif;background:#eef2f6;display:grid;place-content:center;min-height:100vh;margin:0;gap:24px}.badge{box-sizing:border-box;width:74mm;min-height:105mm;background:white;border-radius:18px;border:1px solid #ddd;overflow:hidden;text-align:center;padding-bottom:18px}.brand{background:#101b2a;color:white;padding:22px;font-weight:900;font-size:26px;letter-spacing:2px}.brand-logo{display:block!important;width:24mm!important;height:16mm!important;object-fit:contain;background:white;border-radius:6px;margin:0 auto 10px}.brand small{display:block;font-size:10px;font-weight:400;letter-spacing:3px;margin-top:6px}h1{font-size:22px;margin:22px 12px 6px}p{color:#596579;margin:8px 12px;font-size:13px}img{width:50mm;height:50mm}button{border:0;border-radius:10px;padding:14px;background:#14776d;color:white;cursor:pointer}@media print{body{background:white;min-height:auto;display:block}.badge{break-inside:avoid}button{display:none}@page{size:A4;margin:12mm}}</style></head><body><div class="badge"><div class="brand">${logo ? `<img class="brand-logo" src="${logo}" alt="S7 Robotics логотипі">` : ""}S7 ROBOTICS<small>БОЛАШАҚТЫ БІРГЕ ҚҰРАМЫЗ</small></div><h1>${escape(student.name)}</h1><p>${escape(student.group_name ?? "")}</p><img src="${qr}" alt="Оқушының жеке QR коды"><p>Сабаққа келгенде QR кодты мұғалімге көрсетіңіз</p></div><button onclick="window.print()">Бейджді басып шығару / PDF сақтау</button></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
