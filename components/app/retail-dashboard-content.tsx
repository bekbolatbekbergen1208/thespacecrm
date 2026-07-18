import {
  deleteRetailProduct,
  markRetailDebtPaid,
  markRetailDebtReminderSent,
  markRetailProductSold,
  permanentlyDeleteRetailProduct,
  restoreRetailProduct,
  returnRetailProduct,
  saveRetailDebt,
  saveRetailProduct,
} from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { CameraPhotoField } from "@/components/app/camera-photo-field";
import { Field, Select, SmallButton, Textarea } from "@/components/app/forms";
import { PhotoSearchField } from "@/components/app/photo-search-field";
import { canManage, requireMembership } from "@/lib/auth";
import { ArchiveRestore, BarChart3, Bell, Bot, CalendarDays, CheckCircle2, ChevronDown, CircleDollarSign, Download, Image as ImageIcon, MapPin, MessageCircle, Package, Percent, PieChart, RotateCcw, Search, ShoppingCart, Trash2, TrendingUp } from "lucide-react";

type RetailRow = {
  id: string;
  company_id: string;
  created_at?: string;
  [key: string]: string | number | null | undefined;
};

export type RetailSearchParams = {
  error?: string;
  q?: string;
  category?: string;
  address?: string;
  photo?: string;
  date?: string;
  page?: string;
  saved?: string;
  aiq?: string;
};
export type RetailSection = "overview" | "products" | "calendar" | "reports" | "debts" | "trash" | "assistant";

