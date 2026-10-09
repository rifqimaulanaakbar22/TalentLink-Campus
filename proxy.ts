// Pengecekan cepat (optimistic) sebelum request masuk ke aplikasi, sesuai panduan autentikasi Next 16.
// Proxy hanya melihat ada tidaknya cookie sesi, tanpa query database.
// Validasi sesi yang sebenarnya: getCurrentUser() di layout dan handle() di setiap Route Handler.
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_MSG, SESSION_COOKIE } from "./lib/auth-types";

const PUBLIC_PAGES = new Set(["/login"]);
const PUBLIC_API = new Set(["/api/auth/login", "/api/auth/logout"]);

/** Teruskan pathname ke Server Component (layout) lewat header request. */
function pass(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-tl-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.has(pathname) || hasSession) return NextResponse.next();
    return NextResponse.json({ error: AUTH_MSG.needLogin }, { status: 401 });
  }

  if (PUBLIC_PAGES.has(pathname) || hasSession) return pass(req);

  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Lewati aset statis dan gambar.
  matcher: ["/((?!_next/static|_next/image|favicon\.ico|mascots/|.*\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
