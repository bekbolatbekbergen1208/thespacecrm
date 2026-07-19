import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", request.nextUrl.pathname);

  if (!hasSupabaseConfig()) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}
