import { RoboticsSimpleModulePage } from "@/components/app/robotics-simple-module-page";

export default function TrialLessonsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsSimpleModulePage moduleKey="trial-lessons" searchParams={searchParams} />;
}
