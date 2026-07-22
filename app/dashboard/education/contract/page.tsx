import { Card, PageHeader } from "@/components/app/app-shell";
import { BrandLogo } from "@/components/app/brand-logo";
import { ContractPdfPrintButton } from "@/components/app/contract-pdf-print-button";
import { requireUser } from "@/lib/auth";
import { Bot, Lightbulb } from "lucide-react";

type Row = {
  id: string;
  [key: string]: string | number | null;
};

export default async function EducationContractPage({
  searchParams,
}: {
  searchParams: Promise<{ contractPrompt?: string }>;
}) {
  const { supabase, membership } = await requireUser();
  const params = await searchParams;
  const companyId = membership!.company_id;
  const [{ data: company }, { data: students }] = await Promise.all([
    supabase.from("companies").select("name, business_type").eq("id", companyId).maybeSingle(),
    supabase.from("robotics_students").select("id, first_name, last_name, parent_name, parent_phone, group_name").eq("company_id", companyId).order("first_name", { ascending: true }).limit(500),
  ]);
  const studentRows = (students ?? []) as Row[];
  const companyName = String(company?.name ?? "CRM.Space Education Center");
  const today = new Date().toISOString().slice(0, 10);
  const contractPrompt = (params.contractPrompt ?? "").trim();
  const contractAssistant = contractPrompt ? buildContractAssistant(contractPrompt, companyName) : null;

  return (
    <>
      <PageHeader
        title="Договор с родителем"
        description="Заполняемый договор на образовательные услуги с суммой оплаты и датой оплаты. Можно сразу распечатать."
      />

      <div className="no-print mb-5 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
        <Card>
          <h2 className="text-xl font-black text-white">Как пользоваться</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Заполните поля в договоре, укажите сумму и дату оплаты, затем нажмите “PDF и печать”. Сначала откроется чистая PDF-версия договора, потом появится печать.
          </p>
        </Card>
        <ContractPdfPrintButton label="PDF и печать договора" />
      </div>

      <Card className="no-print mb-5 overflow-hidden border-cyan-300/20 bg-cyan-300/[0.06]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              <Bot className="h-3.5 w-3.5" />
              AI помощник договора
            </p>
            <h2 className="mt-3 text-xl font-black text-white">Опишите коротко, какой договор нужен</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Например: “абонемент 35000 тг, 2 раза в неделю, возврат 5 дней, перенос только в эту неделю”. CRM подготовит пункты, которые можно вставить в договор.
            </p>
          </div>
          <span className="w-fit rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">работает сразу</span>
        </div>
        <form action="/dashboard/education/contract" className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Краткое описание</span>
            <textarea
              name="contractPrompt"
              defaultValue={contractPrompt}
              placeholder="Напишите коротко условия договора, оплату, срок, переносы, возврат, правила занятий..."
              className="premium-input min-h-24 w-full px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <button className="premium-button h-12 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
            <Lightbulb className="h-4 w-4" />
            Сделать пункты
          </button>
        </form>
        {contractAssistant && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Что добавить</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                {contractAssistant.checklist.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Готовая формулировка</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-100">{contractAssistant.clause}</p>
            </div>
          </div>
        )}
      </Card>

      <section data-contract-paper className="print-area contract-paper mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-black/30 md:p-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo className="h-14 w-14" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">CRM.Space Contract</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Договор оказания образовательных услуг</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">для центра робототехники и дополнительного образования</p>
            </div>
          </div>
          <div className="grid gap-2 text-sm font-semibold text-slate-700">
            <label className="contract-inline-field">
              № договора
              <input placeholder="____" />
            </label>
            <label className="contract-inline-field">
              Дата
              <input type="date" defaultValue={today} />
            </label>
            <label className="contract-inline-field">
              Город
              <input placeholder="________________" />
            </label>
          </div>
        </div>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <ContractField label="Исполнитель" defaultValue={companyName} />
          <ContractField label="БИН / ИИН Исполнителя" />
          <ContractField label="Адрес Исполнителя" />
          <ContractField label="Телефон Исполнителя" />
          <ContractField label="Заказчик / родитель" list="parents" />
          <ContractField label="ИИН Заказчика" />
          <ContractField label="Телефон Заказчика" />
          <ContractField label="Адрес Заказчика" />
        </div>

        <datalist id="parents">
          {studentRows.map((student) => (
            <option key={student.id} value={String(student.parent_name ?? "")} />
          ))}
        </datalist>
        <datalist id="students">
          {studentRows.map((student) => (
            <option key={student.id} value={fullName(student)} />
          ))}
        </datalist>
        <datalist id="groups">
          {Array.from(new Set(studentRows.map((student) => String(student.group_name ?? "")).filter(Boolean))).map((group) => (
            <option key={group} value={group} />
          ))}
        </datalist>

        <ContractSection title="1. Предмет договора">
          <p>
            1.1. Исполнитель обязуется оказать обучающемуся образовательные услуги по дополнительной программе в сфере робототехники, программирования,
            инженерного мышления и смежных учебных направлений, а Заказчик обязуется принять и оплатить такие услуги на условиях настоящего договора.
          </p>
          <p>
            1.2. Данные обучающегося: <ContractTextInput placeholder="ФИО ученика" list="students" />,
            дата рождения <ContractTextInput placeholder="дд.мм.гггг" short />, группа <ContractTextInput placeholder="группа" list="groups" short />.
          </p>
          <p>
            1.3. Программа/курс: <ContractTextInput placeholder="название курса" />. Расписание занятий:
            <ContractTextInput placeholder="дни и время занятий" />.
          </p>
        </ContractSection>

        <ContractSection title="2. Стоимость услуг и порядок оплаты">
          <div className="mb-4 grid gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 md:grid-cols-2">
            <ContractField label="Сумма оплаты" placeholder="например: 35000 ₸" strong />
            <ContractField label="Дата оплаты" type="date" strong />
            <ContractField label="Период оплаты" placeholder="месяц / абонемент / курс" />
            <ContractField label="Способ оплаты" placeholder="Kaspi / наличные / карта / перевод" />
          </div>
          <p>
            2.1. Стоимость образовательных услуг указывается в настоящем разделе и/или в приложении к договору, счёте, квитанции, электронном чеке
            либо ином документе, подтверждающем согласование цены.
          </p>
          <p>
            2.2. Оплата производится Заказчиком не позднее даты оплаты, указанной выше. Обязательство по оплате считается исполненным с момента
            поступления денежных средств Исполнителю либо выдачи подтверждающего платёжного документа.
          </p>
          <p>
            2.3. При просрочке оплаты Исполнитель вправе временно приостановить оказание услуг до погашения задолженности, предварительно уведомив
            Заказчика доступным способом связи.
          </p>
          <p>
            2.4. Абонемент действует строго 30 календарных дней с даты покупки/оплаты, если иной срок письменно не согласован сторонами.
            По истечении указанного срока неиспользованные занятия не переносятся и не компенсируются, за исключением случаев, прямо предусмотренных
            настоящим договором или применимым законодательством.
          </p>
        </ContractSection>

        <ContractSection title="3. Права и обязанности сторон">
          <p>
            3.1. Исполнитель обязуется обеспечить проведение занятий квалифицированным ментором, вести учёт посещаемости и информировать Заказчика
            о существенных изменениях расписания, успеваемости или организационных условий.
          </p>
          <p>
            3.2. Заказчик обязуется своевременно оплачивать услуги, обеспечивать посещение занятий обучающимся, сообщать о пропусках и предоставлять
            достоверные контактные данные.
          </p>
          <p>
            3.3. Обучающийся обязан соблюдать правила центра, технику безопасности, бережно относиться к оборудованию и уважительно относиться к
            другим участникам образовательного процесса.
          </p>
        </ContractSection>

        <ContractSection title="4. Посещаемость, переносы и возвраты">
          <p>
            4.1. С 6 июля вступают в силу обновлённые правила использования абонементов. Данные изменения распространяются на все действующие
            и новые абонементы, если иное письменно не согласовано с Исполнителем.
          </p>
          <p>
            4.2. Если обучающийся не может посетить занятие по своему расписанию, Заказчик обязан заранее уведомить администрацию. При предварительном
            уведомлении обучающийся может посетить занятие в другой день этой же календарной недели только при наличии свободных мест.
          </p>
          <p>
            4.3. Чтобы гарантировать место на следующую неделю, Заказчику рекомендуется заранее бронировать занятия по воскресеньям либо в иной срок,
            установленный администрацией центра.
          </p>
          <p>
            4.4. Если в выбранный день свободных мест нет, пропущенное занятие считается использованным и не переносится на следующую неделю.
          </p>
          <p>
            4.5. Если обучающийся уезжает в отпуск, Заказчик обязан заранее сообщить администрации центра. В этом случае пропущенные занятия могут
            быть перенесены только в пределах текущего календарного месяца и только при наличии свободных мест. Перенос занятий на следующий месяц
            не предусмотрен.
          </p>
          <p>
            4.6. Система учёта абонемента по количеству посещений отменяется. Абонемент рассчитан на посещение занятий по расписанию два раза
            в неделю в течение срока действия абонемента, а не на фиксированное количество посещений.
          </p>
          <p>
            4.7. Возврат денежных средств возможен только в течение 5 календарных дней после покупки/оплаты абонемента на основании письменного
            заявления Заказчика. Возврат производится с учётом фактически оказанных услуг, использованных занятий, предоставленных скидок,
            комиссий платёжных систем и иных фактически понесённых расходов Исполнителя, если иное не предусмотрено применимым законодательством.
          </p>
        </ContractSection>

        <ContractSection title="5. Персональные данные и коммуникации">
          <p>
            5.1. Подписывая договор, Заказчик подтверждает согласие на обработку персональных данных Заказчика и обучающегося в целях исполнения
            договора, ведения CRM, расписания, посещаемости, оплаты, обратной связи и организационных уведомлений.
          </p>
          <p>
            5.2. Уведомления могут направляться через телефон, WhatsApp, электронную почту, CRM.Space или иной согласованный канал связи.
          </p>
        </ContractSection>

        <ContractSection title="6. Ответственность и разрешение споров">
          <p>
            6.1. Стороны несут ответственность за неисполнение или ненадлежащее исполнение обязательств в соответствии с настоящим договором и
            применимым законодательством Республики Казахстан.
          </p>
          <p>
            6.2. Споры и разногласия стороны стремятся урегулировать путём переговоров. При недостижении соглашения спор подлежит рассмотрению в
            порядке, установленном применимым законодательством.
          </p>
        </ContractSection>

        <ContractSection title="7. Срок действия договора">
          <p>
            7.1. Договор вступает в силу с даты его подписания сторонами и действует до полного исполнения сторонами своих обязательств.
          </p>
          <p>
            7.2. Договор может быть расторгнут по соглашению сторон либо по инициативе одной из сторон при условии письменного уведомления другой
            стороны и проведения взаиморасчётов.
          </p>
        </ContractSection>

        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
          <SignatureBlock title="Исполнитель" />
          <SignatureBlock title="Заказчик" />
        </div>
      </section>
    </>
  );
}

function ContractSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="rounded-2xl bg-slate-950 px-4 py-3 text-base font-black text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function ContractField({
  label,
  defaultValue = "",
  placeholder = "________________",
  type = "text",
  list,
  strong = false,
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  list?: string;
  strong?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        type={type}
        list={list}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`contract-input ${strong ? "contract-input-strong" : ""}`}
      />
    </label>
  );
}

function ContractTextInput({ placeholder, short = false, list }: { placeholder: string; short?: boolean; list?: string }) {
  return <input list={list} placeholder={placeholder} className={`contract-text-input ${short ? "contract-text-input-short" : ""}`} />;
}

function SignatureBlock({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-5 grid gap-4 text-sm text-slate-600">
        <label>ФИО <input className="contract-sign-line" /></label>
        <label>Подпись <input className="contract-sign-line" /></label>
        <label>Дата <input className="contract-sign-line" /></label>
      </div>
    </div>
  );
}

function fullName(row: Row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || String(row.student_name ?? row.name ?? "");
}

function buildContractAssistant(prompt: string, companyName: string) {
  const lower = prompt.toLowerCase();
  const mentionsPayment = /оплат|сумм|цена|стоим|тг|₸|kaspi|нал/i.test(prompt);
  const mentionsRefund = /возврат|вернуть|5/i.test(prompt);
  const mentionsSchedule = /распис|занят|урок|недел|перенос|пропуск/i.test(prompt);
  const mentionsTerm = /30|срок|абонемент|месяц/i.test(prompt);
  const mentionsSafety = /правил|безопас|оборуд|ответствен/i.test(prompt);

  const checklist = [
    mentionsPayment ? "Указать сумму, дату и способ оплаты." : "Добавить пункт оплаты: сумма, дата оплаты, способ оплаты.",
    mentionsTerm ? "Закрепить срок абонемента: 30 календарных дней с даты оплаты." : "Указать срок действия договора/абонемента.",
    mentionsSchedule ? "Описать расписание, пропуски, переносы и свободные места." : "Добавить правила посещения и переноса занятий.",
    mentionsRefund ? "Добавить возврат только в течение 5 календарных дней после оплаты." : "Добавить отдельный пункт возврата.",
    mentionsSafety ? "Добавить ответственность за правила центра и оборудование." : "Проверить персональные данные, подписи сторон и ответственность.",
  ];

  const clause = [
    `На основании описания: “${prompt}”`,
    "",
    `Рекомендуемая формулировка для договора ${companyName}:`,
    "",
    "Стороны согласовали, что образовательные услуги оказываются по расписанию, указанному в договоре или приложении к нему. Заказчик обязуется своевременно оплачивать услуги и заранее уведомлять Исполнителя о невозможности посещения занятия.",
    mentionsPayment
      ? "Сумма, дата и способ оплаты указываются в разделе оплаты договора, счёте, квитанции или ином документе, подтверждающем платёж."
      : "Стоимость услуг, дата оплаты и способ оплаты должны быть отдельно указаны в разделе “Стоимость услуг и порядок оплаты”.",
    "Абонемент действует строго 30 календарных дней с даты покупки/оплаты. Перенос пропущенного занятия возможен только в пределах той же календарной недели при предварительном уведомлении и наличии свободных мест.",
    "Возврат денежных средств возможен только в течение 5 календарных дней после покупки/оплаты на основании письменного заявления Заказчика с учётом фактически оказанных услуг и применимого законодательства.",
    lower.includes("whatsapp") || lower.includes("ватсап")
      ? "Уведомления сторон могут направляться через WhatsApp, телефон, CRM.Space или иной согласованный канал связи."
      : "Уведомления сторон могут направляться через телефон, электронную почту, CRM.Space или иной согласованный канал связи.",
  ].join("\n");

  return { checklist, clause };
}
