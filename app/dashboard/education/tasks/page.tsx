import { RoboticsSimpleModulePage } from "@/components/app/robotics-simple-module-page";

export default function RoboticsTasksPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsSimpleModulePage moduleKey="tasks" searchParams={searchParams} />;
}
