import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function AttendancePage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="attendance" searchParams={searchParams} />;
}

