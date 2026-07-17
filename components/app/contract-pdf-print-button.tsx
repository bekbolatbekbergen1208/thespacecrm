"use client";

import { FileText, Printer } from "lucide-react";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function contractHtmlWithValues() {
  const paper = document.querySelector<HTMLElement>("[data-contract-paper]");
  if (!paper) return "";

  const clone = paper.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("input").forEach((input) => {
    const element = input as HTMLInputElement;
    const value = element.value || element.placeholder || "";
    const span = document.createElement("span");
    span.className = element.className;
    span.textContent = value;
    element.replaceWith(span);
  });
  return clone.innerHTML;
}

export function ContractPdfPrintButton({ label = "PDF и печать" }: { label?: string }) {
  function openPdfPrint() {
    const content = contractHtmlWithValues();
    if (!content) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=1200");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Договор - PDF печать</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body {
      margin: 0;
      background: #e2e8f0;
      color: #0f172a;
      font-family: Arial, "Helvetica Neue", sans-serif;
      line-height: 1.45;
    }
    .pdf-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 18px;
      background: #020617;
      color: #f8fafc;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
    }
    .pdf-toolbar button {
      border: 0;
      border-radius: 999px;
      background: #ffffff;
      color: #020617;
      padding: 10px 18px;
      font-weight: 800;
      cursor: pointer;
    }
    .pdf-page {
      width: 210mm;
      min-height: 297mm;
      margin: 18px auto;
      padding: 0;
      background: #ffffff;
      box-shadow: 0 22px 80px rgba(15, 23, 42, 0.25);
    }
    .contract-paper {
      width: 100%;
      max-width: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 13mm !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-size: 10.5px;
    }
    .contract-paper svg { width: 42px; height: 42px; }
    .contract-paper h1 {
      margin: 0;
      font-size: 20px;
      line-height: 1.15;
      color: #0f172a;
    }
    .contract-paper h2 {
      margin: 0;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #e2e8f0 !important;
      color: #0f172a !important;
      padding: 7px 10px;
      font-size: 12px;
    }
    .contract-paper h3 { margin: 0; font-size: 12px; color: #0f172a; }
    .contract-paper p { margin: 0; color: #334155; }
    .contract-paper section {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 12px;
    }
    .contract-paper .grid { display: grid; gap: 10px; }
    .contract-paper .md\\:grid-cols-2,
    .contract-paper .md\\:grid-cols-2 {
      grid-template-columns: 1fr 1fr;
    }
    .contract-paper .md\\:flex-row { flex-direction: row; }
    .contract-paper .md\\:items-start { align-items: flex-start; }
    .contract-paper .md\\:justify-between { justify-content: space-between; }
    .contract-paper .flex { display: flex; }
    .contract-paper .items-center { align-items: center; }
    .contract-paper .gap-4 { gap: 12px; }
    .contract-paper .mb-8 { margin-bottom: 18px; }
    .contract-paper .mt-1 { margin-top: 4px; }
    .contract-paper .mt-2 { margin-top: 6px; }
    .contract-paper .mt-3 { margin-top: 8px; }
    .contract-paper .mt-5 { margin-top: 12px; }
    .contract-paper .mt-6 { margin-top: 12px; }
    .contract-paper .mt-8 { margin-top: 18px; }
    .contract-paper .pb-6 { padding-bottom: 14px; }
    .contract-paper .pt-6 { padding-top: 14px; }
    .contract-paper .p-4 { padding: 10px; }
    .contract-paper .border-b,
    .contract-paper .border-t { border-color: #e2e8f0; }
    .contract-paper .rounded-3xl,
    .contract-paper .rounded-2xl { border-radius: 14px; }
    .contract-paper .bg-slate-50 { background: #f8fafc; }
    .contract-paper .bg-cyan-50 { background: #ecfeff; }
    .contract-paper .border,
    .contract-paper .border-slate-200,
    .contract-paper .border-cyan-200 { border: 1px solid #cbd5e1; }
    .contract-input,
    .contract-text-input,
    .contract-sign-line,
    .contract-inline-field span {
      display: inline-block;
      min-height: 20px;
      border: 1px solid #64748b;
      border-radius: 8px;
      background: #ffffff;
      padding: 6px 8px;
      color: #0f172a;
      font-weight: 700;
      word-break: break-word;
    }
    .contract-input-strong { border-color: #0891b2; background: #ecfeff; }
    .contract-text-input {
      min-width: 120px;
      border-width: 0 0 1px;
      border-radius: 0;
      padding: 0 4px;
    }
    .contract-text-input-short { min-width: 70px; }
    .contract-inline-field {
      display: grid;
      grid-template-columns: 70px 1fr;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      color: #334155;
    }
    .contract-sign-line {
      min-width: 150px;
      border-width: 0 0 1px;
      border-radius: 0;
      padding: 2px 4px;
    }
    @media print {
      body { background: #ffffff; }
      .pdf-toolbar { display: none; }
      .pdf-page { width: auto; min-height: auto; margin: 0; box-shadow: none; }
      .contract-paper { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="pdf-toolbar">
    <strong>${escapeHtml("PDF версия договора")}</strong>
    <button onclick="window.print()">Печать / сохранить PDF</button>
  </div>
  <main class="pdf-page">
    <section class="contract-paper">${content}</section>
  </main>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 350));
  </script>
</body>
</html>`);
    printWindow.document.close();
  }

  return (
    <button
      type="button"
      onClick={openPdfPrint}
      className="no-print premium-button h-11 border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm text-cyan-100"
    >
      <FileText className="h-4 w-4" />
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
