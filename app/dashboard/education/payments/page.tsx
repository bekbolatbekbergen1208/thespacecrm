import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="payments" searchParams={searchParams} />;
}

