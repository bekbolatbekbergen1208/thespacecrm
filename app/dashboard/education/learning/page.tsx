import { RoboticsSimpleModulePage } from "@/components/app/robotics-simple-module-page";

export default function LearningPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string; mentor?: string }> }) {
  return <RoboticsSimpleModulePage moduleKey="learning" searchParams={searchParams} />;
}
