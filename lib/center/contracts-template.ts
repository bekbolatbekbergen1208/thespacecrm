export type ContractSettings = {
  provider_name: string;
  representative: string;
  city: string;
  provider_details: string;
  template: string;
};
export type SavedContract = {
  id: string;
  number: string;
  student_id: string;
  student_name: string;
  contract_date: string;
  body: string;
  status: "draft";
  created_at: string;
};
export const contractFields = [
  "number",
  "date",
  "city",
  "provider_name",
  "representative",
  "provider_details",
  "student_name",
  "birth_date",
  "parent_name",
  "parent_iin",
  "parent_email",
  "phone",
  "address",
  "group_name",
  "course",
  "start_date",
  "end_date",
  "schedule",
  "amount",
  "billing_period",
  "payment_due",
  "terms",
] as const;
export const defaultContractTemplate = `ДОГОВОР № {{number}}\nоб оказании образовательных услуг\n\n{{city}}                                      {{date}}\n\nИсполнитель: {{provider_name}}. Представитель: {{representative}}.\nЗаказчик (родитель / законный представитель): {{parent_name}}.\n\n1. УЧАСТНИК И ПРЕДМЕТ ДОГОВОРА\nОбразовательные занятия по курсу «{{course}}» для ученика {{student_name}}, дата рождения: {{birth_date}}.\nГруппа: {{group_name}}.\n\n2. ПЕРИОД И РАСПИСАНИЕ\nНачало занятий: {{start_date}}. Окончание: {{end_date}}.\nРасписание: {{schedule}}.\n\n3. ОПЛАТА\nСтоимость: {{amount}} тенге за {{billing_period}}.\nДата / срок оплаты: {{payment_due}}.\n\n4. УСЛОВИЯ, СОГЛАСОВАННЫЕ СТОРОНАМИ\n{{terms}}\n\n5. РЕКВИЗИТЫ И КОНТАКТЫ\nИсполнитель: {{provider_name}}\n{{provider_details}}\n\nЗаказчик: {{parent_name}}\nИИН (если указан): {{parent_iin}}\nТелефон: {{phone}}\nEmail: {{parent_email}}\nАдрес: {{address}}\n\n6. ПОДПИСИ\nИсполнитель: __________________ / __________________\nЗаказчик: __________________ / __________________\n\nДата подписания: __________________`;
export const defaultContractSettings: ContractSettings = {
  provider_name: "",
  representative: "",
  city: "",
  provider_details: "",
  template: defaultContractTemplate,
};
export function validateContractTemplate(template: string) {
  for (const token of template.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g))
    if (!(contractFields as readonly string[]).includes(token[1]))
      throw new Error(`Белгісіз шаблон өрісі: ${token[1]}`);
}
export function renderContract(
  template: string,
  values: Record<string, string>,
) {
  validateContractTemplate(template);
  return template.replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (_, key: string) => values[key] || "—",
  );
}
