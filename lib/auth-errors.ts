export function formatAuthError(error?: string) {
  if (!error) return undefined;

  const normalized = error.toLowerCase();

  if (normalized.includes("passwords do not match")) {
    return "Пароли не совпадают. Введите одинаковый пароль в оба поля.";
  }

  if (normalized.includes("password must be at least 8 characters")) {
    return "Пароль должен быть минимум 8 символов.";
  }

  if (normalized.includes("email rate limit")) {
    return "Supabase временно заблокировал отправку email. Подождите 1-5 минут или выключите подтверждение email в Supabase: Authentication > Providers > Email > Confirm email.";
  }

  if (normalized.includes("email signups are disabled")) {
    return "Регистрация через email выключена в Supabase. Включите Email provider и регистрацию новых пользователей в Authentication > Providers > Email.";
  }

  if (normalized.includes("only request this after")) {
    return "Подождите немного перед повторной попыткой. Supabase временно ограничил отправку email.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Email ещё не подтверждён. Подтвердите письмо из почты или выключите Confirm email в Supabase для разработки.";
  }

  if (normalized.includes("fetch failed")) {
    return "CRM не может подключиться к Supabase. Проверьте NEXT_PUBLIC_SUPABASE_URL и интернет.";
  }

  return error;
}
