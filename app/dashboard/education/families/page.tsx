import { RoboticsSimpleModulePage } from "@/components/app/robotics-simple-module-page";

export default function FamiliesPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; group?: string }> }) {
  return <RoboticsSimpleModulePage moduleKey="families" searchParams={searchParams} />;
}
