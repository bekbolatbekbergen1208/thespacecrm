import { RoboticsSimpleModulePage } from "@/components/app/robotics-simple-module-page";

export default function RoboticsInventoryPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsSimpleModulePage moduleKey="inventory" searchParams={searchParams} />;
}
