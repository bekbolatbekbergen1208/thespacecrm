"use client";

import { FileDown, QrCode, Sheet } from "lucide-react";

export function RoboticsExportButtons({
  title,
  rows,
}: {
  title: string;
  rows: Record<string, unknown>[];
}) {
  const safeFileName = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").slice(0, 80) || "export";

  async function exportPdf() {
    const [{ default: jsPDF }, QRCode] = await Promise.all([
      import("jspdf"),
      import("qrcode"),
    ]);
    const doc = new jsPDF();
    doc.text("CRM.Space Robotics Education", 14, 14);
    doc.text(title, 14, 24);
    const qr = await QRCode.toDataURL(`${window.location.href}`);
    doc.addImage(qr, "PNG", 160, 10, 32, 32);
    rows.slice(0, 24).forEach((row, index) => {
      doc.text(JSON.stringify(row).slice(0, 100), 14, 42 + index * 8);
    });
    doc.save(`${safeFileName}.pdf`);
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const safeRows = rows.map((row) => Object.fromEntries(
      Object.entries(row).map(([key, entry]) => [
        key,
        typeof entry === "string" && /^[\s\u0000-\u001f]*[=+\-@]/.test(entry) ? `'${entry}` : entry,
      ]),
    ));
    const sheet = XLSX.utils.json_to_sheet(safeRows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 28));
    XLSX.writeFile(book, `${safeFileName}.xlsx`);
  }

  async function printQr() {
    const QRCode = await import("qrcode");
    const qr = await QRCode.toDataURL(window.location.href);
    const popup = window.open("", "_blank");
    if (!popup) return;
    const image = popup.document.createElement("img");
    image.src = qr;
    image.width = 220;
    image.height = 220;
    const caption = popup.document.createElement("p");
    caption.textContent = title;
    popup.document.body.append(image, caption);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ExportButton onClick={exportPdf} label="PDF" icon={<FileDown className="h-3.5 w-3.5" />} />
      <ExportButton onClick={exportExcel} label="Excel" icon={<Sheet className="h-3.5 w-3.5" />} />
      <ExportButton onClick={printQr} label="QR" icon={<QrCode className="h-3.5 w-3.5" />} />
    </div>
  );
}

function ExportButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="premium-button h-9 border border-white/10 bg-white/[0.045] px-4 text-xs text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/[0.08] active:scale-[0.98]"
    >
      {icon}
      {label}
    </button>
  );
}
