"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

export function PaymentReminderLink({
  studentId,
  studentName,
  groupName,
  href,
  hasPhone,
}: {
  studentId: string;
  studentName: string;
  groupName: string;
  href: string;
  hasPhone: boolean;
}) {
  const storageKey = `crm-space-payment-reminder:${studentId}`;
  const [sentAt, setSentAt] = useState("");

  useEffect(() => {
    setSentAt(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  function markSent() {
    if (!hasPhone) return;
    const value = new Date().toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    window.localStorage.setItem(storageKey, value);
    setSentAt(value);
  }

  const sent = Boolean(sentAt);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={markSent}
      className={`block rounded-2xl border px-4 py-3 text-sm transition ${
        sent
          ? "border-yellow-300/30 bg-yellow-400/10 hover:bg-yellow-400/15"
          : "border-red-300/20 bg-red-500/10 hover:bg-red-500/15"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-black text-white">{studentName}</span>
          <span className={`mt-1 block text-xs ${sent ? "text-yellow-100/80" : "text-red-100/75"}`}>{groupName}</span>
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
          sent ? "bg-yellow-300 text-yellow-950" : "bg-red-500 text-white"
        }`}>
          <MessageCircle className="h-3.5 w-3.5" /> {sent ? "Отправлено" : hasPhone ? "WhatsApp" : "Нет номера"}
        </span>
      </span>
      {sent && (
        <span className="mt-3 block rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-xs font-bold text-yellow-100">
          Уведомление отправлено в WhatsApp: {sentAt}. Ожидаем оплату.
        </span>
      )}
      {!hasPhone && (
        <span className="mt-3 block rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">
          У родителя нет номера WhatsApp/телефона в карточке ученика.
        </span>
      )}
    </a>
  );
}
