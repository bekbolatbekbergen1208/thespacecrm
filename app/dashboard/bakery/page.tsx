import { markBakeryProductSold, markBakeryShopDebtPaid, saveBakeryExpense, saveBakeryProduct, saveBakerySale, saveBakeryShop, saveBakeryStock, saveBakerySupplier } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { BakerySaleForm } from "@/components/app/bakery-sale-form";
import { Field, Select, SmallButton, Textarea } from "@/components/app/forms";
import { canManage, requireUser } from "@/lib/auth";
import { AlertTriangle, Bot, CalendarDays, CheckCircle2, CircleDollarSign, Download, Image as ImageIcon, Lightbulb, MessageCircle, PackagePlus, RotateCcw, Search, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";

type BakeryRow = {
  id: string;
  company_id: string;
  created_at: string;
  [key: string]: string | number | null;
};

export type BakerySection =
  | "overview"
  | "assistant"
  | "reports"
  | "products"
  | "money"
  | "expenses"
  | "production"
  | "stock"
  | "suppliers"
  | "debts"
  | "shops";

const prices = {
  keks: 450,
  korzhik: 500,
  plyannik: 550,
};

const expenseCategories = [
  ["salary", "ЗП"],
  ["flour", "Мука"],
  ["eggs", "Яйцо"],
  ["sugar", "Сахар"],
  ["kefir", "Кефир"],
  ["other", "Прочие расходы"],
] as const;

export default async function BakeryDashboardPage(props: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string }>;
}) {
  return <BakeryDashboardContent {...props} section="overview" />;
}

