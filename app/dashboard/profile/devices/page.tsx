import { cookies } from "next/headers";
import Link from "next/link";
import { logoutAllDevices, logoutOtherDevices } from "@/app/actions";
import { Card, PageHeader } from "@/components/app/app-shell";
import { SmallButton } from "@/components/app/forms";
import { requireUser } from "@/lib/auth";
import { Laptop, LogOut, ShieldCheck, Smartphone } from "lucide-react";

type DeviceRow = {
  id: string;
  device_id: string;
  user_agent: string | null;
  ip_address: string | null;
  signed_in_at: string;
  last_seen_at: string;
  signed_out_at: string | null;
};

export default async function ActiveDevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ supabase, user }, params, cookieStore] = await Promise.all([requireUser(), searchParams, cookies()]);
  const currentDeviceId = cookieStore.get("crm_auth_device_id")?.value ?? "";
  const { data, error } = await supabase
    .from("crm_auth_devices")
    .select("id, device_id, user_agent, ip_address, signed_in_at, last_seen_at, signed_out_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false })
    .limit(20);
  const devices = (data ?? []) as DeviceRow[];
  const activeDevices = devices.filter((device) => !device.signed_out_at);

  return (
    <>
      <PageHeader
        title="Активные устройства"
        description="Контролируйте, где открыт ваш CRM.Space аккаунт, и завершайте лишние сессии."
      />

      {params.message === "other-devices-signed-out" && (
        <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">
          Другие устройства завершены.
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-50">
          <p className="font-black">Таблица активных устройств ещё не создана.</p>
          <p className="mt-1 text-yellow-100/90">Выполните файл <b>supabase/auth-sessions.sql</b> в Supabase SQL Editor.</p>
          <p className="mt-2 rounded-2xl bg-slate-950/40 px-3 py-2 font-mono text-xs text-yellow-100">{error.message}</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Security</p>
              <h2 className="mt-1 text-xl font-black text-white">Сессии аккаунта</h2>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{activeDevices.length} активно</span>
          </div>

          {devices.length ? (
            <div className="space-y-3">
              {devices.map((device) => {
                const isCurrent = device.device_id === currentDeviceId;
                const isMobile = /mobile|android|iphone|ipad/i.test(device.user_agent ?? "");
                return (
                  <div key={device.id} className={`rounded-3xl border p-4 ${isCurrent ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-white/[0.035]"}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-slate-950/35 text-cyan-100">
                          {isMobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0">
                          <p className="font-black text-white">{isMobile ? "Мобильное устройство" : "Компьютер / браузер"} {isCurrent ? "· текущее" : ""}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{device.user_agent ?? "Unknown device"}</p>
                          <p className="mt-2 text-xs text-slate-500">IP: {device.ip_address ?? "не указан"}</p>
                        </div>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${device.signed_out_at ? "bg-slate-700 text-slate-200" : "bg-emerald-300 text-emerald-950"}`}>
                        {device.signed_out_at ? "завершено" : "активно"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
                      <p><b className="text-slate-200">Вход:</b> {formatDateTime(device.signed_in_at)}</p>
                      <p><b className="text-slate-200">Последний раз:</b> {formatDateTime(device.last_seen_at)}</p>
                      <p><b className="text-slate-200">Выход:</b> {device.signed_out_at ? formatDateTime(device.signed_out_at) : "нет"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/25 p-8 text-center text-sm text-slate-400">
              Устройства появятся после следующего входа в аккаунт.
            </div>
          )}
        </Card>

        <Card>
          <ShieldCheck className="h-8 w-8 text-cyan-100" />
          <h2 className="mt-4 text-xl font-black text-white">Управление доступом</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Если вы входили на чужом компьютере, завершите другие сессии. При смене пароля другие устройства завершаются автоматически.
          </p>
          <div className="mt-5 space-y-3">
            <form action={logoutOtherDevices}>
              <SmallButton>Выйти с других устройств</SmallButton>
            </form>
            <form action={logoutAllDevices}>
              <SmallButton danger>
                <LogOut className="h-3.5 w-3.5" />
                Выйти везде
              </SmallButton>
            </form>
            <Link href="/dashboard/profile" className="premium-button h-9 w-fit border border-white/10 bg-white/[0.045] px-4 text-xs text-slate-200">
              Назад в профиль
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
