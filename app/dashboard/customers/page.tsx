import { deleteCustomer, saveCustomer } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Field, Select, SmallButton } from "@/components/app/forms";
import { canManage, requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase, membership }, params, locale] = await Promise.all([requireUser(), searchParams, getServerLocale()]);
  const { data: customers } = await supabase.from("customers").select("*").eq("company_id", membership!.company_id).order("created_at", { ascending: false });
  const editable = canManage(membership!.role);
  const tt = (value: string) => translateLiteral(locale, value);

  return (
    <>
      <PageHeader title={editable ? tt("Customer management") : tt("Customer list")} description={editable ? tt("Create, update, and delete real customer records.") : tt("View live customer records from your company workspace.")} />
      {params.error && <p className="mb-4 rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
      {editable && <Card>
        <form action={saveCustomer} className="grid gap-4 md:grid-cols-5">
          <Field label={tt("Name")} name="name" />
          <Field label={tt("Phone")} name="phone" required={false} />
          <Field label={tt("Email")} name="email" type="email" required={false} />
          <Select label={tt("Status")} name="status"><option value="lead">{tt("Lead")}</option><option value="active">{tt("Active")}</option><option value="vip">VIP</option></Select>
          <Field label={tt("Value")} name="value" type="number" defaultValue={0} />
          <div className="md:col-span-5"><SmallButton>{tt("Add customer")}</SmallButton></div>
        </form>
      </Card>}
      <div className="mt-5 space-y-3">
        {!customers?.length && <EmptyState text={tt("No customers yet. Add the first customer above.")} />}
        {customers?.map((customer) => (
          <Card key={customer.id}>
            {editable ? (
              <>
                <form action={saveCustomer} className="grid gap-4 md:grid-cols-6">
                  <input type="hidden" name="id" value={customer.id} />
                  <Field label={tt("Name")} name="name" defaultValue={customer.name} />
                  <Field label={tt("Phone")} name="phone" defaultValue={customer.phone ?? ""} required={false} />
                  <Field label={tt("Email")} name="email" type="email" defaultValue={customer.email ?? ""} required={false} />
                  <Select label={tt("Status")} name="status" defaultValue={customer.status}><option value="lead">{tt("Lead")}</option><option value="active">{tt("Active")}</option><option value="vip">VIP</option></Select>
                  <Field label={tt("Value")} name="value" type="number" defaultValue={customer.value} />
                  <div className="flex items-end gap-2"><SmallButton>{tt("Save")}</SmallButton></div>
                </form>
                <form action={deleteCustomer} className="mt-3">
                  <input type="hidden" name="id" value={customer.id} />
                  <SmallButton danger>{tt("Delete customer")}</SmallButton>
                </form>
              </>
            ) : (
              <div className="grid gap-3 text-sm md:grid-cols-4">
                <p><span className="text-slate-400">{tt("Name")}</span><br />{customer.name}</p>
                <p><span className="text-slate-400">{tt("Phone")}</span><br />{customer.phone ?? tt("Not set")}</p>
                <p><span className="text-slate-400">{tt("Email")}</span><br />{customer.email ?? tt("Not set")}</p>
                <p><span className="text-slate-400">{tt("Status")}</span><br />{tt(customer.status)}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
