import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function FeedbackPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string; mentor?: string }> }) {
  return <RoboticsModulePage moduleKey="feedback" searchParams={searchParams} />;
}
