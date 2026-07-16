import { RoboticsSimpleModulePage } from "@/components/app/robotics-simple-module-page";

export default function MentorsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsSimpleModulePage moduleKey="mentors" searchParams={searchParams} />;
}
