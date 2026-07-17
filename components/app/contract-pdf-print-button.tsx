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

function getInputValue(input: HTMLInputElement | null, fallback = "________________") {
  return input?.value?.trim() || input?.placeholder?.trim() || fallback;
}

function findInputByLabel(labelText: string) {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("[data-contract-paper] label"));
  const label = labels.find((item) => item.textContent?.toLowerCase().includes(labelText.toLowerCase()));
  return label?.querySelector<HTMLInputElement>("input") ?? null;
}

function findInputByPlaceholder(placeholder: string) {
  return document.querySelector<HTMLInputElement>(`[data-contract-paper] input[placeholder="${placeholder}"]`);
}

function field(label: string, value: string) {
  return `
    <div class="field">
      <div class="field-label">${escapeHtml(label)}</div>
      <div class="field-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function line(label: string, value: string) {
  return `<span class="inline-field"><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</span>`;
}

function section(title: string, body: string) {
  return `
    <section class="contract-section">
      <h2>${escapeHtml(title)}</h2>
      <div class="section-body">${body}</div>
    </section>
  `;
}

function collectContractData() {
  return {
    contractNumber: getInputValue(findInputByLabel("№ договора"), "____"),
    contractDate: getInputValue(findInputByLabel("Дата"), new Date().toISOString().slice(0, 10)),
    city: getInputValue(findInputByLabel("Город")),
    executor: getInputValue(findInputByLabel("Исполнитель")),
    executorId: getInputValue(findInputByLabel("БИН / ИИН Исполнителя")),
    executorAddress: getInputValue(findInputByLabel("Адрес Исполнителя")),
    executorPhone: getInputValue(findInputByLabel("Телефон Исполнителя")),
    parent: getInputValue(findInputByLabel("Заказчик / родитель")),
    parentId: getInputValue(findInputByLabel("ИИН Заказчика")),
    parentPhone: getInputValue(findInputByLabel("Телефон Заказчика")),
    parentAddress: getInputValue(findInputByLabel("Адрес Заказчика")),
    student: getInputValue(findInputByPlaceholder("ФИО ученика")),
    birthDate: getInputValue(findInputByPlaceholder("дд.мм.гггг")),
    group: getInputValue(findInputByPlaceholder("группа")),
    course: getInputValue(findInputByPlaceholder("название курса")),
    schedule: getInputValue(findInputByPlaceholder("дни и время занятий")),
    amount: getInputValue(findInputByLabel("Сумма оплаты")),
    paymentDate: getInputValue(findInputByLabel("Дата оплаты")),
    paymentPeriod: getInputValue(findInputByLabel("Период оплаты")),
    paymentMethod: getInputValue(findInputByLabel("Способ оплаты")),
  };
}

function buildCleanContractHtml() {
  const data = collectContractData();

  return `
    <article class="contract">
      <header class="contract-header">
        <div class="logo">CS</div>
        <div>
          <div class="eyebrow">CRM.Space Contract</div>
          <h1>Договор оказания образовательных услуг</h1>
          <p>для центра робототехники и дополнительного образования</p>
        </div>
        <div class="contract-meta">
          ${line("№ договора", data.contractNumber)}
          ${line("Дата", data.contractDate)}
          ${line("Город", data.city)}
        </div>
      </header>

      <div class="parties">
        ${field("Исполнитель", data.executor)}
        ${field("БИН / ИИН Исполнителя", data.executorId)}
        ${field("Адрес Исполнителя", data.executorAddress)}
        ${field("Телефон Исполнителя", data.executorPhone)}
        ${field("Заказчик / родитель", data.parent)}
        ${field("ИИН Заказчика", data.parentId)}
        ${field("Телефон Заказчика", data.parentPhone)}
        ${field("Адрес Заказчика", data.parentAddress)}
      </div>

      ${section("1. Предмет договора", `
        <p>1.1. Исполнитель обязуется оказать обучающемуся образовательные услуги по дополнительной программе в сфере робототехники, программирования, инженерного мышления и смежных учебных направлений, а Заказчик обязуется принять и оплатить такие услуги на условиях настоящего договора.</p>
        <p>1.2. Данные обучающегося: ${line("ФИО ученика", data.student)} ${line("Дата рождения", data.birthDate)} ${line("Группа", data.group)}</p>
        <p>1.3. Программа/курс: ${line("Курс", data.course)} ${line("Расписание", data.schedule)}</p>
      `)}

      ${section("2. Стоимость услуг и порядок оплаты", `
        <div class="payment-box">
          ${field("Сумма оплаты", data.amount)}
          ${field("Дата оплаты", data.paymentDate)}
          ${field("Период оплаты", data.paymentPeriod)}
          ${field("Способ оплаты", data.paymentMethod)}
        </div>
        <p>2.1. Стоимость образовательных услуг указывается в настоящем разделе и/или в приложении к договору, счёте, квитанции, электронном чеке либо ином документе, подтверждающем согласование цены.</p>
        <p>2.2. Оплата производится Заказчиком не позднее даты оплаты, указанной выше. Обязательство по оплате считается исполненным с момента поступления денежных средств Исполнителю либо выдачи подтверждающего платёжного документа.</p>
        <p>2.3. При просрочке оплаты Исполнитель вправе временно приостановить оказание услуг до погашения задолженности, предварительно уведомив Заказчика доступным способом связи.</p>
      `)}

      ${section("3. Права и обязанности сторон", `
        <p>3.1. Исполнитель обязуется обеспечить проведение занятий квалифицированным ментором, вести учёт посещаемости и информировать Заказчика о существенных изменениях расписания, успеваемости или организационных условий.</p>
        <p>3.2. Заказчик обязуется своевременно оплачивать услуги, обеспечивать посещение занятий обучающимся, сообщать о пропусках и предоставлять достоверные контактные данные.</p>
        <p>3.3. Обучающийся обязан соблюдать правила центра, технику безопасности, бережно относиться к оборудованию и уважительно относиться к другим участникам образовательного процесса.</p>
      `)}

      ${section("4. Посещаемость, переносы и возвраты", `
        <p>4.1. Пропуск занятия по инициативе Заказчика/обучающегося не освобождает Заказчика от оплаты, если иное письменно не согласовано сторонами или не предусмотрено внутренними правилами Исполнителя.</p>
        <p>4.2. Перенос занятия допускается при наличии свободного времени, группы или индивидуального согласования. Исполнитель вправе изменить расписание с предварительным уведомлением Заказчика.</p>
        <p>4.3. Возврат денежных средств производится за фактически не оказанные услуги с учётом использованных занятий, предоставленных скидок, комиссий платёжных систем и письменного заявления Заказчика, если иное не запрещено применимым законодательством.</p>
      `)}

      ${section("5. Персональные данные и коммуникации", `
        <p>5.1. Подписывая договор, Заказчик подтверждает согласие на обработку персональных данных Заказчика и обучающегося в целях исполнения договора, ведения CRM, расписания, посещаемости, оплаты, обратной связи и организационных уведомлений.</p>
        <p>5.2. Уведомления могут направляться через телефон, WhatsApp, электронную почту, CRM.Space или иной согласованный канал связи.</p>
      `)}

      ${section("6. Ответственность и разрешение споров", `
        <p>6.1. Стороны несут ответственность за неисполнение или ненадлежащее исполнение обязательств в соответствии с настоящим договором и применимым законодательством Республики Казахстан.</p>
        <p>6.2. Споры и разногласия стороны стремятся урегулировать путём переговоров. При недостижении соглашения спор подлежит рассмотрению в порядке, установленном применимым законодательством.</p>
      `)}

      ${section("7. Срок действия договора", `
        <p>7.1. Договор вступает в силу с даты его подписания сторонами и действует до полного исполнения сторонами своих обязательств.</p>
        <p>7.2. Договор может быть расторгнут по соглашению сторон либо по инициативе одной из сторон при условии письменного уведомления другой стороны и проведения взаиморасчётов.</p>
      `)}

      <div class="signatures">
        <div class="signature-card">
          <h3>Исполнитель</h3>
          <p>ФИО <span></span></p>
          <p>Подпись <span></span></p>
          <p>Дата <span></span></p>
        </div>
        <div class="signature-card">
          <h3>Заказчик</h3>
          <p>ФИО <span></span></p>
          <p>Подпись <span></span></p>
          <p>Дата <span></span></p>
        </div>
      </div>
    </article>
  `;
}

export function ContractPdfPrintButton({ label = "PDF и печать" }: { label?: string }) {
  function openPdfPrint() {
    const content = buildCleanContractHtml();
    const printWindow = window.open("", "_blank", "width=980,height=1200");
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
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      font-family: Arial, Helvetica, sans-serif !important;
      line-height: 1.42;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      background: #111827;
      color: #ffffff;
    }
    .toolbar button {
      border: 0;
      border-radius: 999px;
      background: #ffffff;
      color: #111827;
      padding: 10px 16px;
      font-weight: 800;
      cursor: pointer;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 18px auto;
      background: #ffffff;
      color: #111827;
      box-shadow: 0 20px 70px rgba(15, 23, 42, 0.18);
    }
    .contract {
      padding: 13mm;
      font-size: 11px;
      background: #ffffff;
      color: #111827;
    }
    .contract-header {
      display: grid;
      grid-template-columns: 48px 1fr 150px;
      gap: 12px;
      align-items: start;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .logo {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: #e0f2fe;
      color: #0f172a;
      font-weight: 900;
      border: 1px solid #bae6fd;
    }
    .eyebrow {
      color: #0e7490;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }
    h1 {
      margin: 3px 0 4px;
      font-size: 20px;
      line-height: 1.1;
      color: #111827;
    }
    h2 {
      margin: 0 0 8px;
      padding: 7px 10px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #f3f4f6;
      color: #111827;
      font-size: 12px;
    }
    h3 { margin: 0 0 10px; color: #111827; font-size: 12px; }
    p { margin: 0 0 6px; color: #374151; }
    .contract-meta {
      display: grid;
      gap: 5px;
      font-size: 9.5px;
    }
    .inline-field {
      display: inline-block;
      margin: 0 4px 4px 0;
      color: #374151;
    }
    .inline-field b { color: #111827; }
    .parties,
    .payment-box,
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .parties {
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 14px;
      background: #f9fafb;
      margin-bottom: 12px;
    }
    .payment-box {
      padding: 9px;
      border: 1px solid #67e8f9;
      border-radius: 12px;
      background: #ecfeff;
      margin-bottom: 8px;
    }
    .field {
      min-height: 40px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #ffffff;
      padding: 6px 8px;
    }
    .field-label {
      color: #6b7280;
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .field-value {
      margin-top: 3px;
      color: #111827;
      font-weight: 800;
      word-break: break-word;
    }
    .contract-section {
      margin-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-body {
      display: grid;
      gap: 5px;
    }
    .signatures {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #d1d5db;
    }
    .signature-card {
      border: 1px solid #d1d5db;
      border-radius: 14px;
      padding: 10px;
      min-height: 118px;
    }
    .signature-card span {
      display: inline-block;
      min-width: 130px;
      border-bottom: 1px solid #6b7280;
      height: 14px;
    }
    @media print {
      .toolbar { display: none !important; }
      .page {
        width: auto;
        min-height: auto;
        margin: 0;
        box-shadow: none;
      }
      .contract { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>Белая PDF-версия договора</strong>
    <button onclick="window.print()">Печать / сохранить PDF</button>
  </div>
  <main class="page">${content}</main>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 300));
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