export async function BakeryDashboardContent({
  searchParams,
  section = "overview",
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string }>;
  section?: BakerySection;
}) {
  const [{ supabase, membership }, params] = await Promise.all([requireUser(), searchParams]);
  const companyId = membership!.company_id;
  const editable = canManage(membership!.role);
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = params.date || today;
  const query = (params.q ?? "").toLowerCase();
  const aiQuestion = (params.aiq ?? "").trim();

  const [{ data: shops }, { data: stock }, { data: sales }, { data: suppliers }, { data: expenses }, { data: products }, { data: productSales }] = await Promise.all([
    supabase.from("bakery_shops").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("bakery_stock").select("*").eq("company_id", companyId).order("stock_date", { ascending: false }).limit(500),
    supabase.from("bakery_sales").select("*").eq("company_id", companyId).order("sale_date", { ascending: false }).limit(1000),
    supabase.from("bakery_suppliers").select("*").eq("company_id", companyId).order("last_supply_date", { ascending: false }).limit(200),
    supabase.from("bakery_expenses").select("*").eq("company_id", companyId).order("expense_date", { ascending: false }).limit(1000),
    supabase.from("bakery_products").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(500),
    supabase.from("bakery_product_sales").select("*").eq("company_id", companyId).order("sale_date", { ascending: false }).limit(1000),
  ]);

  const shopRows = ((shops ?? []) as BakeryRow[]).filter((shop) => {
    const text = [shop.name, shop.address, shop.phone, shop.driver_name, shop.notes].join(" ").toLowerCase();
    return !query || text.includes(query);
  });
  const allShopRows = (shops ?? []) as BakeryRow[];
  const stockRows = (stock ?? []) as BakeryRow[];
  const saleRows = (sales ?? []) as BakeryRow[];
  const supplierRows = ((suppliers ?? []) as BakeryRow[]).filter((supplier) => {
    const text = [supplier.name, supplier.contact_name, supplier.phone, supplier.product_type, supplier.notes].join(" ").toLowerCase();
    return !query || text.includes(query);
  });
  const expenseRows = (expenses ?? []) as BakeryRow[];
  const productSaleRows = (productSales ?? []) as BakeryRow[];
  const productRows = ((products ?? []) as BakeryRow[]).filter((product) => {
    const text = [product.name, product.category, product.photo_keywords, product.notes, product.photo_url].join(" ").toLowerCase();
    return !query || text.includes(query);
  });
  const productSummaries = productRows.map((product) => summarizeProduct(product, productSaleRows));
  const dayProductSales = productSaleRows.filter((sale) => sale.sale_date === selectedDate);
  const productReport = sumProductSales(dayProductSales);
  const supplierDebt = supplierRows.reduce((sum, supplier) => sum + Number(supplier.debt_amount ?? 0), 0);
  const stockTotals = sumStock(stockRows);
  const saleTotals = sumSales(saleRows);
  const dayStock = sumStock(stockRows.filter((stockItem) => stockItem.stock_date === selectedDate));
  const daySales = saleRows.filter((sale) => sale.sale_date === selectedDate);
  const dayTotals = sumSales(daySales);
  const dayExpenses = expenseRows.filter((expense) => expense.expense_date === selectedDate);
  const expenseTotals = sumExpenses(dayExpenses);
  const totalExpenseAmount = Object.values(expenseTotals).reduce((sum, value) => sum + value, 0);
  const dayProfit = dayTotals.cash + dayTotals.kaspi + productReport.revenue - totalExpenseAmount;
  const moneyCsvHref = buildMoneyCsvHref({
    selectedDate,
    dayTotals,
    expenseTotals,
    totalExpenseAmount,
    dayProfit,
    totalShopDebt: 0,
  });
  const debtRows = allShopRows
    .map((shop) => ({ shop, total: sumSales(saleRows.filter((sale) => sale.shop_id === shop.id)) }))
    .filter((item) => item.total.debt > 0);
  const totalShopDebt = debtRows.reduce((sum, item) => sum + item.total.debt, 0);
  const moneyCsvWithDebtHref = buildMoneyCsvHref({
    selectedDate,
    dayTotals,
    expenseTotals,
    totalExpenseAmount,
    dayProfit,
    totalShopDebt,
  });
  const remaining = {
    keks: stockTotals.keks - saleTotals.keksNet,
    korzhik: stockTotals.korzhik - saleTotals.korzhikNet,
    plyannik: stockTotals.plyannik - saleTotals.plyannikNet,
  };
  const assistantInsights = buildBakeryAssistantInsights({
    selectedDate,
    shopCount: allShopRows.length,
    dayStock,
    dayTotals,
    totalShopDebt,
    debtRowsCount: debtRows.length,
    remaining,
    supplierDebt,
  });
  const assistantAnswer = aiQuestion
    ? answerBakeryQuestion({
      question: aiQuestion,
      selectedDate,
      dayTotals,
      expenseTotals,
      totalExpenseAmount,
      dayProfit,
      totalShopDebt,
      supplierDebt,
      remaining,
      dayStock,
      debtRows,
      supplierRows,
    })
    : "";

  return (
    <>
      <PageHeader
        title="Пекарня"
        description="Магазины, продажи, возвраты, Kaspi/наличные, долги и остатки по кексу, коржику и плянику."
      />
      {params.error && <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{params.error}</p>}
      {params.saved === "stock" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Продукция за день сохранена.</p>}
      {params.saved === "supplier" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Поставщик сохранён.</p>}
      {params.saved === "debt" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Долг закрыт.</p>}
      {params.saved === "expense" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Расход сохранён.</p>}
      {params.saved === "product" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Товар сохранён.</p>}
      {params.saved === "product-sale" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Продажа товара сохранена.</p>}

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric title="Товары" value={productRows.length} note={query ? "найдено" : "каталог"} icon={<ShoppingCart className="h-4 w-4" />} />
        <Metric title="Продукция за день" value={dayStock.keks + dayStock.korzhik + dayStock.plyannik} note={selectedDate} icon={<PackagePlus className="h-4 w-4" />} />
        <Metric title="Сумма за день" value={`${(dayTotals.expected + productReport.revenue).toLocaleString()} ₸`} note={`Товары ${productReport.revenue.toLocaleString()} ₸`} icon={<CircleDollarSign className="h-4 w-4" />} />
        <Metric title="Общий долг" value={`${totalShopDebt.toLocaleString()} ₸`} note="пока не оплачено" icon={<Truck className="h-4 w-4" />} danger={totalShopDebt > 0} />
        <Metric title="Прибыль" value={`${dayProfit.toLocaleString()} ₸`} note="оплачено минус расходы" icon={<CircleDollarSign className="h-4 w-4" />} danger={dayProfit < 0} />
        <Metric title="Возвраты" value={dayTotals.returns} note="шт за день" icon={<RotateCcw className="h-4 w-4" />} />
      </div>

      <QuickBakeryNav active={section} />

      <Card id="assistant" className={`${sectionClass(section, "overview", "assistant")} mb-5 scroll-mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              <Bot className="h-3.5 w-3.5" />
              AI ассистент
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">Помощник пекарни на {selectedDate}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Анализирует производство, продажи, долги, возвраты, остатки и поставщиков. Сейчас работает без внешнего API, поэтому подсказки появляются сразу по вашим данным.
            </p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${assistantInsights.urgentCount ? "bg-red-500 text-white" : "bg-emerald-300 text-emerald-950"}`}>
            {assistantInsights.urgentCount ? `${assistantInsights.urgentCount} срочно` : "Всё спокойно"}
          </span>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3">
            {assistantInsights.items.map((item) => (
              <AssistantInsight key={item.title} title={item.title} detail={item.detail} tone={item.tone} />
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                <Lightbulb className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Рекомендация</p>
                <h3 className="font-black text-white">План на следующий выпуск</h3>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <MiniPill label="Кекс" value={`${assistantInsights.nextProduction.keks} шт`} />
              <MiniPill label="Коржик" value={`${assistantInsights.nextProduction.korzhik} шт`} />
              <MiniPill label="Пляник" value={`${assistantInsights.nextProduction.plyannik} шт`} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Ассистент считает план от продаж за выбранный день и текущего остатка. Если продаж мало, он предлагает минимальный запас.
            </p>
          </div>
        </div>
        <form action="/dashboard/bakery/assistant#assistant" className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <input type="hidden" name="date" value={selectedDate} />
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Спросить у AI ассистента</span>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                name="aiq"
                defaultValue={aiQuestion}
                placeholder="Например: у кого долг, какая прибыль, какие расходы, сколько осталось?"
                className="premium-input h-12 w-full px-4 text-sm text-white outline-none"
              />
              <button className="premium-button h-12 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
                <Bot className="h-4 w-4" />
                Спросить
              </button>
            </div>
          </label>
          {assistantAnswer && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ответ</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-100">{assistantAnswer}</p>
            </div>
          )}
        </form>
      </Card>

      <Card id="reports" className={`${sectionClass(section, "overview", "reports", "products", "money", "expenses", "production", "stock", "suppliers", "debts", "shops")} mb-5`}>
        <form className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label>
            <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <Search className="h-3.5 w-3.5" /> Поиск продукта или магазина
            </span>
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Название, категория, фото-слова, магазин, поставщик"
              className="premium-input h-12 w-full px-4 text-sm text-white outline-none"
            />
          </label>
          <label>
            <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" /> День отчёта
            </span>
            <input
              name="date"
              type="date"
              defaultValue={selectedDate}
              className="premium-input h-12 w-full px-4 text-sm text-white outline-none"
            />
          </label>
          <button className="premium-button h-12 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
            <Search className="h-4 w-4" />
            Найти
          </button>
        </form>
      </Card>

      <Card id="products" className={`${sectionClass(section, "products")} mb-5 scroll-mt-6 overflow-hidden`}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Продажи продуктов</p>
            <h2 className="mt-1 text-xl font-black text-white">Каталог товаров, остатки, продажа и отчёты</h2>
            <p className="mt-1 text-sm text-slate-400">Добавьте товар с фото, закупочной ценой, продажной ценой и количеством. Потом отмечайте проданные товары.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-xs font-black text-slate-200">
              За {selectedDate}: {productReport.quantity} шт
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
              Прибыль {productReport.profit.toLocaleString()} ₸
            </span>
          </div>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <MoneyBox label="Товарная выручка" value={productReport.revenue} note="по выбранному дню" />
          <MoneyBox label="Товарная прибыль" value={productReport.profit} note="продажа - закуп" />
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Продано</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-white">{productReport.quantity} шт</p>
            <p className="mt-1 text-xs text-slate-500">за день</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Остаток</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-white">{productSummaries.reduce((sum, item) => sum + item.remaining, 0)} шт</p>
            <p className="mt-1 text-xs text-slate-500">по найденным товарам</p>
          </div>
        </div>

        {editable && (
          <form action={saveBakeryProduct} className="mb-5 rounded-3xl border border-cyan-300/15 bg-slate-950/35 p-4">
            <h3 className="text-lg font-black text-white">Добавить продукт</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Field label="Название продукта" name="name" />
              <Field label="Категория" name="category" required={false} />
              <Field label="Фото URL" name="photoUrl" required={false} />
              <Field label="Слова для поиска по фото" name="photoKeywords" required={false} />
              <Field label="Закупочная цена" name="purchasePrice" type="number" defaultValue={0} />
              <Field label="Цена продажи" name="salePrice" type="number" defaultValue={0} />
              <Field label="Количество" name="initialQuantity" type="number" defaultValue={0} />
              <Select label="Статус" name="status" defaultValue="active">
                <option value="active">Активный</option>
                <option value="hidden">Скрыт</option>
              </Select>
              <div className="md:col-span-4"><Textarea label="Комментарий" name="notes" /></div>
              <div className="md:col-span-4"><SmallButton>Сохранить продукт</SmallButton></div>
            </div>
          </form>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          {!productSummaries.length && (
            <div className="xl:col-span-3">
              <EmptyState text={query ? "По этому поиску товары не найдены." : "Добавьте первый продукт, чтобы вести продажи по товарам."} />
            </div>
          )}
          {productSummaries.map((item) => (
            <div key={item.product.id} className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex gap-4">
                <ProductPhoto url={String(item.product.photo_url ?? "")} name={String(item.product.name ?? "Товар")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-black text-white">{String(item.product.name ?? "Товар")}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{String(item.product.category ?? "Без категории")}</p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <MiniPill label="Купили" value={`${Number(item.product.purchase_price ?? 0).toLocaleString()} ₸`} />
                    <MiniPill label="Продажа" value={`${Number(item.product.sale_price ?? 0).toLocaleString()} ₸`} />
                    <MiniPill label="Продано" value={`${item.sold} шт`} />
                    <MiniPill label="Осталось" value={`${item.remaining} шт`} danger={item.remaining <= 2} />
                  </div>
                </div>
              </div>

              <form action={markBakeryProductSold} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <input type="hidden" name="productId" value={item.product.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Дата" name="saleDate" type="date" defaultValue={selectedDate} />
                  <Field label="Сколько продали" name="quantity" type="number" defaultValue={1} />
                  <Select label="Оплата" name="paymentMethod" defaultValue="cash">
                    <option value="cash">Нал</option>
                    <option value="kaspi">Kaspi</option>
                    <option value="card">Карта</option>
                    <option value="transfer">Перевод</option>
                  </Select>
                  <Field label="Покупатель" name="customerName" required={false} />
                  <div className="sm:col-span-2"><SmallButton>Назначить проданным</SmallButton></div>
                </div>
              </form>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-950/90 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Товар</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Купили</th>
                <th className="px-4 py-3">Продажа</th>
                <th className="px-4 py-3">Начало</th>
                <th className="px-4 py-3">Продано</th>
                <th className="px-4 py-3">Осталось</th>
                <th className="px-4 py-3">Прибыль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {!productSummaries.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-400" colSpan={8}>Товаров пока нет.</td>
                </tr>
              )}
              {productSummaries.map((item) => (
                <tr key={item.product.id} className="bg-slate-950/20 transition hover:bg-white/[0.04]">
                  <td className="px-4 py-4 font-black text-white">{String(item.product.name ?? "Товар")}</td>
                  <td className="px-4 py-4 text-slate-300">{String(item.product.category ?? "-")}</td>
                  <td className="px-4 py-4 text-slate-300">{Number(item.product.purchase_price ?? 0).toLocaleString()} ₸</td>
                  <td className="px-4 py-4 text-cyan-100">{Number(item.product.sale_price ?? 0).toLocaleString()} ₸</td>
                  <td className="px-4 py-4 text-slate-300">{Number(item.product.initial_quantity ?? 0)}</td>
                  <td className="px-4 py-4 font-black text-white">{item.sold}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${item.remaining <= 2 ? "bg-red-500 text-white" : "bg-emerald-300 text-emerald-950"}`}>
                      {item.remaining}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-black text-emerald-100">{item.profit.toLocaleString()} ₸</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="money-report" className={`${sectionClass(section, "overview", "reports", "money")} mb-5 scroll-mt-6`}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Денежный отчёт</p>
            <h2 className="mt-1 text-xl font-black text-white">Деньги за {selectedDate}</h2>
            <p className="mt-1 text-sm text-slate-400">Выручка, нал, Kaspi, расходы, прибыль и CSV-отчёт.</p>
          </div>
          <a
            href={moneyCsvWithDebtHref || moneyCsvHref}
            download={`bakery-money-report-${selectedDate}.csv`}
            className="premium-button w-fit bg-white px-4 py-2 text-xs text-slate-950 shadow-glow hover:bg-cyan-50"
          >
            <Download className="h-4 w-4" />
            Скачать CSV
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MoneyBox label="Выручка" value={dayTotals.expected} note="по продуктам" />
          <MoneyBox label="Нал" value={dayTotals.cash} note="получено" />
          <MoneyBox label="Kaspi" value={dayTotals.kaspi} note="получено" />
          <MoneyBox label="Расходы" value={totalExpenseAmount} note="за день" danger={totalExpenseAmount > dayTotals.cash + dayTotals.kaspi} />
          <MoneyBox label="Прибыль" value={dayProfit} note="нал + Kaspi - расходы" danger={dayProfit < 0} />
          <MoneyBox label="Долг" value={totalShopDebt} note="открытый общий" danger={totalShopDebt > 0} />
        </div>
      </Card>

      <Card id="expenses" className={`${sectionClass(section, "expenses")} mb-5 scroll-mt-6`}>
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">Расходы</p>
            <h2 className="mt-1 text-xl font-black text-white">ЗП, мука, яйцо, сахар, кефир и прочие расходы</h2>
          </div>
          <span className="w-fit rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
            Всего {totalExpenseAmount.toLocaleString()} ₸
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {expenseCategories.map(([key, label]) => (
            <MoneyBox key={key} label={label} value={expenseTotals[key]} note="расход" danger={key === "salary" ? false : expenseTotals[key] > 0} />
          ))}
        </div>

        {editable && (
          <form action={saveBakeryExpense} className="mt-5 rounded-3xl border border-white/10 bg-slate-950/35 p-4">
            <h3 className="text-lg font-black text-white">Добавить расход</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Field label="Дата" name="expenseDate" type="date" defaultValue={selectedDate} />
              <Select label="Категория" name="category" defaultValue="flour">
                {expenseCategories.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
              <Field label="Сумма" name="amount" type="number" defaultValue={0} />
              <div className="md:col-span-1"><SmallButton>Добавить расход</SmallButton></div>
              <div className="md:col-span-4"><Textarea label="Комментарий" name="notes" /></div>
            </div>
          </form>
        )}

        <div className="mt-5 max-h-72 overflow-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-950/90 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Комментарий</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {!dayExpenses.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>За этот день расходов нет.</td>
                </tr>
              )}
              {dayExpenses.map((expense) => (
                <tr key={expense.id} className="bg-slate-950/20 transition hover:bg-white/[0.04]">
                  <td className="px-4 py-3 text-slate-300">{String(expense.expense_date ?? "")}</td>
                  <td className="px-4 py-3 font-black text-white">{expenseCategoryLabel(String(expense.category ?? ""))}</td>
                  <td className="px-4 py-3 font-black text-amber-100">{Number(expense.amount ?? 0).toLocaleString()} ₸</td>
                  <td className="px-4 py-3 text-slate-400">{String(expense.notes ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="production" className={`${sectionClass(section, "production")} mb-5 scroll-mt-6`}>
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Продукция за день</p>
            <h2 className="mt-1 text-xl font-black text-white">Выпуск на {selectedDate}</h2>
          </div>
          <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
            Всего {dayStock.keks + dayStock.korzhik + dayStock.plyannik} шт
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <DailyProduction title="Кекс" price={prices.keks} produced={dayStock.keks} />
          <DailyProduction title="Коржик" price={prices.korzhik} produced={dayStock.korzhik} />
          <DailyProduction title="Пляник" price={prices.plyannik} produced={dayStock.plyannik} />
        </div>
        {editable && (
          <form action={saveBakeryStock} className="mt-5 rounded-3xl border border-cyan-300/15 bg-slate-950/35 p-4">
            <div className="mb-4">
              <h3 className="text-lg font-black text-white">Записать произведённое количество</h3>
              <p className="mt-1 text-sm text-slate-400">Напишите, сколько продуктов произвели за выбранный день. Эту часть может менять только Founder/Admin/Manager.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Дата" name="stockDate" type="date" defaultValue={selectedDate} />
              <Field label="Кекс" name="keksQty" type="number" defaultValue={0} />
              <Field label="Коржик" name="korzhikQty" type="number" defaultValue={0} />
              <Field label="Пляник" name="plyannikQty" type="number" defaultValue={0} />
              <div className="md:col-span-4"><Textarea label="Комментарий" name="notes" /></div>
              <div className="md:col-span-4"><SmallButton>Сохранить производство</SmallButton></div>
            </div>
          </form>
        )}
      </Card>

      <Card id="stock" className={`${sectionClass(section, "stock")} mb-5 scroll-mt-6`}>
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Общий склад</p>
          <h2 className="mt-1 text-xl font-black text-white">Все продукты и остатки</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ProductTotal title="Кекс" price={prices.keks} produced={stockTotals.keks} sold={saleTotals.keksNet} returned={saleTotals.keksReturn} remaining={remaining.keks} />
          <ProductTotal title="Коржик" price={prices.korzhik} produced={stockTotals.korzhik} sold={saleTotals.korzhikNet} returned={saleTotals.korzhikReturn} remaining={remaining.korzhik} />
          <ProductTotal title="Пляник" price={prices.plyannik} produced={stockTotals.plyannik} sold={saleTotals.plyannikNet} returned={saleTotals.plyannikReturn} remaining={remaining.plyannik} />
        </div>
      </Card>

      <Card id="suppliers" className={`${sectionClass(section, "suppliers")} mb-5 scroll-mt-6 overflow-hidden`}>
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Поставщики</p>
            <h2 className="mt-1 text-xl font-black text-white">Поставщики продуктов</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-xs font-black text-slate-200">
              {supplierRows.length} поставщиков
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${supplierDebt > 0 ? "bg-red-500 text-white" : "bg-emerald-300 text-emerald-950"}`}>
              Долг {supplierDebt.toLocaleString()} ₸
            </span>
          </div>
        </div>

        {editable && (
          <form action={saveBakerySupplier} className="mb-5 rounded-3xl border border-white/10 bg-slate-950/35 p-4">
            <h3 className="text-lg font-black text-white">Добавить поставщика</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Название поставщика" name="name" />
              <Field label="Контактное лицо" name="contactName" required={false} />
              <Field label="Телефон" name="phone" required={false} />
              <Field label="Что поставляет" name="productType" />
              <Field label="Дата поставки" name="lastSupplyDate" type="date" defaultValue={selectedDate} />
              <Field label="Сумма" name="amount" type="number" defaultValue={0} />
              <Field label="Долг" name="debtAmount" type="number" defaultValue={0} />
              <div className="md:col-span-2"><Textarea label="Комментарий" name="notes" /></div>
              <div className="md:col-span-3"><SmallButton>Сохранить поставщика</SmallButton></div>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-950/90 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Поставщик</th>
                <th className="px-4 py-3">Продукт</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Долг</th>
                <th className="px-4 py-3">Связь</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {!supplierRows.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-400" colSpan={6}>
                    Поставщиков пока нет.
                  </td>
                </tr>
              )}
              {supplierRows.map((supplier) => {
                const supplierName = String(supplier.name ?? "Поставщик");
                const debt = Number(supplier.debt_amount ?? 0);
                const message = `Здравствуйте! По поставке "${String(supplier.product_type ?? "продукты")}" для пекарни остался долг ${debt.toLocaleString()} тг. Дата: ${String(supplier.last_supply_date ?? selectedDate)}.`;
                const href = whatsappHref(supplier.phone, message);
                return (
                  <tr key={supplier.id} className="bg-slate-950/20 transition hover:bg-white/[0.04]">
                    <td className="px-4 py-4">
                      <p className="font-black text-white">{supplierName}</p>
                      <p className="mt-1 text-xs text-slate-500">{String(supplier.contact_name ?? "Контакт не указан")}</p>
                    </td>
                    <td className="px-4 py-4 font-black text-slate-200">{String(supplier.product_type ?? "-")}</td>
                    <td className="px-4 py-4 text-slate-300">{String(supplier.last_supply_date ?? "-")}</td>
                    <td className="px-4 py-4 font-black text-cyan-100">{Number(supplier.amount ?? 0).toLocaleString()} ₸</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${debt > 0 ? "bg-red-500 text-white" : "bg-emerald-300 text-emerald-950"}`}>
                        {debt.toLocaleString()} ₸
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/15">
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">Номер жоқ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="debts" className={`${sectionClass(section, "debts")} mb-5 scroll-mt-6`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-100">Долги</p>
            <h2 className="mt-1 text-xl font-black text-white">Магазины с долгом</h2>
            <p className="mt-1 text-sm text-slate-400">Календарь не влияет: долг показывается всегда, пока его не закрыли.</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-sm font-black ${debtRows.length ? "bg-red-500 text-white" : "bg-emerald-300 text-emerald-950"}`}>
            {debtRows.length ? `${debtRows.length} долг` : "Долгов нет"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!debtRows.length && <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-semibold text-emerald-100 md:col-span-2 xl:col-span-3">Открытых долгов нет.</p>}
          {debtRows.map(({ shop, total }) => {
            const shopName = String(shop.name ?? "Магазин");
            const message = `Здравствуйте! По магазину "${shopName}" открытый долг ${total.debt.toLocaleString()} тг. Просим оплатить долг. Общая сумма продаж: ${total.expected.toLocaleString()} тг, оплачено: ${(total.cash + total.kaspi).toLocaleString()} тг.`;
            const href = whatsappHref(shop.phone, message);
            return (
              <div
                key={shop.id}
                className="rounded-2xl border border-red-300/20 bg-red-500/10 p-4 transition hover:bg-red-500/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{shopName}</p>
                    <p className="mt-1 text-xs text-red-100/75">{String(shop.phone ?? "Номер не указан")}</p>
                  </div>
                  <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">{total.debt.toLocaleString()} ₸</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-red-300/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-100 transition hover:bg-red-500/15">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-xs font-black text-slate-400">Добавьте номер</span>
                  )}
                  <form action={markBakeryShopDebtPaid}>
                    <input type="hidden" name="shopId" value={shop.id} />
                    <button className="rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-black text-emerald-950 transition hover:bg-emerald-200">
                      Оплачено
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card id="shops" className={`${sectionClass(section, "shops")} mb-5 scroll-mt-6 overflow-hidden`}>
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Таблица</p>
            <h2 className="mt-1 text-xl font-black text-white">Работа с магазинами за {selectedDate}</h2>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-xs font-black text-slate-200">
            {shopRows.length} магазинов
          </span>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-950/90 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Магазин</th>
                <th className="px-4 py-3">Кекс</th>
                <th className="px-4 py-3">Коржик</th>
                <th className="px-4 py-3">Пляник</th>
                <th className="px-4 py-3">Возврат</th>
                <th className="px-4 py-3">Нал</th>
                <th className="px-4 py-3">Kaspi</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Долг</th>
                <th className="px-4 py-3">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {!shopRows.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-400" colSpan={10}>
                    Магазины не найдены.
                  </td>
                </tr>
              )}
              {shopRows.map((shop) => {
                const shopName = String(shop.name ?? "Магазин");
                const shopDaySales = daySales.filter((sale) => sale.shop_id === shop.id);
                const total = sumSales(shopDaySales);
                const debtMessage = `Здравствуйте! По магазину "${shopName}" за ${selectedDate} долг ${total.debt.toLocaleString()} тг. Просим оплатить долг.`;
                const debtHref = whatsappHref(shop.phone, debtMessage);

                return (
                  <tr key={shop.id} className="bg-slate-950/20 transition hover:bg-white/[0.04]">
                    <td className="px-4 py-4">
                      <p className="font-black text-white">{shopName}</p>
                      <p className="mt-1 text-xs text-slate-500">{String(shop.address ?? "Адрес не указан")}</p>
                    </td>
                    <td className="px-4 py-4 font-black text-slate-200">{total.keksNet}</td>
                    <td className="px-4 py-4 font-black text-slate-200">{total.korzhikNet}</td>
                    <td className="px-4 py-4 font-black text-slate-200">{total.plyannikNet}</td>
                    <td className="px-4 py-4 font-black text-amber-100">{total.returns}</td>
                    <td className="px-4 py-4 text-slate-200">{total.cash.toLocaleString()} ₸</td>
                    <td className="px-4 py-4 text-slate-200">{total.kaspi.toLocaleString()} ₸</td>
                    <td className="px-4 py-4 font-black text-cyan-100">{total.expected.toLocaleString()} ₸</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${total.debt > 0 ? "bg-red-500 text-white" : "bg-emerald-300 text-emerald-950"}`}>
                        {total.debt.toLocaleString()} ₸
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <a href={`#shop-${shop.id}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-cyan-50">
                          Открыть
                        </a>
                        {total.debt > 0 && debtHref && (
                          <a href={debtHref} target="_blank" rel="noreferrer" className="rounded-full border border-red-300/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-100 transition hover:bg-red-500/15">
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editable && (
        <div className={`${sectionClass(section, "shops")} mb-5 grid gap-5`}>
          <Card id="add-shop" className="scroll-mt-6">
            <h2 className="text-lg font-black text-white">Добавить магазин</h2>
            <form action={saveBakeryShop} className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Название магазина" name="name" />
              <Field label="Телефон" name="phone" required={false} />
              <Field label="Адрес" name="address" required={false} />
              <Field label="Водитель" name="driverName" required={false} />
              <div className="md:col-span-2"><Textarea label="Заметки" name="notes" /></div>
              <div className="md:col-span-2"><SmallButton>Добавить магазин</SmallButton></div>
            </form>
          </Card>
        </div>
      )}

      <div id="shop-work" className={`${sectionClass(section, "shops")} grid scroll-mt-6 gap-5`}>
        {!shopRows.length && <EmptyState text={query ? "По этому поиску магазины не найдены." : editable ? "Добавьте первый магазин, потом водитель сможет заносить продажи." : "Магазинов пока нет. Founder/Admin должен добавить магазины."} />}
        {shopRows.map((shop) => {
          const shopSales = saleRows.filter((sale) => sale.shop_id === shop.id);
          const shopDaySales = shopSales.filter((sale) => sale.sale_date === selectedDate);
          const total = sumSales(shopSales);
          const dayShopTotal = sumSales(shopDaySales);

          return (
            <details id={`shop-${shop.id}`} key={shop.id} className="group scroll-mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Магазин</p>
                    <h2 className="mt-2 text-2xl font-black text-white">{String(shop.name ?? "Магазин")}</h2>
                    <p className="mt-1 text-sm text-slate-400">{String(shop.address ?? "Адрес не указан")} • {String(shop.driver_name ?? "Водитель не указан")}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <MiniPill label="За день" value={`${dayShopTotal.expected.toLocaleString()} ₸`} />
                    <MiniPill label="Нал" value={`${dayShopTotal.cash.toLocaleString()} ₸`} />
                    <MiniPill label="Kaspi" value={`${dayShopTotal.kaspi.toLocaleString()} ₸`} />
                    <MiniPill label="Долг" value={`${dayShopTotal.debt.toLocaleString()} ₸`} danger={dayShopTotal.debt > 0} />
                  </div>
                </div>
              </summary>

              <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 xl:grid-cols-[1fr_0.8fr]">
                <Card>
                  <h3 className="mb-4 text-lg font-black text-white">Работа с магазином</h3>
                  <BakerySaleForm shopId={shop.id} defaultDate={selectedDate} action={saveBakerySale} />
                </Card>
                <Card>
                  <h3 className="text-lg font-black text-white">История магазина</h3>
                  <div className="mt-4 grid gap-3">
                    <MiniPill label="Всего сумма" value={`${total.expected.toLocaleString()} ₸`} />
                    <MiniPill label="Всего долг" value={`${total.debt.toLocaleString()} ₸`} danger={total.debt > 0} />
                    <MiniPill label="Всего возврат" value={`${total.returns} шт`} />
                  </div>
                  <div className="mt-5 max-h-72 space-y-2 overflow-auto pr-1">
                    {!shopSales.length && <p className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">Продаж пока нет.</p>}
                    {shopSales.slice(0, 12).map((sale) => (
                      <div key={sale.id} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-black text-white">{String(sale.sale_date ?? "")}</span>
                          <span className="font-black text-cyan-100">{Number(sale.expected_amount ?? 0).toLocaleString()} ₸</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          Нал {Number(sale.cash_amount ?? 0).toLocaleString()} • Kaspi {Number(sale.kaspi_amount ?? 0).toLocaleString()} • Долг {Number(sale.debt_amount ?? 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

function Metric({ title, value, note, icon, danger = false }: { title: string; value: string | number; note: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <Card>
      <span className={`grid h-10 w-10 place-items-center rounded-2xl border ${danger ? "border-red-300/30 bg-red-500/10 text-red-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>{icon}</span>
      <p className="mt-4 text-sm font-semibold text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </Card>
  );
}

const bakerySections: Array<{ key: BakerySection; label: string; href: string; note: string }> = [
  { key: "overview", label: "Обзор", href: "/dashboard/bakery", note: "главные показатели" },
  { key: "products", label: "Продажи продуктов", href: "/dashboard/bakery/products", note: "товары, фото, остатки" },
  { key: "money", label: "Денежный отчёт", href: "/dashboard/bakery/money", note: "касса и прибыль" },
  { key: "expenses", label: "Расходы", href: "/dashboard/bakery/expenses", note: "зп, мука, сахар" },
  { key: "production", label: "Производство", href: "/dashboard/bakery/production", note: "выпуск за день" },
  { key: "stock", label: "Склад", href: "/dashboard/bakery/stock", note: "остатки" },
  { key: "suppliers", label: "Поставщики", href: "/dashboard/bakery/suppliers", note: "поставки и долги" },
  { key: "debts", label: "Долги", href: "/dashboard/bakery/debts", note: "пока не оплачено" },
  { key: "shops", label: "Магазины", href: "/dashboard/bakery/shops", note: "работа с точками" },
  { key: "assistant", label: "AI ассистент", href: "/dashboard/bakery/assistant", note: "вопросы по данным" },
];

function QuickBakeryNav({ active }: { active: BakerySection }) {
  return (
    <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {bakerySections.map((item) => {
        const isActive = active === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-3xl border p-4 transition hover:-translate-y-0.5 ${
              isActive ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50 shadow-glow" : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
            }`}
          >
            <span className="text-sm font-black">{item.label}</span>
            <span className="mt-1 block text-xs text-slate-500">{item.note}</span>
          </Link>
        );
      })}
    </div>
  );
}

function sectionClass(current: BakerySection, ...visible: BakerySection[]) {
  return visible.includes(current) ? "" : "hidden";
}

function AssistantInsight({ title, detail, tone }: { title: string; detail: string; tone: "danger" | "warning" | "success" | "info" }) {
  const styles = {
    danger: "border-red-300/20 bg-red-500/10 text-red-100",
    warning: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    info: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  };
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Lightbulb : AlertTriangle;

  return (
    <div className={`rounded-3xl border p-4 ${styles[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/10">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-black text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 opacity-85">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MoneyBox({ label, value, note, danger = false }: { label: string; value: number; note: string; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 ${danger ? "border-red-300/20 bg-red-500/10" : "border-white/10 bg-slate-950/35"}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${danger ? "text-red-100" : "text-white"}`}>{value.toLocaleString()} ₸</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function ProductTotal({ title, price, produced, sold, returned, remaining }: { title: string; price: number; produced: number; sold: number; returned: number; remaining: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{price} ₸</p>
          <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${remaining < 0 ? "bg-red-500 text-white" : "bg-emerald-300 text-emerald-950"}`}>
          Остаток {remaining}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
        <span className="rounded-2xl bg-white/[0.04] px-3 py-2">Выпуск {produced}</span>
        <span className="rounded-2xl bg-white/[0.04] px-3 py-2">Чисто {sold}</span>
        <span className="rounded-2xl bg-white/[0.04] px-3 py-2">Возврат {returned}</span>
      </div>
    </div>
  );
}

function sumExpenses(rows: BakeryRow[]) {
  type ExpenseKey = typeof expenseCategories[number][0];
  const initial: Record<ExpenseKey, number> = { salary: 0, flour: 0, eggs: 0, sugar: 0, kefir: 0, other: 0 };
  const keys = new Set<ExpenseKey>(expenseCategories.map(([key]) => key));

  return rows.reduce((sum, row) => {
    const category = String(row.category ?? "other");
    const key = keys.has(category as ExpenseKey) ? category as ExpenseKey : "other";
    const amount = Number(row.amount ?? 0);
    return { ...sum, [key]: sum[key] + amount };
  }, initial);
}

function expenseCategoryLabel(category: string) {
  const found = expenseCategories.find(([key]) => key === category);
  return found?.[1] ?? "Прочие расходы";
}

function buildMoneyCsvHref({
  selectedDate,
  dayTotals,
  expenseTotals,
  totalExpenseAmount,
  dayProfit,
  totalShopDebt,
}: {
  selectedDate: string;
  dayTotals: ReturnType<typeof sumSales>;
  expenseTotals: ReturnType<typeof sumExpenses>;
  totalExpenseAmount: number;
  dayProfit: number;
  totalShopDebt: number;
}) {
  const rows = [
    ["Дата", selectedDate],
    ["Выручка", dayTotals.expected],
    ["Нал", dayTotals.cash],
    ["Kaspi", dayTotals.kaspi],
    ["Открытый долг", totalShopDebt],
    ["Расходы всего", totalExpenseAmount],
    ["Прибыль", dayProfit],
    ["ЗП", expenseTotals.salary],
    ["Мука", expenseTotals.flour],
    ["Яйцо", expenseTotals.eggs],
    ["Сахар", expenseTotals.sugar],
    ["Кефир", expenseTotals.kefir],
    ["Прочие расходы", expenseTotals.other],
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function answerBakeryQuestion({
  question,
  selectedDate,
  dayTotals,
  expenseTotals,
  totalExpenseAmount,
  dayProfit,
  totalShopDebt,
  supplierDebt,
  remaining,
  dayStock,
  debtRows,
  supplierRows,
}: {
  question: string;
  selectedDate: string;
  dayTotals: ReturnType<typeof sumSales>;
  expenseTotals: ReturnType<typeof sumExpenses>;
  totalExpenseAmount: number;
  dayProfit: number;
  totalShopDebt: number;
  supplierDebt: number;
  remaining: { keks: number; korzhik: number; plyannik: number };
  dayStock: ReturnType<typeof sumStock>;
  debtRows: Array<{ shop: BakeryRow; total: ReturnType<typeof sumSales> }>;
  supplierRows: BakeryRow[];
}) {
  const q = question.toLowerCase();
  const wantsDebt = /долг|қарыз|карыз|оплат|төле|толе/.test(q);
  const wantsProfit = /прибыл|пайда|доход|табыс|выруч|сумма|деньг|ақша|акша/.test(q);
  const wantsExpense = /расход|шығын|шыгын|зп|зарп|мука|ұн|ун|яйц|жұмыртқа|жумыртка|сахар|кефир/.test(q);
  const wantsStock = /остат|қалды|калды|склад|товар|продукт/.test(q);
  const wantsProduction = /произв|выпуск|производ|өндір|ондир|жасал/.test(q);
  const wantsSupplier = /поставщик|жеткіз|жеткиз|supplier/.test(q);

  if (wantsDebt) {
    if (!debtRows.length && supplierDebt <= 0) return "Открытых долгов нет. По магазинам и поставщикам всё закрыто.";
    const shopLines = debtRows
      .slice(0, 8)
      .map(({ shop, total }) => `- ${String(shop.name ?? "Магазин")}: ${total.debt.toLocaleString()} ₸`)
      .join("\n");
    return [
      `Общий долг магазинов: ${totalShopDebt.toLocaleString()} ₸.`,
      `Долг поставщикам: ${supplierDebt.toLocaleString()} ₸.`,
      shopLines ? `\nМагазины с долгом:\n${shopLines}` : "",
      "\nЧтобы закрыть долг, нажмите кнопку “Оплачено” в блоке Долги.",
    ].filter(Boolean).join("\n");
  }

  if (wantsProfit) {
    return [
      `Отчёт за ${selectedDate}:`,
      `- Выручка по товарам: ${dayTotals.expected.toLocaleString()} ₸`,
      `- Получено нал: ${dayTotals.cash.toLocaleString()} ₸`,
      `- Получено Kaspi: ${dayTotals.kaspi.toLocaleString()} ₸`,
      `- Расходы: ${totalExpenseAmount.toLocaleString()} ₸`,
      `- Прибыль: ${dayProfit.toLocaleString()} ₸`,
      dayProfit < 0 ? "Прибыль отрицательная: расходы больше полученных денег." : "День в плюсе, если все расходы внесены правильно.",
    ].join("\n");
  }

  if (wantsExpense) {
    return [
      `Расходы за ${selectedDate}: ${totalExpenseAmount.toLocaleString()} ₸`,
      `- ЗП: ${expenseTotals.salary.toLocaleString()} ₸`,
      `- Мука: ${expenseTotals.flour.toLocaleString()} ₸`,
      `- Яйцо: ${expenseTotals.eggs.toLocaleString()} ₸`,
      `- Сахар: ${expenseTotals.sugar.toLocaleString()} ₸`,
      `- Кефир: ${expenseTotals.kefir.toLocaleString()} ₸`,
      `- Прочие: ${expenseTotals.other.toLocaleString()} ₸`,
    ].join("\n");
  }

  if (wantsStock) {
    return [
      "Текущий остаток:",
      `- Кекс: ${remaining.keks} шт`,
      `- Коржик: ${remaining.korzhik} шт`,
      `- Пляник: ${remaining.plyannik} шт`,
      Object.values(remaining).some((value) => value <= 10) ? "Есть низкий остаток. Лучше запланировать новый выпуск." : "Остаток нормальный.",
    ].join("\n");
  }

  if (wantsProduction) {
    return [
      `Производство за ${selectedDate}:`,
      `- Кекс: ${dayStock.keks} шт`,
      `- Коржик: ${dayStock.korzhik} шт`,
      `- Пляник: ${dayStock.plyannik} шт`,
      `Всего: ${(dayStock.keks + dayStock.korzhik + dayStock.plyannik).toLocaleString()} шт`,
    ].join("\n");
  }

  if (wantsSupplier) {
    if (!supplierRows.length) return "Поставщики ещё не добавлены. Добавьте поставщика в блоке “Поставщики продуктов”.";
    const lines = supplierRows
      .slice(0, 8)
      .map((supplier) => `- ${String(supplier.name ?? "Поставщик")}: ${String(supplier.product_type ?? "продукты")}, долг ${Number(supplier.debt_amount ?? 0).toLocaleString()} ₸`)
      .join("\n");
    return `Поставщики:\n${lines}`;
  }

  return [
    "Я могу ответить по данным пекарни. Попробуйте спросить:",
    "- у кого долг?",
    "- какая прибыль сегодня?",
    "- какие расходы?",
    "- сколько осталось продуктов?",
    "- сколько произвели сегодня?",
    "- какие поставщики?",
  ].join("\n");
}

function buildBakeryAssistantInsights({
  selectedDate,
  shopCount,
  dayStock,
  dayTotals,
  totalShopDebt,
  debtRowsCount,
  remaining,
  supplierDebt,
}: {
  selectedDate: string;
  shopCount: number;
  dayStock: ReturnType<typeof sumStock>;
  dayTotals: ReturnType<typeof sumSales>;
  totalShopDebt: number;
  debtRowsCount: number;
  remaining: { keks: number; korzhik: number; plyannik: number };
  supplierDebt: number;
}) {
  const items: Array<{ title: string; detail: string; tone: "danger" | "warning" | "success" | "info" }> = [];
  const producedTotal = dayStock.keks + dayStock.korzhik + dayStock.plyannik;
  const soldTotal = dayTotals.keksNet + dayTotals.korzhikNet + dayTotals.plyannikNet;
  const lowStock = Object.entries(remaining).filter(([, value]) => value <= 10);

  if (!producedTotal) {
    items.push({
      title: "Производство ещё не записано",
      detail: `За ${selectedDate} не указано количество произведённых продуктов. Сначала внесите выпуск, чтобы остатки считались правильно.`,
      tone: "warning",
    });
  }

  if (shopCount && !soldTotal) {
    items.push({
      title: "Продажи по магазинам не внесены",
      detail: "Магазины есть, но за выбранный день нет продаж. Проверьте, внес ли водитель данные по точкам.",
      tone: "warning",
    });
  }

  if (debtRowsCount > 0) {
    items.push({
      title: "Есть долги по магазинам",
      detail: `${debtRowsCount} магазин(ов) имеют открытый долг на ${totalShopDebt.toLocaleString()} ₸. Эти долги показываются всегда, пока вы не нажмёте “Оплачено”.`,
      tone: "danger",
    });
  }

  if (supplierDebt > 0) {
    items.push({
      title: "Есть долг поставщикам",
      detail: `Общий долг поставщикам: ${supplierDebt.toLocaleString()} ₸. Лучше закрыть или договориться по сроку оплаты.`,
      tone: "danger",
    });
  }

  if (dayTotals.returns > 0) {
    items.push({
      title: "Проверьте возвраты",
      detail: `За день вернулось ${dayTotals.returns} шт. Если возвраты растут, проверьте качество, срок доставки и какие магазины чаще возвращают товар.`,
      tone: "warning",
    });
  }

  if (lowStock.length > 0) {
    items.push({
      title: "Низкий остаток",
      detail: `Мало осталось: ${lowStock.map(([name, value]) => `${productLabel(name)} ${value} шт`).join(", ")}. Запланируйте новый выпуск.`,
      tone: "warning",
    });
  }

  if (dayTotals.expected > 0 && dayTotals.debt === 0) {
    items.push({
      title: "День закрыт хорошо",
      detail: `Продажи за день: ${dayTotals.expected.toLocaleString()} ₸, долгов по магазинам нет. Можно сверить наличные и Kaspi.`,
      tone: "success",
    });
  }

  if (!items.length) {
    items.push({
      title: "Данных пока мало",
      detail: "Добавьте производство и продажи по магазинам. После этого ассистент покажет риски, долги и план выпуска.",
      tone: "info",
    });
  }

  const nextProduction = {
    keks: recommendedProduction(dayTotals.keksNet, remaining.keks),
    korzhik: recommendedProduction(dayTotals.korzhikNet, remaining.korzhik),
    plyannik: recommendedProduction(dayTotals.plyannikNet, remaining.plyannik),
  };

  return {
    items,
    nextProduction,
    urgentCount: items.filter((item) => item.tone === "danger").length,
  };
}

function recommendedProduction(soldToday: number, currentRemaining: number) {
  const target = soldToday > 0 ? Math.ceil(soldToday * 1.15) : 20;
  return Math.max(0, target - Math.max(0, currentRemaining));
}

function productLabel(name: string) {
  const labels: Record<string, string> = {
    keks: "кекс",
    korzhik: "коржик",
    plyannik: "пляник",
  };
  return labels[name] ?? name;
}

function DailyProduction({ title, price, produced }: { title: string; price: number; produced: number }) {
  return (
    <div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{price} ₸</p>
          <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
          {produced} шт
        </span>
      </div>
      <p className="mt-4 rounded-2xl bg-slate-950/35 px-3 py-2 text-sm font-semibold text-slate-200">
        Сегодня добавлено в производство: {produced}
      </p>
    </div>
  );
}

function MiniPill({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <span className={`rounded-2xl border px-3 py-2 text-sm ${danger ? "border-red-300/20 bg-red-500/10 text-red-100" : "border-white/10 bg-slate-950/35 text-slate-200"}`}>
      <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="mt-1 block font-black">{value}</span>
    </span>
  );
}

function ProductPhoto({ url, name }: { url: string; name: string }) {
  if (!url) {
    return (
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
        <ImageIcon className="h-7 w-7" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className="h-24 w-24 shrink-0 rounded-3xl border border-white/10 object-cover"
    />
  );
}

function summarizeProduct(product: BakeryRow, sales: BakeryRow[]) {
  const productSales = sales.filter((sale) => sale.product_id === product.id);
  const sold = productSales.reduce((sum, sale) => sum + Number(sale.quantity ?? 0), 0);
  const revenue = productSales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0);
  const profit = productSales.reduce((sum, sale) => sum + Number(sale.profit_amount ?? 0), 0);
  const initial = Number(product.initial_quantity ?? 0);

  return {
    product,
    sold,
    revenue,
    profit,
    remaining: initial - sold,
  };
}

function sumProductSales(rows: BakeryRow[]) {
  return rows.reduce((sum, row) => ({
    quantity: sum.quantity + Number(row.quantity ?? 0),
    revenue: sum.revenue + Number(row.total_amount ?? 0),
    profit: sum.profit + Number(row.profit_amount ?? 0),
  }), { quantity: 0, revenue: 0, profit: 0 });
}

function sumStock(rows: BakeryRow[]) {
  return rows.reduce((sum, row) => ({
    keks: sum.keks + Number(row.keks_qty ?? 0),
    korzhik: sum.korzhik + Number(row.korzhik_qty ?? 0),
    plyannik: sum.plyannik + Number(row.plyannik_qty ?? 0),
  }), { keks: 0, korzhik: 0, plyannik: 0 });
}

function sumSales(rows: BakeryRow[]) {
  return rows.reduce((sum, row) => {
    const keksReturn = Number(row.keks_return ?? 0);
    const korzhikReturn = Number(row.korzhik_return ?? 0);
    const plyannikReturn = Number(row.plyannik_return ?? 0);
    return {
      keksNet: sum.keksNet + Math.max(0, Number(row.keks_qty ?? 0) - keksReturn),
      korzhikNet: sum.korzhikNet + Math.max(0, Number(row.korzhik_qty ?? 0) - korzhikReturn),
      plyannikNet: sum.plyannikNet + Math.max(0, Number(row.plyannik_qty ?? 0) - plyannikReturn),
      keksReturn: sum.keksReturn + keksReturn,
      korzhikReturn: sum.korzhikReturn + korzhikReturn,
      plyannikReturn: sum.plyannikReturn + plyannikReturn,
      returns: sum.returns + keksReturn + korzhikReturn + plyannikReturn,
      expected: sum.expected + Number(row.expected_amount ?? 0),
      cash: sum.cash + Number(row.cash_amount ?? 0),
      kaspi: sum.kaspi + Number(row.kaspi_amount ?? 0),
      debt: sum.debt + Number(row.debt_amount ?? 0),
    };
  }, {
    keksNet: 0,
    korzhikNet: 0,
    plyannikNet: 0,
    keksReturn: 0,
    korzhikReturn: 0,
    plyannikReturn: 0,
    returns: 0,
    expected: 0,
    cash: 0,
    kaspi: 0,
    debt: 0,
  });
}

function whatsappHref(phone: string | number | null, message: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
