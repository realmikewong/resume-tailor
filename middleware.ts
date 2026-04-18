import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from dashboard
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages — EXCEPT for routes that
  // intentionally need to be reachable while authenticated (e.g. post-login gates).
  // Add any new authenticated-accessible /auth/* routes to this list.
  const AUTH_ROUTES_ACCESSIBLE_WHEN_AUTHENTICATED = [
    "/auth/accept-terms",
  ];

  if (
    user &&
    request.nextUrl.pathname.startsWith("/auth") &&
    !AUTH_ROUTES_ACCESSIBLE_WHEN_AUTHENTICATED.includes(request.nextUrl.pathname)
  ) {
    const destination = safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/dashboard";
    // destination may include a query string (e.g. "/dashboard?tab=x"); use URL
    // parsing so pathname and search are preserved correctly and we don't
    // accidentally encode "?" into the pathname.
    const target = new URL(destination, request.nextUrl.origin);
    const url = request.nextUrl.clone();
    url.pathname = target.pathname;
    url.search = target.search;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
