import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function GroupsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="groups" searchParams={searchParams} />;
}

