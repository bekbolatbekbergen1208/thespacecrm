import { redirect } from "next/navigation";
import { getAccount } from "@/lib/center/session";
import { getDb } from "@/lib/center/db";
import { CenterLogin } from "@/components/center/login";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (process.env.NODE_ENV !== "development")
    return <p>Жергілікті CRM development режимінде ашылады.</p>;
  await getDb();
  if (await getAccount()) redirect("/workspace");
  return <CenterLogin />;
}
