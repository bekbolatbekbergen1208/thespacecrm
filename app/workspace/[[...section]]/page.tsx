import { redirect } from "next/navigation";
import { getAccount } from "@/lib/center/session";
import { readState } from "@/lib/center/service";
import { CenterWorkspace } from "@/components/center/workspace";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function Workspace({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ student?: string }>;
}) {
  if (process.env.NODE_ENV !== "development")
    return <p>Жергілікті CRM development режимінде ашылады.</p>;
  const account = await getAccount();
  if (!account) redirect("/workspace/login");
  const { section } = await params;
  const allowed = [
    "overview",
    "students",
    "team",
    "groups",
    "schedule",
    "attendance",
    "methods",
    "tasks",
    "payments",
    "messages",
    "reports",
    "contracts",
  ];
  const sectionName = section?.[0] ?? "overview";
  if ((section?.length ?? 0) > 1 || !allowed.includes(sectionName))
    redirect("/workspace");
  if (
    account.role !== "admin" &&
    ["team", "payments", "contracts"].includes(sectionName)
  )
    redirect("/workspace");
  return (
    <CenterWorkspace
      initial={await readState(account)}
      section={sectionName}
      initialStudentId={(await searchParams).student}
    />
  );
}
