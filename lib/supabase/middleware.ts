import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.next({ request });
  }

  return NextResponse.next({ request });
}
