import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";

type RetailRow = {
  id: string;
  created_at: string;
  [key: string]: string | number | null;
};

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function buildCsv(sales: RetailRow[], products: RetailRow[]) {
  const rows = [[
    "sale_date",
    "purchase_date",
    "product",
    "category",
    "address",
    "quantity",
    "purchase_price",
    "sale_price",
    "revenue",
    "profit",
    "payment",
    "customer",
  ]];

  for (const sale of sales) {
    const product = products.find((item) => item.id === sale.product_id);
    const quantity = Number(sale.quantity ?? 0);
    const purchasePrice = Number(product?.purchase_price ?? 0);
    const salePrice = Number(product?.sale_price ?? 0);
    const revenue = Number(sale.total_amount ?? salePrice * quantity);
    const profit = Number(sale.profit_amount ?? (salePrice - purchasePrice) * quantity);

    rows.push([
      String(sale.sale_date ?? ""),
      String(product?.created_at ?? "").slice(0, 10),
      String(product?.name ?? ""),
      String(product?.category ?? ""),
      String(product?.address ?? ""),
      String(quantity),
      String(purchasePrice),
      String(salePrice),
      String(revenue),
      String(profit),
      String(sale.payment_method ?? ""),
      String(sale.customer_name ?? ""),
    ]);
  }

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
}

export async function GET(request: NextRequest) {
  const { supabase, membership } = await requireUser();
  if (!membership) {
    return NextResponse.json({ error: "No company workspace" }, { status: 403 });
  }

  const date = request.nextUrl.searchParams.get("date");
  const all = request.nextUrl.searchParams.get("all") === "1";
  const companyId = membership.company_id;

  const [{ data: products, error: productsError }, salesResult] = await Promise.all([
    supabase.from("retail_products").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(2000),
    all || !date
      ? supabase.from("retail_product_sales").select("*").eq("company_id", companyId).order("sale_date", { ascending: false }).limit(5000)
      : supabase.from("retail_product_sales").select("*").eq("company_id", companyId).eq("sale_date", date).order("created_at", { ascending: false }).limit(5000),
  ]);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  if (salesResult.error) {
    return NextResponse.json({ error: salesResult.error.message }, { status: 500 });
  }

  const csv = buildCsv((salesResult.data ?? []) as RetailRow[], (products ?? []) as RetailRow[]);
  const fileDate = all || !date ? "all" : date;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="retail-profit-report-${fileDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
