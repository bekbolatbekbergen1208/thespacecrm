import { isLocalPreview } from "@/lib/local-preview";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (isLocalPreview()) {
    const path = request.nextUrl.pathname;
    if (
      path === "/" ||
      path === "/dashboard" ||
      path.startsWith("/dashboard/education")
    ) {
      const section = path.split("/")[3] || "";
      const mapping: Record<string, string> = {
        mentors: "team",
        "mentor-journal": "schedule",
        salaries: "team",
        learning: "methods",
        "trial-lessons": "schedule",
        subscriptions: "payments",
        families: "students",
        reports: "overview",
        settings: "team",
        contract: "contracts",
      };
      return NextResponse.redirect(
        new URL(`/workspace/${mapping[section] || section}`, request.url),
      );
    }
    if (
      [
        "/",
        "/login",
        "/signup",
        "/auth",
        "/onboarding",
        "/setup",
        "/forgot-password",
        "/reset-password",
      ].some(
        (route) =>
          path === route || (route !== "/" && path.startsWith(`${route}/`)),
      )
    ) {
      return NextResponse.redirect(new URL("/workspace", request.url));
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-current-path", path);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (request.nextUrl.pathname === "/setup") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
