import { NextRequest, NextResponse } from "next/server"

// ── POST /api/session → set cookie (login)
// ── DELETE /api/session → clear cookie (logout)

const COOKIE_NAME = "kostmate_session"
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 hari
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { user_id, nama } = body

  if (!user_id) {
    return NextResponse.json({ error: "user_id wajib" }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, "active", COOKIE_OPTS)
  res.cookies.set("kostmate_uid", String(user_id), { ...COOKIE_OPTS, httpOnly: false })
  res.cookies.set("kostmate_nama", String(nama ?? "Kamu"), { ...COOKIE_OPTS, httpOnly: false })

  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE_NAME)
  res.cookies.delete("kostmate_uid")
  res.cookies.delete("kostmate_nama")
  return res
}