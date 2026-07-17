import HomePage from "@/components/home-page";
import { getServerLocale } from "@/lib/i18n-server";

export default async function Page() {
  const locale = await getServerLocale();
  return <HomePage locale={locale} />;
}
