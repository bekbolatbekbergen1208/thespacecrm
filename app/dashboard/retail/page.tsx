import { deleteRetailProduct, markRetailProductSold, permanentlyDeleteRetailProduct, restoreRetailProduct, returnRetailProduct, saveRetailProduct } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { CameraPhotoField } from "@/components/app/camera-photo-field";
import { Field, Select, SmallButton, Textarea } from "@/components/app/forms";
import { canManage, requireUser } from "@/lib/auth";
import { ArchiveRestore, BarChart3, Bot, CalendarDays, CheckCircle2, CircleDollarSign, Download, Image as ImageIcon, Package, Percent, PieChart, RotateCcw, Search, ShoppingCart, Trash2, TrendingUp } from "lucide-react";

type RetailRow = {
  id: string;
  company_id: string;
  created_at: string;
  [key: string]: string | number | null;
};

export default async function RetailDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string }>;
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
  const activeProducts = allProducts.filter((product) => product.status !== "archived");
  const archivedProducts = allProducts.filter((product) => product.status === "archived");
  const productRows = activeProducts.filter((product) => {
    const text = [product.name, product.category, product.address, product.photo_keywords, product.notes, product.photo_url].join(" ").toLowerCase();
    return !query || text.includes(query);
  });
  const summaries = productRows.map((product) => summarizeProduct(product, saleRows));
  const daySales = saleRows.filter((sale) => sale.sale_date === selectedDate);
  const dayReturns = daySales.filter((sale) => Number(sale.quantity ?? 0) < 0);
  const dayReport = sumSales(daySales);
  const totalReport = sumSales(saleRows);
  const totalRemaining = activeProducts.reduce((sum, product) => sum + summarizeProduct(product, saleRows).remaining, 0);
  const csvHref = `/dashboard/retail/export?date=${encodeURIComponent(selectedDate)}`;
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
  const aiQuestion = params.aiq ?? "";
  const assistantAnswer = aiQuestion
    ? answerRetailQuestion({ question: aiQuestion, selectedDate, products: activeProducts, archivedProducts, sales: saleRows, daySales, summaries, dayReport, totalReport })
    : "";
  const assistantInsights = buildRetailAssistantInsights({ activeProducts, archivedProducts, summaries, dayReport, dayReturns });

  return (
    <>
      <PageHeader
        title="Retail Store"
        description="Продажи товаров: фото, название, закупочная цена, цена при продаже, возвраты, мусор, AI ассистент и отчёты."
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
      {params.saved === "return" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Возврат сохранён.</p>}
      {params.saved === "deleted" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Товар удалён.</p>}
      {params.saved === "restored" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Товар восстановлен.</p>}
      {params.saved === "purged" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Товар окончательно удалён.</p>}

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric title="Товары" value={activeProducts.length} note={`остаток ${totalRemaining} шт`} icon={<Package className="h-4 w-4" />} />
        <Metric title="Продано сегодня" value={dayReport.quantity} note={selectedDate} icon={<ShoppingCart className="h-4 w-4" />} />
        <Metric title="Выручка" value={`${dayReport.revenue.toLocaleString()} ₸`} note="за выбранный день" icon={<CircleDollarSign className="h-4 w-4" />} />
        <Metric title="Прибыль" value={`${dayReport.profit.toLocaleString()} ₸`} note={`Всего ${totalReport.profit.toLocaleString()} ₸`} icon={<BarChart3 className="h-4 w-4" />} danger={dayReport.profit < 0} />
        <Metric title="Возвраты" value={Math.abs(dayReturns.reduce((sum, sale) => sum + Number(sale.quantity ?? 0), 0))} note="шт за день" icon={<RotateCcw className="h-4 w-4" />} danger={dayReturns.length > 0} />
        <Metric title="Мусор" value={archivedProducts.length} note="архивные товары" icon={<Trash2 className="h-4 w-4" />} danger={archivedProducts.length > 0} />
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_240px_180px_180px]">
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
          <a href={csvHref} download={`retail-profit-report-${selectedDate}.csv`} className="premium-button h-12 justify-center bg-white px-4 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
            <Download className="h-4 w-4" />
            CSV за день
          </a>
          <a href="/dashboard/retail/export?all=1" download="retail-profit-report-all.csv" className="premium-button h-12 justify-center border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm text-cyan-100">
            <Download className="h-4 w-4" />
            CSV вся история
          </a>
        </div>
      </Card>

      <Card id="assistant" className="mb-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              <Bot className="h-3.5 w-3.5" />
              AI ассистент
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">Помощник Retail Store</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Отвечает по товарам, остаткам, возвратам, прибыли и мусору. Сейчас работает без внешнего API, поэтому ответы появляются сразу по данным CRM.
            </p>
            <div className="mt-4 grid gap-3">
              {assistantInsights.map((item) => (
                <AssistantInsight key={item.title} title={item.title} detail={item.detail} tone={item.tone} />
              ))}
            </div>
          </div>
          <form action="/dashboard/retail#assistant" className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <input type="hidden" name="date" value={selectedDate} />
            {params.q && <input type="hidden" name="q" value={params.q} />}
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Спросить у ассистента</span>
              <textarea
                name="aiq"
                defaultValue={aiQuestion}
                placeholder="Например: какие товары заканчиваются, какая прибыль, сколько возвратов, что в мусоре?"
                className="premium-input min-h-28 w-full px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <button className="premium-button mt-3 h-11 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
              <Bot className="h-4 w-4" />
              Спросить
            </button>
            {assistantAnswer && (
              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ответ</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-100">{assistantAnswer}</p>
              </div>
            )}
          </form>
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
              <p className="text-sm text-slate-400">Заполните название, адрес, фото, закупочную цену и количество. Цену продажи вводите при продаже.</p>
            </div>
          </div>
          <form action={saveRetailProduct} className="grid gap-4 xl:grid-cols-4">
            <Field label="Название" name="name" />
            <Field label="Категория" name="category" required={false} />
            <Field label="Адрес" name="address" required={false} />
            <CameraPhotoField label="Фото товара" />
            <Field label="Фото-поиск / ключи" name="photoKeywords" required={false} />
            <Field label="Закупили за" name="purchasePrice" type="number" defaultValue={0} />
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
                              {product.address && <p className="mt-1 text-xs font-semibold text-cyan-100/80">{product.address}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black text-white">{Number(product.purchase_price ?? 0).toLocaleString()} ₸</p>
                          <p className="text-xs text-slate-500">закупочная цена</p>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{sold} шт</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${remaining <= 0 ? "bg-red-500 text-white" : remaining <= 3 ? "bg-yellow-300 text-yellow-950" : "bg-emerald-300 text-emerald-950"}`}>
                            {remaining} шт
                          </span>
                          <p className="mt-2 text-xs text-slate-500">прибыль {profit.toLocaleString()} ₸</p>
                        </td>
                        <td className="px-4 py-4">
                          <form action={deleteRetailProduct} className="mb-3">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="selectedDate" value={selectedDate} />
                            <button className="premium-button h-10 w-full justify-center border border-red-300/25 bg-red-500/15 px-3 text-xs font-black text-red-100 hover:bg-red-500/25">
                              <Trash2 className="h-3.5 w-3.5" />
                              Удалить товар
                            </button>
                          </form>
                          <form action={markRetailProductSold} className="grid min-w-56 gap-2">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="date" name="saleDate" defaultValue={selectedDate} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                            <div className="grid grid-cols-2 gap-2">
                              <input name="quantity" type="number" min="1" defaultValue={1} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                              <input name="salePrice" type="number" min="0" placeholder="Цена" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
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
                          <form action={returnRetailProduct} className="mt-3 grid min-w-56 gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-300/5 p-2">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="date" name="returnDate" defaultValue={selectedDate} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                            <div className="grid grid-cols-2 gap-2">
                              <input name="quantity" type="number" min="1" defaultValue={1} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                              <input name="returnPrice" type="number" min="0" placeholder="Сумма" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                            </div>
                            <input name="customerName" placeholder="Кто вернул" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                            <button className="premium-button h-9 w-full justify-center border border-yellow-300/20 bg-yellow-300/10 px-3 text-xs font-black text-yellow-100 hover:bg-yellow-300/15">
                              <RotateCcw className="h-3.5 w-3.5" />
                              Возврат
                            </button>
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
                      <p>День покупки: <b className="text-white">{String(product?.created_at ?? "").slice(0, 10) || "-"}</b></p>
                      <p>День продажи: <b className="text-white">{String(sale.sale_date ?? selectedDate)}</b></p>
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
      <RetailTrashSection products={archivedProducts} />
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

function RetailTrashSection({ products }: { products: RetailRow[] }) {
  return (
    <Card id="trash" className="mt-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-100">
            <Trash2 className="h-3.5 w-3.5" />
            Мусор
          </p>
          <h2 className="mt-3 text-xl font-black text-white">Удалённые товары</h2>
          <p className="mt-1 text-sm text-slate-400">Здесь товары, которые скрыты из основной таблицы. Их можно восстановить или удалить окончательно.</p>
        </div>
        <span className="w-fit rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-100">{products.length} в мусоре</span>
      </div>
      {products.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-center gap-3">
                <ProductPhoto src={String(product.photo_url ?? "")} name={String(product.name ?? "Товар")} />
                <div>
                  <p className="font-black text-white">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.category || "Без категории"}</p>
                  {product.address && <p className="mt-1 text-xs font-semibold text-cyan-100/80">{product.address}</p>}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <form action={restoreRetailProduct}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="premium-button h-10 w-full justify-center border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-black text-emerald-100 hover:bg-emerald-300/15">
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    Вернуть
                  </button>
                </form>
                <form action={permanentlyDeleteRetailProduct}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="premium-button h-10 w-full justify-center border border-red-300/25 bg-red-500/15 px-3 text-xs font-black text-red-100 hover:bg-red-500/25">
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить навсегда
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="Мусор пуст. Удалённые товары появятся здесь." />
      )}
    </Card>
  );
}

function AssistantInsight({ title, detail, tone }: { title: string; detail: string; tone: "good" | "warn" | "bad" }) {
  const toneClass = {
    good: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    warn: "border-yellow-300/20 bg-yellow-300/10 text-yellow-100",
    bad: "border-red-300/20 bg-red-500/10 text-red-100",
  }[tone];
  return (
    <div className={`rounded-3xl border p-4 ${toneClass}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-85">{detail}</p>
    </div>
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
    return: "Возврат",
  };
  return labels[method] ?? method;
}

