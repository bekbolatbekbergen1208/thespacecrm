import { RoboticsSimpleModulePage } from "@/components/app/robotics-simple-module-page";

export default function FeedbackPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string; mentor?: string }> }) {
  return <RoboticsSimpleModulePage moduleKey="feedback" searchParams={searchParams} />;
}
