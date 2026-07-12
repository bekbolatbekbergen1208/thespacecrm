import { RoboticsModulePage } from "@/components/app/robotics-module-page";

export default function RoboticsInventoryPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsModulePage moduleKey="inventory" searchParams={searchParams} />;
}

