"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";

const prices = {
  keks: 450,
  korzhik: 500,
  plyannik: 550,
};

export function BakerySaleForm({
  shopId,
  defaultDate,
  action,
}: {
  shopId: string;
  defaultDate: string;
  action: (formData: FormData) => void;
}) {
  const [values, setValues] = useState({
    keksQty: 0,
    korzhikQty: 0,
    plyannikQty: 0,
    keksReturn: 0,
    korzhikReturn: 0,
    plyannikReturn: 0,
    cashAmount: 0,
    kaspiAmount: 0,
  });

  const totals = useMemo(() => {
    const keksNet = Math.max(0, values.keksQty - values.keksReturn);
    const korzhikNet = Math.max(0, values.korzhikQty - values.korzhikReturn);
    const plyannikNet = Math.max(0, values.plyannikQty - values.plyannikReturn);
    const expected = keksNet * prices.keks + korzhikNet * prices.korzhik + plyannikNet * prices.plyannik;
    const paid = values.cashAmount + values.kaspiAmount;
    return {
      keksNet,
      korzhikNet,
      plyannikNet,
      expected,
      paid,
      debt: Math.max(0, expected - paid),
    };
  }, [values]);

  function update(name: keyof typeof values, raw: string) {
    setValues((current) => ({ ...current, [name]: Math.max(0, Number(raw) || 0) }));
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="shopId" value={shopId} />
      <input type="hidden" name="debtAmount" value={totals.debt} />

      <label className="block">
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Дата</span>
        <input name="saleDate" type="date" defaultValue={defaultDate} className="premium-input h-11 w-full px-3 text-sm text-white outline-none" />
      </label>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
        <ProductRow label="Кекс" price={prices.keks} qtyName="keksQty" returnName="keksReturn" values={values} update={update} net={totals.keksNet} />
        <ProductRow label="Коржик" price={prices.korzhik} qtyName="korzhikQty" returnName="korzhikReturn" values={values} update={update} net={totals.korzhikNet} />
        <ProductRow label="Пляник" price={prices.plyannik} qtyName="plyannikQty" returnName="plyannikReturn" values={values} update={update} net={totals.plyannikNet} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MoneyInput label="Наличные" name="cashAmount" value={values.cashAmount} update={update} />
        <MoneyInput label="Kaspi" name="kaspiAmount" value={values.kaspiAmount} update={update} />
        <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-red-100">Долг</p>
          <p className="mt-1 text-2xl font-black text-red-100">{totals.debt.toLocaleString()} ₸</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-100">Сумма</p>
          <p className="mt-1 text-2xl font-black text-white">{totals.expected.toLocaleString()} ₸</p>
        </div>
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Оплачено</p>
          <p className="mt-1 text-2xl font-black text-white">{totals.paid.toLocaleString()} ₸</p>
        </div>
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Комментарий</span>
          <input name="comment" className="premium-input h-12 w-full px-3 text-sm text-white outline-none" />
        </label>
      </div>

      <button className="premium-button h-11 w-full bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
        <Save className="h-4 w-4" />
        Сохранить магазин
      </button>
    </form>
  );
}

function ProductRow({
  label,
  price,
  qtyName,
  returnName,
  values,
  update,
  net,
}: {
  label: string;
  price: number;
  qtyName: "keksQty" | "korzhikQty" | "plyannikQty";
  returnName: "keksReturn" | "korzhikReturn" | "plyannikReturn";
  values: Record<string, number>;
  update: (name: "keksQty" | "korzhikQty" | "plyannikQty" | "keksReturn" | "korzhikReturn" | "plyannikReturn" | "cashAmount" | "kaspiAmount", raw: string) => void;
  net: number;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_120px_120px_120px] md:items-end">
      <div>
        <p className="font-black text-white">{label}</p>
        <p className="text-xs text-slate-500">{price} ₸ / 1 шт</p>
      </div>
      <NumberInput label="Кол-во" name={qtyName} value={values[qtyName]} update={update} />
      <NumberInput label="Возврат" name={returnName} value={values[returnName]} update={update} />
      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-white">
        Чисто: {net}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  name,
  value,
  update,
}: {
  label: string;
  name: "keksQty" | "korzhikQty" | "plyannikQty" | "keksReturn" | "korzhikReturn" | "plyannikReturn" | "cashAmount" | "kaspiAmount";
  value: number;
  update: (name: "keksQty" | "korzhikQty" | "plyannikQty" | "keksReturn" | "korzhikReturn" | "plyannikReturn" | "cashAmount" | "kaspiAmount", raw: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        name={name}
        type="number"
        min="0"
        value={value}
        onChange={(event) => update(name, event.target.value)}
        className="premium-input h-10 w-full px-3 text-sm text-white outline-none"
      />
    </label>
  );
}

function MoneyInput({
  label,
  name,
  value,
  update,
}: {
  label: string;
  name: "cashAmount" | "kaspiAmount";
  value: number;
  update: (name: "keksQty" | "korzhikQty" | "plyannikQty" | "keksReturn" | "korzhikReturn" | "plyannikReturn" | "cashAmount" | "kaspiAmount", raw: string) => void;
}) {
  return <NumberInput label={label} name={name} value={value} update={update} />;
}
