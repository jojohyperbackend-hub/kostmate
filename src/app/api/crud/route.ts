import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// ─── GET — ambil semua transaksi by user_id ───────────────────────────────────
export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get("user_id")

  if (!user_id) {
    return NextResponse.json({ error: "user_id wajib diisi" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("kosmate")
    .select("*")
    .eq("user_id", user_id)
    .order("tanggal", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 200 })
}

// ─── POST — tambah transaksi baru ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, nama, nominal, kategori, tanggal, catatan, budget } = body

  if (!user_id || !nama || !nominal || !kategori || !tanggal) {
    return NextResponse.json({ error: "Field wajib: user_id, nama, nominal, kategori, tanggal" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("kosmate")
    .insert([{
      user_id,
      nama,
      nominal,
      kategori,
      tanggal,
      catatan: catatan ?? null,
      budget: budget ?? null,
      ai_insight: null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

// ─── PUT — edit transaksi by id ───────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, user_id, nama, nominal, kategori, tanggal, catatan, budget, ai_insight } = body

  if (!id || !user_id) {
    return NextResponse.json({ error: "id dan user_id wajib diisi" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("kosmate")
    .update({ nama, nominal, kategori, tanggal, catatan, budget, ai_insight })
    .eq("id", id)
    .eq("user_id", user_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 200 })
}

// ─── DELETE — hapus transaksi by id ──────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  const user_id = req.nextUrl.searchParams.get("user_id")

  if (!id || !user_id) {
    return NextResponse.json({ error: "id dan user_id wajib diisi" }, { status: 400 })
  }

  const { error } = await supabase
    .from("kosmate")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: "Transaksi berhasil dihapus" }, { status: 200 })
}