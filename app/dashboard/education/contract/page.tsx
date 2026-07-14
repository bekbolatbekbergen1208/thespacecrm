import { Card, PageHeader } from "@/components/app/app-shell";
import { BrandLogo } from "@/components/app/brand-logo";
import { PrintButton } from "@/components/app/print-button";
import { requireUser } from "@/lib/auth";

type Row = {
  id: string;
  [key: string]: string | number | null;
};

export default async function EducationContractPage() {
  const { supabase, membership } = await requireUser();
  const companyId = membership!.company_id;
  const [{ data: company }, { data: students }] = await Promise.all([
    supabase.from("companies").select("name, business_type").eq("id", companyId).maybeSingle(),
    supabase.from("robotics_students").select("id, first_name, last_name, parent_name, parent_phone, group_name").eq("company_id", companyId).order("first_name", { ascending: true }).limit(500),
  ]);
  const studentRows = (students ?? []) as Row[];
  const companyName = String(company?.name ?? "CRM.Space Education Center");
  const today = new Date().toISOString().slice(0, 10);

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
            Заполните поля в договоре, укажите сумму и дату оплаты, затем нажмите печать. Поля остаются в документе и печатаются вместе с текстом договора.
          </p>
        </Card>
        <PrintButton label="Печать договора" />
      </div>

      <section className="print-area contract-paper mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-black/30 md:p-10">
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
            4.1. Пропуск занятия по инициативе Заказчика/обучающегося не освобождает Заказчика от оплаты, если иное письменно не согласовано
            сторонами или не предусмотрено внутренними правилами Исполнителя.
          </p>
          <p>
            4.2. Перенос занятия допускается при наличии свободного времени, группы или индивидуального согласования. Исполнитель вправе изменить
            расписание с предварительным уведомлением Заказчика.
          </p>
          <p>
            4.3. Возврат денежных средств производится за фактически не оказанные услуги с учётом использованных занятий, предоставленных скидок,
            комиссий платёжных систем и письменного заявления Заказчика, если иное не запрещено применимым законодательством.
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
