import Link from "next/link";
import { logout } from "@/app/actions";
import { BrandLogo } from "@/components/app/brand-logo";
import { requireMembership } from "@/lib/auth";
import { Lock, MessageCircle } from "lucide-react";

export default async function BillingBlockedPage() {
  const { membership } = await requireMembership();
  const company = Array.isArray(membership?.companies) ? membership?.companies[0] : membership?.companies;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.12),transparent_34rem)]" />
      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
        <div className="w-full rounded-[2rem] border border-red-300/20 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-12 w-12" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">CRM.Space</p>
              <h1 className="text-2xl font-black">Абонемент не оплачен</h1>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-red-300/20 bg-red-500/10 p-5">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/15 text-red-100">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black text-red-50">{company?.name ?? "Ваш workspace"} временно заблокирован.</p>
                <p className="mt-2 text-sm leading-6 text-red-100/80">
                  Доступ к CRM откроется после оплаты абонемента и подтверждения администратором CRM.Space.
                </p>
                <div className="mt-4 grid gap-2 text-sm text-red-50/90">
                  <p>Статус: <b>{company?.subscription_status ?? "blocked"}</b></p>
                  <p>Дата окончания: <b>{company?.subscription_due_date ?? "-"}</b></p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              className="premium-button h-12 justify-center bg-white px-5 text-sm text-slate-950"
            >
              <MessageCircle className="h-4 w-4" />
              Написать администратору
            </a>
            <form action={logout}>
              <button className="premium-button h-12 w-full justify-center border border-white/10 bg-white/[0.05] px-5 text-sm text-slate-100">
                Выйти
              </button>
            </form>
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Если вы уже оплатили, попросите администратора CRM.Space отметить оплату в панели управления.
          </p>
          <Link href="/login" className="mt-4 inline-block text-xs font-black text-cyan-100">
            Вернуться ко входу
          </Link>
        </div>
      </section>
    </main>
  );
}
