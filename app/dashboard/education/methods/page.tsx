import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function MethodsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string; mentor?: string }> }) {
  return <RoboticsModulePage moduleKey="methods" searchParams={searchParams} />;
}