function buildRetailAssistantInsights({
  activeProducts,
  archivedProducts,
  summaries,
  dayReport,
  dayReturns,
}: {
  activeProducts: RetailRow[];
  archivedProducts: RetailRow[];
  summaries: Array<ReturnType<typeof summarizeProduct>>;
  dayReport: ReturnType<typeof sumSales>;
  dayReturns: RetailRow[];
}) {
  const lowStock = summaries.filter((item) => item.remaining <= 3);
  const items: Array<{ title: string; detail: string; tone: "good" | "warn" | "bad" }> = [];

  items.push({
    title: dayReport.profit >= 0 ? "День в плюсе" : "День в минусе",
    detail: `Сегодня выручка ${dayReport.revenue.toLocaleString()} ₸, прибыль ${dayReport.profit.toLocaleString()} ₸.`,
    tone: dayReport.profit >= 0 ? "good" : "bad",
  });

  items.push({
    title: lowStock.length ? "Есть низкий остаток" : "Остатки нормальные",
    detail: lowStock.length
      ? `Проверьте: ${lowStock.slice(0, 4).map((item) => `${item.product.name} (${item.remaining} шт)`).join(", ")}.`
      : `${activeProducts.length} активных товаров без критического остатка.`,
    tone: lowStock.length ? "warn" : "good",
  });

  items.push({
    title: dayReturns.length ? "Есть возвраты" : "Возвратов нет",
    detail: dayReturns.length
      ? `За день оформлено ${Math.abs(dayReturns.reduce((sum, sale) => sum + Number(sale.quantity ?? 0), 0))} шт возврата.`
      : "Сегодня возвраты не записаны.",
    tone: dayReturns.length ? "warn" : "good",
  });

  items.push({
    title: archivedProducts.length ? "В мусоре есть товары" : "Мусор пуст",
    detail: archivedProducts.length ? `${archivedProducts.length} товаров скрыто из основной таблицы.` : "Архивных товаров нет.",
    tone: archivedProducts.length ? "warn" : "good",
  });

  return items;
}