export async function RetailDashboardContent({
  searchParams,
  section,
}: {
  searchParams: Promise<RetailSearchParams>;
  section: RetailSection;
}) {
  const [{ supabase, membership }, params] = await Promise.all([requireMembership(), searchParams]);
  const companyId = membership!.company_id;
  const editable = canManage(membership!.role);
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = params.date || today;
  const query = (params.q ?? "").toLowerCase();
  const categoryQuery = (params.category ?? "").toLowerCase();
  const addressQuery = (params.address ?? "").toLowerCase();
  const photoQuery = (params.photo ?? "").toLowerCase();
  const currentPage = Math.max(1, Number(params.page ?? 1) || 1);
  const sectionPath = retailSectionPath(section);
  const showOverview = section === "overview";
  const showProducts = section === "products";
  const showCalendar = section === "calendar";
  const showReports = section === "reports";
  const showDebts = section === "debts";
  const showTrash = section === "trash";
  const showAssistant = section === "assistant";
  const shouldFetchSales = showProducts || showCalendar || showReports || showAssistant;
  const shouldFetchDebts = showDebts;
  const pageTitles: Record<RetailSection, { title: string; description: string }> = {
    overview: {
      title: "Retail Store",
      description: "Продажи товаров: фото, название, закупочная цена, цена при продаже, возвраты, мусор, AI ассистент и отчёты.",
    },
    products: {
      title: "Товары и продажи",
      description: "Добавление товаров, адрес, фото, закупочная цена, продажа, возврат и остаток.",
    },
    calendar: {
      title: "Календарь продаж",
      description: "Выберите день и смотрите продажи, выручку, прибыль и возвраты за дату.",
    },
    reports: {
      title: "Отчёты Retail Store",
      description: "День, 7 дней, 30 дней, прибыль, адреса, оплата, низкий остаток и CSV.",
    },
    debts: {
      title: "Долги Retail Store",
      description: "Суммы, номера WhatsApp, дата оплаты и напоминания клиентам.",
    },
    trash: {
      title: "Мусор товаров",
      description: "Удалённые товары можно восстановить или удалить окончательно.",
    },
    assistant: {
      title: "AI ассистент Retail Store",
      description: "Задавайте вопросы по товарам, остаткам, продажам, возвратам и прибыли.",
    },
  };

  const productColumns = retailProductColumns(section);
  const saleColumns = retailSaleColumns(section);
  const debtColumns = "id,company_id,product_id,customer_name,phone,amount,due_date,status,notes,last_reminded_at,paid_at,created_at";
  const calendarOnly = showCalendar && !showProducts && !showReports && !showAssistant;
  const productLimit = retailProductLimit(section);
  const productOffset = showProducts ? (currentPage - 1) * productLimit : 0;

  let productsResult: Awaited<ReturnType<typeof fetchRetailProducts>>;
  let salesResult: Awaited<ReturnType<typeof fetchRetailSales>>;
  let debtsResult: { data: unknown[] | null; error: { message?: string } | null };

  if (showProducts) {
    productsResult = await fetchRetailProducts({ supabase, companyId, section, productColumns, limit: productLimit, offset: productOffset, query, categoryQuery, addressQuery, photoQuery });
    const productIds = ((productsResult.data ?? []) as unknown as RetailRow[]).map((product) => String(product.id)).filter(Boolean);
    [salesResult, debtsResult] = await Promise.all([
      fetchRetailSales({ supabase, companyId, selectedDate, section, shouldFetchSales, calendarOnly, saleColumns, productIds }),
      Promise.resolve({ data: [], error: null }),
    ]);
  } else {
    [productsResult, salesResult, debtsResult] = await Promise.all([
      fetchRetailProducts({ supabase, companyId, section, productColumns, limit: productLimit, offset: 0, query, categoryQuery, addressQuery, photoQuery }),
      fetchRetailSales({ supabase, companyId, selectedDate, section, shouldFetchSales, calendarOnly, saleColumns }),
      shouldFetchDebts
        ? supabase.from("retail_debts").select(debtColumns).eq("company_id", companyId).order("created_at", { ascending: false }).limit(500)
        : Promise.resolve({ data: [], error: null }),
    ]);
  }

  const { data: products, error: productsError } = productsResult;
  const { data: sales, error: salesError } = salesResult;
  const { data: debts, error: debtsError } = debtsResult;
  const schemaError = [productsError, salesError, debtsError].find((error) => error?.message?.toLowerCase().includes("schema cache") || error?.message?.toLowerCase().includes("retail_products") || error?.message?.toLowerCase().includes("retail_debts"));

  const saleRows = (sales ?? []) as unknown as RetailRow[];
  const debtRows = (debts ?? []) as unknown as RetailRow[];
  const openDebts = debtRows.filter((debt) => debt.status !== "paid");
  const allProducts = (products ?? []) as unknown as RetailRow[];
  const hasNextProductsPage = showProducts && allProducts.length === productLimit;
  const activeProducts = allProducts.filter((product) => product.status !== "archived");
  const archivedProducts = allProducts.filter((product) => product.status === "archived");
  const saleSummaryByProduct = buildSaleSummaryByProduct(saleRows);
  const needsProductRows = showProducts || showReports || showAssistant;
  const productRows = needsProductRows
    ? rankRetailProducts(
        activeProducts.filter((product) => matchesRetailProductFilters(product, { query, categoryQuery, addressQuery, photoQuery })),
        photoQuery,
      )
    : activeProducts;
  const similarPhotoProducts = showProducts && photoQuery
    ? buildSimilarPhotoProducts(activeProducts, photoQuery, saleSummaryByProduct).slice(0, 6)
    : [];
  const needsSummaries = showProducts || showReports || showAssistant;
  const summaries = needsSummaries ? productRows.map((product) => summarizeProduct(product, saleSummaryByProduct)) : [];
  const needsDaySales = showCalendar || showReports || showAssistant;
  const daySales = needsDaySales ? saleRows.filter((sale) => sale.sale_date === selectedDate) : [];
  const dayReturns = showAssistant ? daySales.filter((sale) => Number(sale.quantity ?? 0) < 0) : [];
  const dayReport = needsDaySales ? sumSales(daySales) : emptySalesReport();
  const totalReport = showReports || showAssistant ? sumSales(saleRows) : emptySalesReport();
  const csvHref = `/dashboard/retail/export?date=${encodeURIComponent(selectedDate)}`;
  const last7Sales = showReports ? saleRows.filter((sale) => sale.sale_date && sale.sale_date >= dateMinus(selectedDate, 6) && sale.sale_date <= selectedDate) : [];
  const last30Sales = showReports ? saleRows.filter((sale) => sale.sale_date && sale.sale_date >= dateMinus(selectedDate, 29) && sale.sale_date <= selectedDate) : [];
  const last7Report = showReports ? sumSales(last7Sales) : emptySalesReport();
  const last30Report = showReports ? sumSales(last30Sales) : emptySalesReport();
  const paymentSplit = showReports ? groupSalesByPayment(last30Sales) : [];
  const topProducts = showReports
    ? summaries
        .filter((item) => item.sold > 0)
        .sort((a, b) => b.sold - a.sold || b.profit - a.profit)
        .slice(0, 5)
    : [];
  const lowStockProducts = showReports
    ? summaries
        .filter((item) => item.remaining <= 3)
        .sort((a, b) => a.remaining - b.remaining)
        .slice(0, 6)
    : [];
  const inventoryCost = showReports ? summaries.reduce((sum, item) => sum + Math.max(0, item.remaining) * Number(item.product.purchase_price ?? 0), 0) : 0;
  const margin = showReports && totalReport.revenue ? Math.round((totalReport.profit / totalReport.revenue) * 100) : 0;
  const dailyTrend = showReports ? lastSevenDays(selectedDate).map((date) => ({ date, ...sumSales(saleRows.filter((sale) => sale.sale_date === date)) })) : [];
  const addressReports = showReports ? groupRetailByAddress(activeProducts, saleSummaryByProduct) : [];
  const aiQuestion = params.aiq ?? "";
  const assistantAnswer = aiQuestion
    ? answerRetailQuestion({ question: aiQuestion, selectedDate, products: activeProducts, archivedProducts, sales: saleRows, daySales, summaries, dayReport, totalReport })
    : "";
  const assistantInsights = buildRetailAssistantInsights({ activeProducts, archivedProducts, summaries, dayReport, dayReturns });

  return (
    <>
      <PageHeader
        title={pageTitles[section].title}
        description={pageTitles[section].description}
      />

      {params.error && <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{params.error}</p>}
      {schemaError && (
        <div className="mb-4 rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-50">
          <p className="font-black">Retail Store таблицы ещё не созданы в Supabase.</p>
          <p className="mt-1 text-yellow-100/90">
            Откройте Supabase SQL Editor и выполните файл <b>supabase/retail-store.sql</b>. После выполнения таблицы
            <b> retail_products</b>, <b>retail_product_sales</b> и <b>retail_debts</b> появятся в schema cache.
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
      {params.saved === "debt" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Долг сохранён.</p>}
      {params.saved === "debt-paid" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Долг закрыт.</p>}
      {params.saved === "debt-reminder" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Напоминание отмечено отправленным.</p>}

      {showOverview && (
        <CollapsibleSection
          title="Сводка"
          description="Товары, продажи, выручка, прибыль, долги и возвраты скрыты до открытия."
          badge={`${activeProducts.length} товаров`}
          icon={<BarChart3 className="h-4 w-4" />}
        >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <Metric title="Товары" value={activeProducts.length} note="активные товары" icon={<Package className="h-4 w-4" />} />
          <Metric title="Остаток" value={activeProducts.reduce((sum, product) => sum + Number(product.initial_quantity ?? 0), 0)} note="по добавленному количеству" icon={<ShoppingCart className="h-4 w-4" />} />
          <Metric title="Архив" value={archivedProducts.length} note="товары в мусоре" icon={<Trash2 className="h-4 w-4" />} danger={archivedProducts.length > 0} />
          <Metric title="Продажи" value="отдельно" note="откройте товары или календарь" icon={<CircleDollarSign className="h-4 w-4" />} />
          <Metric title="Отчёты" value="отдельно" note="быстрая отдельная страница" icon={<BarChart3 className="h-4 w-4" />} />
          <Metric title="Долги" value="отдельно" note="загрузка без продаж" icon={<Bell className="h-4 w-4" />} />
          <Metric title="AI" value="отдельно" note="вопросы по данным" icon={<Bot className="h-4 w-4" />} />
        </div>
        </CollapsibleSection>
      )}

      {showOverview && <RetailQuickLinks />}

      {!showOverview && (
      <Card className="mb-5">
        <form action={sectionPath} className="grid gap-3 xl:grid-cols-[1.1fr_0.8fr_0.9fr_0.9fr_220px_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Название, заметки, общий поиск..."
              className="premium-input h-12 w-full pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <label className="relative">
            <ShoppingCart className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              name="category"
              defaultValue={params.category ?? ""}
              placeholder="Категория"
              className="premium-input h-12 w-full pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <label className="relative">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              name="address"
              defaultValue={params.address ?? ""}
              placeholder="Адрес"
              className="premium-input h-12 w-full pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <PhotoSearchField defaultValue={params.photo ?? ""} />
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type="date" name="date" defaultValue={selectedDate} className="premium-input h-12 w-full pl-11 pr-4 text-sm text-white outline-none" />
          </label>
          <button className="premium-button h-12 justify-center bg-white px-4 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
            <Search className="h-4 w-4" />
            Найти
          </button>
          <a href={sectionPath} className="premium-button h-12 justify-center border border-white/10 bg-white/[0.045] px-4 text-sm text-slate-200 hover:bg-white/[0.08]">
            Сброс
          </a>
        </form>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_auto_auto]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-xs leading-5 text-slate-400">
            <b className="text-cyan-100">Фото-поиск:</b> ищет по полям “Фото URL” и “Фото-поиск / ключи”.
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-xs leading-5 text-slate-400">
            <b className="text-cyan-100">Адрес + категория:</b> можно комбинировать фильтры вместе.
          </div>
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
      )}

      {showAssistant && (
        <CollapsibleSection
          title="AI ассистент"
          description="Вопросы по товарам, остаткам, возвратам, прибыли и мусору."
          badge="Открыть"
          icon={<Bot className="h-4 w-4" />}
          id="assistant"
          defaultOpen={section === "assistant" || Boolean(aiQuestion)}
        >
        <Card>
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
            <form action="/dashboard/retail/assistant#assistant" className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
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
        </CollapsibleSection>
      )}

      {showReports && (
        <CollapsibleSection
          title="Отчёты"
          description="День, 7 дней, 30 дней, прибыль, адреса, оплаты и остатки."
          badge={`${dayReport.revenue.toLocaleString()} ₸`}
          icon={<PieChart className="h-4 w-4" />}
          id="reports"
          defaultOpen={section === "reports"}
        >
        <RetailReportsSection
          selectedDate={selectedDate}
          dayReport={dayReport}
          last7Report={last7Report}
          last30Report={last30Report}
          totalReport={totalReport}
          margin={margin}
          inventoryCost={inventoryCost}
          paymentSplit={paymentSplit}
          topProducts={topProducts}
          lowStockProducts={lowStockProducts}
          dailyTrend={dailyTrend}
          addressReports={addressReports}
        />
        </CollapsibleSection>
      )}

      {showDebts && (
        <CollapsibleSection
          title="Долги"
          description="Список долгов, номера WhatsApp и напоминания каждые 12 часов."
          badge={`${openDebts.length} открыто`}
          icon={<Bell className="h-4 w-4" />}
          id="debts"
          defaultOpen={section === "debts"}
        >
        <RetailDebtsSection debts={openDebts} products={allProducts} editable={editable} />
        </CollapsibleSection>
      )}

      {editable && showProducts && (
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

      {(showProducts || showCalendar) && (
        <CollapsibleSection
          title={showCalendar && !showProducts ? "Календарь продаж" : "Товары и продажи"}
          description={showCalendar && !showProducts ? "Отчёт по выбранному дню и список продаж." : "Таблица товаров, продажа, возврат и календарный отчёт скрыты до открытия."}
          badge={`${productRows.length} товаров`}
          icon={<ShoppingCart className="h-4 w-4" />}
          defaultOpen={section === "products" || section === "calendar"}
        >
        <div className={`grid gap-5 ${showProducts && showCalendar ? "xl:grid-cols-[1.05fr_0.95fr]" : ""}`}>
          {showProducts && (
            <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Таблица товаров</h2>
              <p className="text-sm text-slate-400">Можно назначить товар проданным и сразу увидеть остаток. Список грузится страницами по {productLimit} товаров.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                Стр. {currentPage} · {productRows.length} товаров
              </span>
              <RetailProductPagination
                currentPage={currentPage}
                hasNext={hasNextProductsPage}
                sectionPath={sectionPath}
                params={params}
              />
            </div>
          </div>
          {similarPhotoProducts.length > 0 && (
            <div className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">AI фото-поиск</p>
                  <h3 className="mt-1 text-lg font-black text-white">Похожие варианты</h3>
                </div>
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
                  {similarPhotoProducts.length} найдено
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {similarPhotoProducts.map(({ product, score, remaining }) => (
                  <div key={product.id} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                    <ProductPhoto src={String(product.photo_url ?? "")} name={String(product.name ?? "Товар")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-white">{product.name}</p>
                      <p className="truncate text-xs text-slate-400">{product.category || "Без категории"}</p>
                      {product.address && <p className="mt-1 truncate text-xs text-cyan-100/80">{product.address}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">{score}% похоже</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${remaining <= 0 ? "bg-red-500 text-white" : remaining <= 3 ? "bg-yellow-300 text-yellow-950" : "bg-emerald-300 text-emerald-950"}`}>
                          {remaining} шт
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {productRows.length ? (
            <>
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
                          <td className="px-4 py-4 align-top">
                            <details className="group min-w-64 rounded-2xl border border-white/10 bg-slate-950/35 p-2">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/10">
                                <span>Открыть функции</span>
                                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                              </summary>
                              <div className="mt-3 grid gap-3">
                                <form action={markRetailProductSold} className="grid gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-2">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Продажа</p>
                                  <input type="hidden" name="productId" value={product.id} />
                                  <input type="date" name="saleDate" defaultValue={selectedDate} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input name="quantity" type="number" min="1" defaultValue={1} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                                    <input name="salePrice" type="number" min="0" placeholder="Цена" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                                  </div>
                                  <select name="paymentMethod" defaultValue="cash" className="premium-input h-9 px-3 text-xs text-white outline-none">
                                    <option value="cash">Нал</option>
                                    <option value="kaspi">Kaspi</option>
                                    <option value="card">Карта</option>
                                    <option value="transfer">Перевод</option>
                                  </select>
                                  <input name="customerName" placeholder="Покупатель" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                                  <SmallButton>Продано</SmallButton>
                                </form>

                                <form action={saveRetailDebt} className="grid gap-2 rounded-2xl border border-red-300/20 bg-red-500/5 p-2">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-red-100">В долг</p>
                                  <input type="hidden" name="productId" value={product.id} />
                                  <input name="customerName" placeholder="Клиент" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                                  <input name="phone" placeholder="WhatsApp номер" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input name="amount" type="number" min="0" placeholder="Сумма" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                                    <input name="dueDate" type="date" defaultValue={selectedDate} className="premium-input h-9 px-3 text-xs text-white outline-none" />
                                  </div>
                                  <input name="notes" placeholder="Комментарий" className="premium-input h-9 px-3 text-xs text-white outline-none placeholder:text-slate-500" />
                                  <button className="premium-button h-9 w-full justify-center border border-red-300/20 bg-red-500/10 px-3 text-xs font-black text-red-100 hover:bg-red-500/15">
                                    <Bell className="h-3.5 w-3.5" />
                                    Записать долг
                                  </button>
                                </form>

                                <form action={returnRetailProduct} className="grid gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-300/5 p-2">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-yellow-100">Возврат</p>
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

                                <form action={deleteRetailProduct}>
                                  <input type="hidden" name="productId" value={product.id} />
                                  <input type="hidden" name="selectedDate" value={selectedDate} />
                                  <button className="premium-button h-10 w-full justify-center border border-red-300/25 bg-red-500/15 px-3 text-xs font-black text-red-100 hover:bg-red-500/25">
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Удалить товар
                                  </button>
                                </form>
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4">
                <RetailProductPagination
                  currentPage={currentPage}
                  hasNext={hasNextProductsPage}
                  sectionPath={sectionPath}
                  params={params}
                />
              </div>
            </>
          ) : (
            <EmptyState text="Пока товаров нет. Добавьте первый товар сверху или измените поиск." />
          )}
            </Card>
          )}

          {showCalendar && (
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
          )}
        </div>
        </CollapsibleSection>
      )}

      {showTrash && (
        <CollapsibleSection
          title="Мусор"
          description="Удалённые товары скрыты отдельно."
          badge={`${archivedProducts.length} товаров`}
          icon={<Trash2 className="h-4 w-4" />}
          id="trash"
          defaultOpen={section === "trash"}
        >
        <RetailTrashSection products={archivedProducts} />
        </CollapsibleSection>
      )}
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
  paymentSplit,
  topProducts,
  lowStockProducts,
  dailyTrend,
  addressReports,
}: {
  selectedDate: string;
  dayReport: ReturnType<typeof sumSales>;
  last7Report: ReturnType<typeof sumSales>;
  last30Report: ReturnType<typeof sumSales>;
  totalReport: ReturnType<typeof sumSales>;
  margin: number;
  inventoryCost: number;
  paymentSplit: Array<{ method: string; quantity: number; revenue: number; profit: number }>;
  topProducts: Array<ReturnType<typeof summarizeProduct>>;
  lowStockProducts: Array<ReturnType<typeof summarizeProduct>>;
  dailyTrend: Array<{ date: string; quantity: number; revenue: number; profit: number }>;
  addressReports: Array<ReturnType<typeof groupRetailByAddress>[number]>;
}) {
  const maxTrend = Math.max(...dailyTrend.map((item) => item.revenue), 1);
  return (
    <Card>
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
        <ReportMetric title="Маржа" value={`${margin}%`} note={`30 дней: ${totalReport.revenue.toLocaleString()} ₸`} icon={<Percent className="h-4 w-4" />} danger={margin < 15 && totalReport.revenue > 0} />
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
          <p className="mt-1 text-sm text-slate-500">Сколько товара осталось по закупочной цене.</p>
          <div className="mt-4 grid gap-3">
            <MiniReport label="Закупочная" value={`${inventoryCost.toLocaleString()} ₸`} />
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-100/70">Реальная прибыль считается при продаже</p>
            <p className="mt-2 text-2xl font-black text-cyan-50">{totalReport.profit.toLocaleString()} ₸</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/35 p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-black text-white">
              <MapPin className="h-4 w-4 text-cyan-100" />
              Отчёт по адресам
            </h3>
            <p className="mt-1 text-sm text-slate-500">Выручка, прибыль, продажи и остатки отдельно по каждому адресу.</p>
          </div>
          <span className="w-fit rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{addressReports.length} адресов</span>
        </div>
        {addressReports.length ? (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Адрес</th>
                  <th className="px-4 py-3">Товаров</th>
                  <th className="px-4 py-3">Продано</th>
                  <th className="px-4 py-3">Остаток</th>
                  <th className="px-4 py-3">Выручка</th>
                  <th className="px-4 py-3">Прибыль</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {addressReports.map((item) => (
                  <tr key={item.address} className="bg-white/[0.025]">
                    <td className="px-4 py-3 font-black text-white">{item.address}</td>
                    <td className="px-4 py-3 text-slate-300">{item.products} шт</td>
                    <td className="px-4 py-3 text-slate-300">{item.quantity} шт</td>
                    <td className="px-4 py-3 text-slate-300">{item.remaining} шт</td>
                    <td className="px-4 py-3 font-black text-cyan-100">{item.revenue.toLocaleString()} ₸</td>
                    <td className={`px-4 py-3 font-black ${item.profit < 0 ? "text-red-100" : "text-emerald-100"}`}>{item.profit.toLocaleString()} ₸</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl bg-white/[0.04] p-3 text-sm text-slate-500">Адресов пока нет. Добавьте адрес при создании товара.</p>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ReportList title="Топ товаров" empty="Продаж пока нет.">
          {topProducts.map((item, index) => (
            <ReportListRow
              key={item.product.id}
              title={`${index + 1}. ${item.product.name}`}
              note={`${item.sold} шт · прибыль ${item.profit.toLocaleString()} ₸`}
              value={`${item.remaining} ост.`}
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

function RetailQuickLinks() {
  const links = [
    {
      title: "Товары и продажи",
      href: "/dashboard/retail/products",
      description: "Добавить товар, продать, вернуть, записать долг.",
      icon: <ShoppingCart className="h-5 w-5" />,
    },
    {
      title: "Календарь",
      href: "/dashboard/retail/calendar",
      description: "Продажи, выручка и прибыль за выбранный день.",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      title: "Отчёты",
      href: "/dashboard/retail/reports",
      description: "День, 7 дней, 30 дней, адреса, остатки и CSV.",
      icon: <PieChart className="h-5 w-5" />,
    },
    {
      title: "Долги",
      href: "/dashboard/retail/debts",
      description: "WhatsApp номера, суммы и напоминания.",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      title: "AI ассистент",
      href: "/dashboard/retail/assistant",
      description: "Вопросы по товарам, остаткам и прибыли.",
      icon: <Bot className="h-5 w-5" />,
    },
    {
      title: "Мусор",
      href: "/dashboard/retail/trash",
      description: "Восстановить или удалить товары окончательно.",
      icon: <Trash2 className="h-5 w-5" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="group rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[0.06]"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition group-hover:scale-105">
            {link.icon}
          </span>
          <h2 className="mt-4 text-xl font-black text-white">{link.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{link.description}</p>
          <span className="mt-4 inline-flex text-sm font-black text-cyan-100">Открыть страницу</span>
        </a>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  description,
  badge,
  icon,
  id,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  id?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={defaultOpen} className="group mb-5 scroll-mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-3 shadow-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[22px] px-2 py-2 transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-black text-white">{title}</span>
            <span className="block truncate text-sm text-slate-400">{description}</span>
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100 sm:inline-flex">{badge}</span>
          <ChevronDown className="h-5 w-5 text-slate-500 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function RetailDebtsSection({ debts, products, editable }: { debts: RetailRow[]; products: RetailRow[]; editable: boolean }) {
  const total = debts.reduce((sum, debt) => sum + Number(debt.amount ?? 0), 0);
  const dueCount = debts.filter(isDebtReminderDue).length;

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-100">
            <Bell className="h-3.5 w-3.5" />
            Долги
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">Долги клиентов</h2>
          <p className="mt-2 text-sm text-slate-400">Номера WhatsApp, суммы и напоминание каждые 12 часов.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniReport label="Открытый долг" value={`${total.toLocaleString()} ₸`} />
          <MiniReport label="Пора написать" value={`${dueCount} клиент`} />
        </div>
      </div>

      {editable && (
        <form action={saveRetailDebt} className="mb-5 grid gap-4 rounded-3xl border border-white/10 bg-slate-950/35 p-4 xl:grid-cols-5">
          <Field label="Клиент" name="customerName" />
          <Field label="WhatsApp номер" name="phone" />
          <Field label="Сумма долга" name="amount" type="number" defaultValue={0} />
          <Field label="Дата оплаты" name="dueDate" type="date" required={false} />
          <Select label="Статус" name="status" defaultValue="open">
            <option value="open">Открыт</option>
            <option value="paid">Оплачен</option>
          </Select>
          <div className="xl:col-span-5">
            <Textarea label="Комментарий" name="notes" />
          </div>
          <button className="premium-button h-12 w-full bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50 xl:col-span-5">
            <CheckCircle2 className="h-4 w-4" />
            Добавить долг
          </button>
        </form>
      )}

      {debts.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {debts.map((debt) => {
            const due = isDebtReminderDue(debt);
            const whatsappHref = buildDebtWhatsappHref(debt);
            const product = products.find((item) => item.id === debt.product_id);
            return (
              <div key={debt.id} className={`rounded-3xl border p-4 ${due ? "border-red-300/30 bg-red-500/10" : "border-white/10 bg-slate-950/35"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-white">{debt.customer_name}</p>
                    <p className="mt-1 text-sm text-slate-400">{debt.phone}</p>
                    {product && <p className="mt-2 text-sm font-semibold text-cyan-100">Товар: {product.name}</p>}
                    {debt.notes && <p className="mt-2 text-sm text-slate-500">{debt.notes}</p>}
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${due ? "bg-red-500 text-white" : "bg-cyan-300/10 text-cyan-100"}`}>
                    {due ? "12 сағ өтті" : "күту"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniReport label="Сумма" value={`${Number(debt.amount ?? 0).toLocaleString()} ₸`} />
                  <MiniReport label="Дата оплаты" value={String(debt.due_date ?? "-")} />
                  <MiniReport label="Соңғы хабар" value={debt.last_reminded_at ? formatDateTime(String(debt.last_reminded_at)) : "жоқ"} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <a href={whatsappHref} target="_blank" rel="noreferrer" className="premium-button h-10 justify-center border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-black text-emerald-100 hover:bg-emerald-300/15">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                  <form action={markRetailDebtReminderSent}>
                    <input type="hidden" name="debtId" value={debt.id} />
                    <button className="premium-button h-10 w-full justify-center border border-cyan-300/20 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/15">
                      <Bell className="h-3.5 w-3.5" />
                      Отправлено
                    </button>
                  </form>
                  <form action={markRetailDebtPaid}>
                    <input type="hidden" name="debtId" value={debt.id} />
                    <button className="premium-button h-10 w-full justify-center bg-white px-3 text-xs font-black text-slate-950 hover:bg-cyan-50">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Оплачено
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text="Открытых долгов нет. Добавьте долг, если клиент должен оплатить позже." />
      )}
    </Card>
  );
}

function RetailTrashSection({ products }: { products: RetailRow[] }) {
  return (
    <Card>
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

function RetailProductPagination({
  currentPage,
  hasNext,
  sectionPath,
  params,
}: {
  currentPage: number;
  hasNext: boolean;
  sectionPath: string;
  params: RetailSearchParams;
}) {
  if (currentPage <= 1 && !hasNext) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentPage > 1 && (
        <a
          href={retailPageHref(sectionPath, params, currentPage - 1)}
          className="premium-button h-9 justify-center border border-white/10 bg-white/[0.045] px-3 text-xs text-slate-200 hover:bg-white/[0.08]"
        >
          Назад
        </a>
      )}
      {hasNext && (
        <a
          href={retailPageHref(sectionPath, params, currentPage + 1)}
          className="premium-button h-9 justify-center border border-cyan-300/20 bg-cyan-300/10 px-3 text-xs text-cyan-100 hover:bg-cyan-300/15"
        >
          Дальше
        </a>
      )}
    </div>
  );
}

function retailPageHref(sectionPath: string, params: RetailSearchParams, page: number) {
  const search = new URLSearchParams();
  for (const key of ["q", "category", "address", "photo", "date"] as const) {
    const value = params[key];
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const queryString = search.toString();
  return queryString ? `${sectionPath}?${queryString}` : sectionPath;
}

function retailSearchTokens(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/^ai-photo\s*/, "")
        .replace(/data:image\/[a-z]+;base64,[a-z0-9+/=]+/gi, " ")
        .split(/[^a-zа-яёәғқңөұүһі0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && token !== "ai" && token !== "photo"),
    ),
  ).slice(0, 16);
}

function retailProductSearchText(product: RetailRow) {
  return [product.name, product.category, product.address, product.photo_keywords, product.notes, product.photo_url]
    .join(" ")
    .toLowerCase();
}

function matchesRetailProductFilters(
  product: RetailRow,
  {
    query,
    categoryQuery,
    addressQuery,
    photoQuery,
  }: {
    query: string;
    categoryQuery: string;
    addressQuery: string;
    photoQuery: string;
  },
) {
  const text = retailProductSearchText(product);
  const categoryText = String(product.category ?? "").toLowerCase();
  const addressText = String(product.address ?? "").toLowerCase();

  if (query && !text.includes(query)) return false;
  if (categoryQuery && !categoryText.includes(categoryQuery)) return false;
  if (addressQuery && !addressText.includes(addressQuery)) return false;
  if (!photoQuery) return true;
  if (photoQuery.startsWith("ai-photo")) return true;

  const tokens = retailSearchTokens(photoQuery);
  if (!tokens.length) return true;
  return tokens.some((token) => text.includes(token));
}

function retailPhotoSimilarityScore(product: RetailRow, photoQuery: string) {
  const tokens = retailSearchTokens(photoQuery);
  if (!tokens.length) return 0;

  const name = String(product.name ?? "").toLowerCase();
  const category = String(product.category ?? "").toLowerCase();
  const address = String(product.address ?? "").toLowerCase();
  const photoKeywords = String(product.photo_keywords ?? "").toLowerCase();
  const notes = String(product.notes ?? "").toLowerCase();
  const photoUrl = String(product.photo_url ?? "").toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (photoKeywords.includes(token)) score += 24;
    if (name.includes(token)) score += 18;
    if (category.includes(token)) score += 14;
    if (address.includes(token)) score += 8;
    if (notes.includes(token)) score += 8;
    if (photoUrl.includes(token)) score += 6;
  }

  return Math.min(99, Math.round((score / Math.max(1, tokens.length * 18)) * 100));
}

function rankRetailProducts(products: RetailRow[], photoQuery: string) {
  if (!photoQuery) return products;
  return [...products].sort((a, b) => retailPhotoSimilarityScore(b, photoQuery) - retailPhotoSimilarityScore(a, photoQuery));
}

function buildSimilarPhotoProducts(
  products: RetailRow[],
  photoQuery: string,
  saleSummaryByProduct: Map<string, { sold: number; revenue: number; profit: number }>,
) {
  return products
    .map((product) => {
      const score = retailPhotoSimilarityScore(product, photoQuery);
      const summary = saleSummaryByProduct.get(String(product.id)) ?? { sold: 0, revenue: 0, profit: 0 };
      return {
        product,
        score,
        remaining: Number(product.initial_quantity ?? 0) - summary.sold,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.product.name ?? "").localeCompare(String(b.product.name ?? "")));
}

function buildSaleSummaryByProduct(sales: RetailRow[]) {
  const map = new Map<string, { sold: number; revenue: number; profit: number }>();

  for (const sale of sales) {
    const productId = String(sale.product_id ?? "");
    if (!productId) continue;
    const current = map.get(productId) ?? { sold: 0, revenue: 0, profit: 0 };
    current.sold += Number(sale.quantity ?? 0);
    current.revenue += Number(sale.total_amount ?? 0);
    current.profit += Number(sale.profit_amount ?? 0);
    map.set(productId, current);
  }

  return map;
}

function summarizeProduct(product: RetailRow, saleSummaryByProduct: Map<string, { sold: number; revenue: number; profit: number }>) {
  const summary = saleSummaryByProduct.get(String(product.id)) ?? { sold: 0, revenue: 0, profit: 0 };
  const sold = summary.sold;
  const profit = summary.profit;
  const remaining = Number(product.initial_quantity ?? 0) - sold;
  return { product, sold, remaining, profit };
}

function retailSaleColumns(section: RetailSection) {
  if (section === "products") return "id,company_id,product_id,quantity,profit_amount";
  return "id,company_id,product_id,sale_date,quantity,payment_method,total_amount,profit_amount,customer_name,notes";
}

function retailProductLimit(section: RetailSection) {
  if (section === "products") return 120;
  if (section === "overview") return 120;
  if (section === "calendar") return 150;
  if (section === "reports") return 300;
  if (section === "assistant") return 220;
  return 300;
}

function cleanRetailSearchTerm(value: string) {
  return value.trim().replace(/[%*,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

function fetchRetailProducts({
  supabase,
  companyId,
  section,
  productColumns,
  limit,
  offset,
  query,
  categoryQuery,
  addressQuery,
  photoQuery,
}: {
  supabase: Awaited<ReturnType<typeof requireMembership>>["supabase"];
  companyId: string;
  section: RetailSection;
  productColumns: string;
  limit: number;
  offset: number;
  query: string;
  categoryQuery: string;
  addressQuery: string;
  photoQuery: string;
}) {
  let request = supabase.from("retail_products").select(productColumns).eq("company_id", companyId);

  if (section !== "trash") {
    request = request.neq("status", "archived");
  } else {
    request = request.eq("status", "archived");
  }

  const search = cleanRetailSearchTerm(query);
  const category = cleanRetailSearchTerm(categoryQuery);
  const address = cleanRetailSearchTerm(addressQuery);
  const photo = cleanRetailSearchTerm(photoQuery);

  if (search) {
    request = request.or(`name.ilike.%${search}%,category.ilike.%${search}%,address.ilike.%${search}%,photo_keywords.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  if (category) request = request.ilike("category", `%${category}%`);
  if (address) request = request.ilike("address", `%${address}%`);
  if (photo && !photo.startsWith("ai-photo")) {
    request = request.or(`photo_url.ilike.%${photo}%,photo_keywords.ilike.%${photo}%`);
  }

  return request.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
}

function fetchRetailSales({
  supabase,
  companyId,
  selectedDate,
  section,
  shouldFetchSales,
  calendarOnly,
  saleColumns,
  productIds,
}: {
  supabase: Awaited<ReturnType<typeof requireMembership>>["supabase"];
  companyId: string;
  selectedDate: string;
  section: RetailSection;
  shouldFetchSales: boolean;
  calendarOnly: boolean;
  saleColumns: string;
  productIds?: string[];
}) {
  if (!shouldFetchSales) return Promise.resolve({ data: [], error: null });
  if (section === "products" && !productIds?.length) return Promise.resolve({ data: [], error: null });

  let query = supabase.from("retail_product_sales").select(saleColumns).eq("company_id", companyId);

  if (section === "products" && productIds?.length) {
    query = query.in("product_id", productIds);
  }

  if (calendarOnly) {
    return query.eq("sale_date", selectedDate).order("sale_date", { ascending: false }).limit(300);
  }

  if (section === "reports") {
    return query.gte("sale_date", dateMinus(selectedDate, 29)).lte("sale_date", selectedDate).order("sale_date", { ascending: false }).limit(700);
  }

  if (section === "assistant") {
    return query.gte("sale_date", dateMinus(selectedDate, 29)).lte("sale_date", selectedDate).order("sale_date", { ascending: false }).limit(500);
  }

  return query.order("created_at", { ascending: false }).limit(section === "products" ? 400 : 700);
}

function retailProductColumns(section: RetailSection) {
  const minimal = "id,company_id,created_at,initial_quantity,status";
  const namesOnly = "id,company_id,created_at,name,status";
  const trash = "id,company_id,created_at,name,category,address,photo_url,status";
  const calendar = "id,company_id,created_at,name,status";
  const full = "id,company_id,created_at,name,category,address,photo_url,photo_keywords,notes,purchase_price,sale_price,initial_quantity,status";

  if (section === "overview") return minimal;
  if (section === "debts") return namesOnly;
  if (section === "trash") return trash;
  if (section === "calendar") return calendar;
  return full;
}

function emptySalesReport() {
  return { quantity: 0, revenue: 0, profit: 0 };
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

function isDebtReminderDue(debt: RetailRow) {
  if (debt.status === "paid") return false;
  const lastReminder = debt.last_reminded_at ? new Date(String(debt.last_reminded_at)).getTime() : 0;
  if (!lastReminder || Number.isNaN(lastReminder)) return true;
  return Date.now() - lastReminder >= 12 * 60 * 60 * 1000;
}

function normalizeWhatsappPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) return `7${digits.slice(1)}`;
  return digits;
}

function buildDebtWhatsappHref(debt: RetailRow) {
  const phone = normalizeWhatsappPhone(String(debt.phone ?? ""));
  const message = [
    `Сәлеметсіз бе, ${String(debt.customer_name ?? "клиент")}!`,
    `Сізде ${Number(debt.amount ?? 0).toLocaleString()} ₸ қарыз бар.`,
    `Төлем күні: ${String(debt.due_date ?? "-")}.`,
    "Мүмкін болса, бүгін төлем жасап жіберіңіз. Рақмет!",
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function groupRetailByAddress(products: RetailRow[], saleSummaryByProduct: Map<string, { sold: number; revenue: number; profit: number }>) {
  const map = new Map<
    string,
    {
      address: string;
      products: number;
      quantity: number;
      revenue: number;
      profit: number;
      remaining: number;
    }
  >();

  for (const product of products) {
    const address = String(product.address || "Адрес не указан");
    const salesSummary = saleSummaryByProduct.get(String(product.id)) ?? { sold: 0, revenue: 0, profit: 0 };
    const current = map.get(address) ?? { address, products: 0, quantity: 0, revenue: 0, profit: 0, remaining: 0 };

    current.products += 1;
    current.quantity += salesSummary.sold;
    current.revenue += salesSummary.revenue;
    current.profit += salesSummary.profit;
    current.remaining += Number(product.initial_quantity ?? 0) - salesSummary.sold;
    map.set(address, current);
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue || a.address.localeCompare(b.address));
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

function retailSectionPath(section: RetailSection) {
  if (section === "overview") return "/dashboard/retail";
  return `/dashboard/retail/${section}`;
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
