import { markRetailProductSold, saveRetailProduct } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { CameraPhotoField } from "@/components/app/camera-photo-field";
import { Field, Select, SmallButton, Textarea } from "@/components/app/forms";
import { canManage, requireUser } from "@/lib/auth";
import { BarChart3, CalendarDays, CheckCircle2, CircleDollarSign, Download, Image as ImageIcon, Package, Percent, PieChart, Search, ShoppingCart, TrendingUp } from "lucide-react";

type RetailRow = {
  id: string;
  company_id: string;
  created_at: string;
  [key: string]: string | number | null;
};

export default async function RetailDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string }>;
}) {
  const [{ supabase, membership }, params] = await Promise.all([requireUser(), searchParams]);
  const companyId = membership!.company_id;
  const editable = canManage(membership!.role);
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = params.date || today;
  const query = (params.q ?? "").toLowerCase();

  const [{ data: products, error: productsError }, { data: sales, error: salesError }] = await Promise.all([
    supabase.from("retail_products").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(500),
    supabase.from("retail_product_sales").select("*").eq("company_id", companyId).order("sale_date", { ascending: false }).limit(1000),
  ]);
  const schemaError = [productsError, salesError].find((error) => error?.message?.toLowerCase().includes("schema cache") || error?.message?.toLowerCase().includes("retail_products"));

  const saleRows = (sales ?? []) as RetailRow[];
  const allProducts = (products ?? []) as RetailRow[];
  const productRows = allProducts.filter((product) => {
    const text = [product.name, product.category, product.photo_keywords, product.notes, product.photo_url].join(" ").toLowerCase();
    return !query || text.includes(query);
  });
  const summaries = productRows.map((product) => summarizeProduct(product, saleRows));
  const daySales = saleRows.filter((sale) => sale.sale_date === selectedDate);
  const dayReport = sumSales(daySales);
  const totalReport = sumSales(saleRows);
  const totalRemaining = allProducts.reduce((sum, product) => sum + summarizeProduct(product, saleRows).remaining, 0);
  const csvHref = buildRetailCsvHref(selectedDate, daySales, allProducts);
  const last7Sales = saleRows.filter((sale) => sale.sale_date && sale.sale_date >= dateMinus(selectedDate, 6) && sale.sale_date <= selectedDate);
  const last30Sales = saleRows.filter((sale) => sale.sale_date && sale.sale_date >= dateMinus(selectedDate, 29) && sale.sale_date <= selectedDate);
  const last7Report = sumSales(last7Sales);
  const last30Report = sumSales(last30Sales);
  const paymentSplit = groupSalesByPayment(last30Sales);
  const topProducts = summaries
    .filter((item) => item.sold > 0)
    .sort((a, b) => b.sold - a.sold || b.profit - a.profit)
    .slice(0, 5);
  const lowStockProducts = summaries
    .filter((item) => item.remaining <= 3)
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 6);
  const inventoryCost = summaries.reduce((sum, item) => sum + Math.max(0, item.remaining) * Number(item.product.purchase_price ?? 0), 0);
  const inventorySaleValue = summaries.reduce((sum, item) => sum + Math.max(0, item.remaining) * Number(item.product.sale_price ?? 0), 0);
  const margin = totalReport.revenue ? Math.round((totalReport.profit / totalReport.revenue) * 100) : 0;
  const dailyTrend = lastSevenDays(selectedDate).map((date) => ({ date, ...sumSales(saleRows.filter((sale) => sale.sale_date === date)) }));

  return (
    <>
      <PageHeader
        title="Retail Store"
        description="Продажи товаров: фото, название, закупочная цена, продажная цена, остатки, календарь и отчёты."
      />

      {params.error && <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{params.error}</p>}
      {schemaError && (
        <div className="mb-4 rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-50">
          <p className="font-black">Retail Store таблицы ещё не созданы в Supabase.</p>
          <p className="mt-1 text-yellow-100/90">
            Откройте Supabase SQL Editor и выполните файл <b>supabase/retail-store.sql</b>. После выполнения таблицы
            <b> retail_products</b> и <b>retail_product_sales</b> появятся в schema cache.
          </p>
          <p className="mt-2 rounded-2xl bg-slate-950/40 px-3 py-2 font-mono text-xs text-yellow-100">{schemaError.message}</p>
        </div>
      )}
      {params.saved === "product" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Товар сохранён.</p>}
      {params.saved === "sale" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Продажа сохранена.</p>}

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric title="Товары" value={allProducts.length} note={query ? "найдено по поиску" : "в каталоге"} icon={<Package className="h-4 w-4" />} />
        <Metric title="Продано сегодня" value={dayReport.quantity} note={selectedDate} icon={<ShoppingCart className="h-4 w-4" />} />
        <Metric title="Выручка" value={`${dayReport.revenue.toLocaleString()} ₸`} note="за выбранный день" icon={<CircleDollarSign className="h-4 w-4" />} />
        <Metric title="Прибыль" value={`${dayReport.profit.toLocaleString()} ₸`} note={`Всего ${totalReport.profit.toLocaleString()} ₸`} icon={<BarChart3 className="h-4 w-4" />} danger={dayReport.profit < 0} />
        <Metric title="Остаток" value={totalRemaining} note="товаров осталось" icon={<CheckCircle2 className="h-4 w-4" />} danger={totalRemaining <= 3 && allProducts.length > 0} />
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_240px_180px]">
          <form action="/dashboard/retail" className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Поиск по названию, категории, фото-ключам..."
              className="premium-input h-12 w-full pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <input type="hidden" name="date" value={selectedDate} />
          </form>
          <form action="/dashboard/retail" className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type="date" name="date" defaultValue={selectedDate} className="premium-input h-12 w-full pl-11 pr-4 text-sm text-white outline-none" />
            {params.q && <input type="hidden" name="q" value={params.q} />}
          </form>
          <a href={csvHref} download={`retail-report-${selectedDate}.csv`} className="premium-button h-12 justify-center bg-white px-4 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
            <Download className="h-4 w-4" />
            Скачать отчёт
          </a>
        </div>
      </Card>

      <RetailReportsSection
        selectedDate={selectedDate}
        dayReport={dayReport}
        last7Report={last7Report}
        last30Report={last30Report}
        totalReport={totalReport}
        margin={margin}
        inventoryCost={inventoryCost}
        inventorySaleValue={inventorySaleValue}
        paymentSplit={paymentSplit}
        topProducts={topProducts}
        lowStockProducts={lowStockProducts}
        dailyTrend={dailyTrend}
      />

      {editable && (
        <Card className="mb-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white">Добавить товар</h2>
              <p className="text-sm text-slate-400">Заполните название, фото, закупочную/продажную цену и количество.</p>
            </div>
          </div>
          <form action={saveRetailProduct} className="grid gap-4 xl:grid-cols-4">
            <Field label="Название" name="name" />
            <Field label="Категория" name="category" required={false} />
            <CameraPhotoField label="Фото товара" />
            <Field label="Фото-поиск / ключи" name="photoKeywords" required={false} />
            <Field label="Закупили за" name="purchasePrice" type="number" defaultValue={0} />
            <Field label="Продадите за" name="salePrice" type="number" defaultValue={0} />
            <Field label="Количество" name="initialQuantity" type="number" defaultValue={0} />
            <Select label="Статус" name="status" defaultValue="active">
              <option value="active">Активный</option>
              <option value="archived">Архив</option>
            </Select>
            <div className="xl:col-span-4">
              <Textarea label="Заметки" name="notes" />
            </div>
            <button className="premium-button h-12 w-full bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50 xl:col-span-4">
              <CheckCircle2 className="h-4 w-4" />
              Сохранить товар
            </button>
          </form>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Таблица товаров</h2>
              <p className="text-sm text-slate-400">Можно назначить товар проданным и сразу увидеть остаток.</p>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{productRows.length} товаров</span>
          </div>
          {productRows.length ? (
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="max-h-[720px] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-950/95 text-xs uppercase tracking-[0.12em] text-slate-500 backdrop-blur">
                    <tr>
                      <th className="px-4 py-3">Товар</th>
                      <th className="px-4 py-3">Цена</th>
                      <th className="px-4 py-3">Продано</th>
                      <th className="px-4 py-3">Осталось</th>
                      <th className="px-4 py-3">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {summaries.map(({ product, sold, remaining, profit }) => (
                      <tr key={product.id} className="bg-white/[0.025] transition hover:bg-cyan-300/[0.06]">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <ProductPhoto src={String(product.photo_url ?? "")} name={String(product.name ?? "Товар")} />
                            <div>
                              <p className="font-black text-white">{product.name}</p>
                              <p className="text-xs text-slate-500">{product.category || "Без категории"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black text-white">{Number(product.sale_price ?? 0).toLocaleString()} ₸</p>
                          <p className="text-xs text-slate-500">закуп {Number(product.purchase_price ?? 0).toLocaleString()} ₸</p>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{sold} шт</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${remaining <= 0 ? "bg-red-500 text-white" : remaining <= 3 ? "bg-yellow-300 text-yellow-950" : "bg-emerald-300 text-emerald-950"}`}>
                            {remaining} шт
                          </span>
                          <p className="mt-2 text-xs text-slate-500">прибыль {profit.toLocaleString()} ₸</p>
                        </td>
                        <td className="px-4 py-4">
                          <form action={markRetailProductSold} className="grid min-w-56 gap-2">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="date" name="saleDate" defaultValue={selectedDate} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                            <div className="grid grid-cols-2 gap-2">
                              <input name="quantity" type="number" min="1" defaultValue={1} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                              <select name="paymentMethod" defaultValue="cash" className="premium-input h-9 px-3 text-xs text-white outline-none">
                                <option value="cash">Нал</option>
                                <option value="kaspi">Kaspi</option>
                                <option value="card">Карта</option>
                                <option value="transfer">Перевод</option>
                              </select>
                            </div>
                            <input name="customerName" placeholder="Покупатель" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                            <SmallButton>Продано</SmallButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState text="Пока товаров нет. Добавьте первый товар сверху или измените поиск." />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Отчёт по календарю</h2>
              <p className="text-sm text-slate-400">Продажи за выбранный день: {selectedDate}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{dayReport.revenue.toLocaleString()} ₸</span>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <MiniReport label="Продано" value={`${dayReport.quantity} шт`} />
            <MiniReport label="Выручка" value={`${dayReport.revenue.toLocaleString()} ₸`} />
            <MiniReport label="Прибыль" value={`${dayReport.profit.toLocaleString()} ₸`} />
          </div>
          {daySales.length ? (
            <div className="grid gap-3">
              {daySales.map((sale) => {
                const product = allProducts.find((item) => item.id === sale.product_id);
                return (
                  <div key={sale.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-white">{product?.name ?? "Товар"}</p>
                        <p className="mt-1 text-xs text-slate-500">{sale.customer_name || "Покупатель не указан"} · {sale.payment_method}</p>
                      </div>
                      <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{sale.quantity} шт</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                      <p>Сумма: <b className="text-white">{Number(sale.total_amount ?? 0).toLocaleString()} ₸</b></p>
                      <p>Прибыль: <b className="text-white">{Number(sale.profit_amount ?? 0).toLocaleString()} ₸</b></p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState text="За выбранный день продаж нет. Выберите другой день или отметьте товар проданным." />
          )}
        </Card>
      </div>
    </>
  );
}

function RetailReportsSection({
  selectedDate,
  dayReport,
  last7Report,
  last30Report,
  totalReport,
  margin,
  inventoryCost,
  inventorySaleValue,
  paymentSplit,
  topProducts,
  lowStockProducts,
  dailyTrend,
}: {
  selectedDate: string;
  dayReport: ReturnType<typeof sumSales>;
  last7Report: ReturnType<typeof sumSales>;
  last30Report: ReturnType<typeof sumSales>;
  totalReport: ReturnType<typeof sumSales>;
  margin: number;
  inventoryCost: number;
  inventorySaleValue: number;
  paymentSplit: Array<{ method: string; quantity: number; revenue: number; profit: number }>;
  topProducts: Array<ReturnType<typeof summarizeProduct>>;
  lowStockProducts: Array<ReturnType<typeof summarizeProduct>>;
  dailyTrend: Array<{ date: string; quantity: number; revenue: number; profit: number }>;
}) {
  const maxTrend = Math.max(...dailyTrend.map((item) => item.revenue), 1);
  return (
    <Card className="mb-5 scroll-mt-6" id="reports">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
            Retail Reports
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">Отчёты магазина</h2>
          <p className="mt-2 text-sm text-slate-400">День, 7 дней, 30 дней, прибыль, оплата, топ товаров и остатки.</p>
        </div>
        <a href="#reports" className="premium-button h-10 justify-center border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm text-cyan-100">
          <BarChart3 className="h-4 w-4" />
          {selectedDate}
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric title="Сегодня" value={`${dayReport.revenue.toLocaleString()} ₸`} note={`${dayReport.quantity} шт · прибыль ${dayReport.profit.toLocaleString()} ₸`} icon={<CalendarDays className="h-4 w-4" />} />
        <ReportMetric title="7 дней" value={`${last7Report.revenue.toLocaleString()} ₸`} note={`${last7Report.quantity} шт · прибыль ${last7Report.profit.toLocaleString()} ₸`} icon={<TrendingUp className="h-4 w-4" />} />
        <ReportMetric title="30 дней" value={`${last30Report.revenue.toLocaleString()} ₸`} note={`${last30Report.quantity} шт · прибыль ${last30Report.profit.toLocaleString()} ₸`} icon={<PieChart className="h-4 w-4" />} />
        <ReportMetric title="Маржа" value={`${margin}%`} note={`вся история: ${totalReport.revenue.toLocaleString()} ₸`} icon={<Percent className="h-4 w-4" />} danger={margin < 15 && totalReport.revenue > 0} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-white">Динамика за 7 дней</h3>
              <p className="text-sm text-slate-500">Выручка по дням до выбранной даты.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{last7Report.revenue.toLocaleString()} ₸</span>
          </div>
          <div className="grid gap-3">
            {dailyTrend.map((item) => (
              <div key={item.date} className="grid gap-2 sm:grid-cols-[92px_1fr_120px] sm:items-center">
                <p className="text-xs font-black text-slate-400">{item.date.slice(5)}</p>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{ width: `${Math.max(4, (item.revenue / maxTrend) * 100)}%` }} />
                </div>
                <p className="text-right text-sm font-black text-white">{item.revenue.toLocaleString()} ₸</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
          <h3 className="font-black text-white">Стоимость склада</h3>
          <p className="mt-1 text-sm text-slate-500">Сколько товара осталось по закупке и продаже.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniReport label="Закупочная" value={`${inventoryCost.toLocaleString()} ₸`} />
            <MiniReport label="Продажная" value={`${inventorySaleValue.toLocaleString()} ₸`} />
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-100/70">Потенциальная прибыль склада</p>
            <p className="mt-2 text-2xl font-black text-cyan-50">{Math.max(0, inventorySaleValue - inventoryCost).toLocaleString()} ₸</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ReportList title="Топ товаров" empty="Продаж пока нет.">
          {topProducts.map((item, index) => (
            <ReportListRow
              key={item.product.id}
              title={`${index + 1}. ${item.product.name}`}
              note={`${item.sold} шт · прибыль ${item.profit.toLocaleString()} ₸`}
              value={`${Number(item.product.sale_price ?? 0).toLocaleString()} ₸`}
            />
          ))}
        </ReportList>
        <ReportList title="Оплата за 30 дней" empty="Оплаты за период нет.">
          {paymentSplit.map((item) => (
            <ReportListRow key={item.method} title={paymentLabel(item.method)} note={`${item.quantity} шт · прибыль ${item.profit.toLocaleString()} ₸`} value={`${item.revenue.toLocaleString()} ₸`} />
          ))}
        </ReportList>
        <ReportList title="Низкий остаток" empty="Критических остатков нет.">
          {lowStockProducts.map((item) => (
            <ReportListRow
              key={item.product.id}
              title={String(item.product.name ?? "Товар")}
              note={`продано ${item.sold} шт`}
              value={`${item.remaining} шт`}
              danger={item.remaining <= 0}
            />
          ))}
        </ReportList>
      </div>
    </Card>
  );
}

function ReportMetric({ title, value, note, icon, danger = false }: { title: string; value: string; note: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 ${danger ? "border-red-300/25 bg-red-500/[0.08]" : "border-white/10 bg-slate-950/35"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl border ${danger ? "border-red-300/30 bg-red-500/10 text-red-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function ReportList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
      <h3 className="font-black text-white">{title}</h3>
      <div className="mt-4 grid gap-2">
        {hasChildren ? children : <p className="rounded-2xl bg-white/[0.04] p-3 text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  );
}

function ReportListRow({ title, note, value, danger = false }: { title: string; note: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${danger ? "border-red-300/25 bg-red-500/10" : "border-white/10 bg-white/[0.035]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${danger ? "bg-red-500 text-white" : "bg-cyan-300/10 text-cyan-100"}`}>{value}</span>
      </div>
    </div>
  );
}

function Metric({ title, value, note, icon, danger = false }: { title: string; value: string | number; note: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <Card className={`${danger ? "border-red-300/25 bg-red-500/[0.08]" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl border ${danger ? "border-red-300/30 bg-red-500/10 text-red-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </Card>
  );
}

function MiniReport({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function ProductPhoto({ src, name }: { src: string; name: string }) {
  if (!src) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
        <ImageIcon className="h-5 w-5" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover" />
  );
}

function summarizeProduct(product: RetailRow, sales: RetailRow[]) {
  const productSales = sales.filter((sale) => sale.product_id === product.id);
  const sold = productSales.reduce((sum, sale) => sum + Number(sale.quantity ?? 0), 0);
  const profit = productSales.reduce((sum, sale) => sum + Number(sale.profit_amount ?? 0), 0);
  const remaining = Number(product.initial_quantity ?? 0) - sold;
  return { product, sold, remaining, profit };
}

function sumSales(sales: RetailRow[]) {
  return sales.reduce(
    (acc, sale) => ({
      quantity: acc.quantity + Number(sale.quantity ?? 0),
      revenue: acc.revenue + Number(sale.total_amount ?? 0),
      profit: acc.profit + Number(sale.profit_amount ?? 0),
    }),
    { quantity: 0, revenue: 0, profit: 0 },
  );
}

function dateMinus(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function lastSevenDays(dateString: string) {
  return Array.from({ length: 7 }).map((_, index) => dateMinus(dateString, 6 - index));
}

function groupSalesByPayment(sales: RetailRow[]) {
  const map = new Map<string, { method: string; quantity: number; revenue: number; profit: number }>();
  for (const sale of sales) {
    const method = String(sale.payment_method ?? "unknown");
    const current = map.get(method) ?? { method, quantity: 0, revenue: 0, profit: 0 };
    current.quantity += Number(sale.quantity ?? 0);
    current.revenue += Number(sale.total_amount ?? 0);
    current.profit += Number(sale.profit_amount ?? 0);
    map.set(method, current);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Наличные",
    kaspi: "Kaspi",
    card: "Карта",
    transfer: "Перевод",
  };
  return labels[method] ?? method;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function buildRetailCsvHref(selectedDate: string, sales: RetailRow[], products: RetailRow[]) {
  const rows = [["date", "product", "quantity", "payment", "revenue", "profit", "customer"]];
  for (const sale of sales) {
    const product = products.find((item) => item.id === sale.product_id);
    rows.push([
      selectedDate,
      String(product?.name ?? ""),
      String(sale.quantity ?? 0),
      String(sale.payment_method ?? ""),
      String(sale.total_amount ?? 0),
      String(sale.profit_amount ?? 0),
      String(sale.customer_name ?? ""),
    ]);
  }
  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map((row) => row.map(csvCell).join(",")).join("\n"))}`;
}