function answerRetailQuestion({
  question,
  selectedDate,
  products,
  archivedProducts,
  sales,
  daySales,
  summaries,
  dayReport,
  totalReport,
}: {
  question: string;
  selectedDate: string;
  products: RetailRow[];
  archivedProducts: RetailRow[];
  sales: RetailRow[];
  daySales: RetailRow[];
  summaries: Array<ReturnType<typeof summarizeProduct>>;
  dayReport: ReturnType<typeof sumSales>;
  totalReport: ReturnType<typeof sumSales>;
}) {
  const q = question.toLowerCase();
  const wantsProfit = /прибыл|пайда|доход|выруч|табыс|ақша|акша|деньг|сумм/.test(q);
  const wantsStock = /остат|қалды|калды|склад|товар|заканч|мало/.test(q);
  const wantsReturns = /возврат|қайтар|кайтар|вернул/.test(q);
  const wantsTrash = /мусор|архив|удален|удалён|trash/.test(q);
  const wantsTop = /топ|лучший|көп|коп|много|продан/.test(q);

  if (wantsProfit) {
    return [
      `Отчёт за ${selectedDate}:`,
      `- Выручка: ${dayReport.revenue.toLocaleString()} ₸`,
      `- Прибыль: ${dayReport.profit.toLocaleString()} ₸`,
      `- Количество: ${dayReport.quantity} шт`,
      `\nВся история: выручка ${totalReport.revenue.toLocaleString()} ₸, прибыль ${totalReport.profit.toLocaleString()} ₸.`,
    ].join("\n");
  }

  if (wantsStock) {
    const low = summaries.filter((item) => item.remaining <= 3);
    if (!low.length) return `Остатки нормальные. Активных товаров: ${products.length}.`;
    return `Товары с низким остатком:\n${low.slice(0, 10).map((item) => `- ${String(item.product.name)}: ${item.remaining} шт`).join("\n")}`;
  }

  if (wantsReturns) {
    const returns = daySales.filter((sale) => Number(sale.quantity ?? 0) < 0);
    if (!returns.length) return `За ${selectedDate} возвратов нет.`;
    return [
      `Возвраты за ${selectedDate}: ${returns.length} записей.`,
      ...returns.slice(0, 10).map((sale) => {
        const product = products.find((item) => item.id === sale.product_id) ?? archivedProducts.find((item) => item.id === sale.product_id);
        return `- ${String(product?.name ?? "Товар")}: ${Math.abs(Number(sale.quantity ?? 0))} шт, сумма ${Math.abs(Number(sale.total_amount ?? 0)).toLocaleString()} ₸`;
      }),
    ].join("\n");
  }

  if (wantsTrash) {
    if (!archivedProducts.length) return "Мусор пуст. Архивных товаров нет.";
    return `В мусоре ${archivedProducts.length} товаров:\n${archivedProducts.slice(0, 10).map((item) => `- ${String(item.name ?? "Товар")}`).join("\n")}`;
  }

  if (wantsTop) {
    const top = summaries
      .filter((item) => item.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 8);
    if (!top.length) return "Продаж пока нет, топ товаров ещё не сформирован.";
    return `Топ продаж:\n${top.map((item, index) => `${index + 1}. ${String(item.product.name)} — ${item.sold} шт, прибыль ${item.profit.toLocaleString()} ₸`).join("\n")}`;
  }

  return [
    "Я могу ответить по Retail Store. Попробуйте спросить:",
    "- какая прибыль сегодня?",
    "- какие товары заканчиваются?",
    "- сколько возвратов?",
    "- что в мусоре?",
    "- какие товары продаются лучше?",
    `\nВсего продаж в базе: ${sales.length}. Активных товаров: ${products.length}.`,
  ].join("\n");
}
