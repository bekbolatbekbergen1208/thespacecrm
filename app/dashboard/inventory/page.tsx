import { deleteInventoryItem, saveInventoryItem } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Field, SmallButton } from "@/components/app/forms";
import { canManage, requireMembership } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase, membership }, params, locale] = await Promise.all([requireMembership(), searchParams, getServerLocale()]);
  const tt = (value: string) => translateLiteral(locale, value);
  if (!canManage(membership!.role)) {
    return (
      <>
        <PageHeader title={tt("Inventory management")} description={tt("Inventory controls are available to workspace managers.")} />
        <EmptyState text={tt("Ask your founder or manager for inventory access.")} />
      </>
    );
  }
  const { data: items } = await supabase.from("inventory_items").select("*").eq("company_id", membership!.company_id).order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title={tt("Inventory management")} description={tt("Track stock, pricing, SKUs, and reorder levels.")} />
      {params.error && <p className="mb-4 rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
      <Card>
        <form action={saveInventoryItem} className="grid gap-4 md:grid-cols-5">
          <Field label={tt("Item name")} name="name" />
          <Field label="SKU" name="sku" required={false} />
          <Field label={tt("Quantity")} name="quantity" type="number" defaultValue={0} />
          <Field label={tt("Price")} name="price" type="number" defaultValue={0} />
          <Field label={tt("Reorder level")} name="reorderLevel" type="number" defaultValue={5} />
          <div className="md:col-span-5"><SmallButton>{tt("Add item")}</SmallButton></div>
        </form>
      </Card>
      <div className="mt-5 space-y-3">
        {!items?.length && <EmptyState text={tt("No inventory items yet. Add stock above.")} />}
        {items?.map((item) => (
          <Card key={item.id} className={item.quantity <= item.reorder_level ? "border-cyan-300/30" : ""}>
            <form action={saveInventoryItem} className="grid gap-4 md:grid-cols-6">
              <input type="hidden" name="id" value={item.id} />
              <Field label={tt("Item name")} name="name" defaultValue={item.name} />
              <Field label="SKU" name="sku" defaultValue={item.sku ?? ""} required={false} />
              <Field label={tt("Quantity")} name="quantity" type="number" defaultValue={item.quantity} />
              <Field label={tt("Price")} name="price" type="number" defaultValue={item.price} />
              <Field label={tt("Reorder level")} name="reorderLevel" type="number" defaultValue={item.reorder_level} />
              <div className="flex items-end"><SmallButton>{tt("Save")}</SmallButton></div>
            </form>
            <form action={deleteInventoryItem} className="mt-3">
              <input type="hidden" name="id" value={item.id} />
              <SmallButton danger>{tt("Delete item")}</SmallButton>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
