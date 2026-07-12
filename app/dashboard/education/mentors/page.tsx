import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function MentorsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="mentors" searchParams={searchParams} />;
}

