import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function SchedulePage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="schedule" searchParams={searchParams} />;
}

