import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function StudentsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="students" searchParams={searchParams} />;
}

