import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function TrialLessonsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="trial-lessons" searchParams={searchParams} />;
}

