import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function SchedulePage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string; mentor?: string; room?: string; date?: string; view?: "day" | "week" | "month" }> }) {
  return <RoboticsModulePage moduleKey="schedule" searchParams={searchParams} />;
}
