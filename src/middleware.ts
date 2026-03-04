import { NextRequest, NextResponse } from "next/server"

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
const PROTECTED = ["/dashboard", "/budget"]
const AUTH_ONLY = ["/login"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ambil session cookie yang kita set sendiri
  const session = req.cookies.get("kostmate_session")?.value

  const isLoggedIn = session === "active"

  // ── kalau akses /dashboard atau /budget tanpa session → redirect /login
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // ── kalau sudah login tapi akses /login → redirect /dashboard
  const isAuthPage = AUTH_ONLY.some(p => pathname.startsWith(p))
  if (isAuthPage && isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/budget/:path*", "/login"],
}