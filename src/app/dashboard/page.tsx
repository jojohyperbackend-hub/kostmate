"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, Plus, Trash2, Sparkles, LogOut,
  Coffee, Bus, ShoppingBag, Gamepad2,
  BookOpen, Zap, X, Check, Pencil,
  ChevronRight, TrendingUp, AlertCircle
} from "lucide-react"
import { useRouter } from "next/navigation"
import { onUserChanged, logout } from "@/lib/firebase"
import clsx from "clsx"

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Transaksi {
  id: string
  user_id: string
  nama: string
  nominal: number
  kategori: string
  tanggal: string
  catatan: string | null
  budget: number | null
  ai_insight: string | null
  created_at: string
}

interface FormState {
  nama: string
  nominal: string
  kategori: string
  tanggal: string
  catatan: string
  budget: string
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const KATEGORI = [
  { value: "makan",     label: "Makan",    icon: Coffee      },
  { value: "transport", label: "Transport", icon: Bus         },
  { value: "belanja",   label: "Belanja",   icon: ShoppingBag },
  { value: "hiburan",   label: "Hiburan",   icon: Gamepad2    },
  { value: "kuliah",    label: "Kuliah",    icon: BookOpen    },
  { value: "lainnya",   label: "Lainnya",   icon: Zap         },
]

const EMPTY_FORM: FormState = {
  nama: "", nominal: "", kategori: "makan",
  tanggal: new Date().toISOString().split("T")[0],
  catatan: "", budget: "500000",
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }
  }),
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function KatIcon({ kategori, size = 15 }: { kategori: string; size?: number }) {
  const Icon = KATEGORI.find(k => k.value === kategori)?.icon ?? Zap
  return <Icon size={size} />
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{   opacity: 0, y: 20, scale: 0.95  }}
      className={clsx(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]",
        "px-5 py-3 rounded-2xl shadow-xl text-sm font-bold text-[#FAFAF7]",
        "flex items-center gap-2 whitespace-nowrap",
        type === "ok" ? "bg-[#4A7C59]" : "bg-[#C4603A]"
      )}
    >
      {type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
      {msg}
    </motion.div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()

  // ── auth state ───────────────────────────────────────────────
  const [userId,    setUserId]    = useState<string | null>(null)
  const [userName,  setUserName]  = useState("Kamu")
  const [isGuest,   setIsGuest]   = useState(false)
  const [durasi,    setDurasi]    = useState("beberapa bulan")
  const [authReady, setAuthReady] = useState(false)

  // ── data state ───────────────────────────────────────────────
  const [transaksi, setTransaksi] = useState<Transaksi[]>([])
  const [loading,   setLoading]   = useState(true)

  // ── form state ───────────────────────────────────────────────
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── ai state ─────────────────────────────────────────────────
  const [insight,     setInsight]     = useState<string | null>(null)
  const [insightMeta, setInsightMeta] = useState<Record<string, unknown> | null>(null)
  const [loadingAI,   setLoadingAI]   = useState(false)
  const [aiInput,     setAiInput]     = useState("")

  // ── ui state ─────────────────────────────────────────────────
  const [deleteId,      setDeleteId]      = useState<string | null>(null)
  const [showLogoutConf,setShowLogoutConf] = useState(false)
  const [toast,         setToast]         = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  // ── toast helper ─────────────────────────────────────────────
  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── form helpers ─────────────────────────────────────────────
  const openForm = (t?: Transaksi) => {
    setForm(t ? {
      nama:    t.nama,
      nominal: String(t.nominal),
      kategori:t.kategori,
      tanggal: t.tanggal,
      catatan: t.catatan ?? "",
      budget:  String(t.budget ?? 500000),
    } : EMPTY_FORM)
    setEditId(t?.id ?? null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  // ── AUTH ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return

    const guest = sessionStorage.getItem("is_guest")
    if (guest === "true") {
      const gNama  = sessionStorage.getItem("guest_nama")   ?? "Tamu"
      const gUid   = sessionStorage.getItem("guest_uid")    ?? "guest_anon"
      const gDurasi= sessionStorage.getItem("guest_durasi") ?? "beberapa bulan"
      setUserId(gUid)
      setUserName(gNama)
      setIsGuest(true)
      setDurasi(gDurasi)
      setAuthReady(true)
      return
    }

    const unsub = onUserChanged((user) => {
      if (!user) { router.replace("/login"); return }
      setUserId(user.uid)
      setUserName(user.displayName?.split(" ")[0] ?? "Kamu")
      setAuthReady(true)
    })
    return unsub
  }, [router])

  // ── FETCH DATA ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/crud?user_id=${encodeURIComponent(userId)}`)
      const json = await res.json()
      setTransaksi(json.data ?? [])
    } catch {
      showToast("Gagal memuat data.", "err")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { if (authReady) fetchData() }, [authReady, fetchData])

  // ── KALKULASI ─────────────────────────────────────────────────
  const bulanKey = new Date().toISOString().slice(0, 7)
  const bulanIni = transaksi.filter(t => t.tanggal.startsWith(bulanKey))
  const budget   = Number(bulanIni[0]?.budget ?? 500000)
  const total    = bulanIni.reduce((s, t) => s + Number(t.nominal), 0)
  const sisa     = budget - total
  const pct      = Math.min(Math.round((total / budget) * 100), 100)

  const perKat = bulanIni.reduce<Record<string, number>>((acc, t) => {
    acc[t.kategori] = (acc[t.kategori] ?? 0) + Number(t.nominal)
    return acc
  }, {})

  // ── SUBMIT FORM ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.nama.trim()) { showToast("Nama wajib diisi.",    "err"); return }
    if (!form.nominal)     { showToast("Nominal wajib diisi.", "err"); return }
    if (!form.tanggal)     { showToast("Tanggal wajib diisi.", "err"); return }
    if (!userId)           { showToast("Belum login.",         "err"); return }

    setSubmitting(true)
    try {
      const payload = {
        user_id:  userId,
        nama:     form.nama.trim(),
        nominal:  Number(form.nominal),
        kategori: form.kategori,
        tanggal:  form.tanggal,
        catatan:  form.catatan.trim() || null,
        budget:   Number(form.budget) || 500000,
        ...(editId ? { id: editId } : {}),
      }

      const res = await fetch("/api/crud", {
        method:  editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()
      showToast(editId ? "Transaksi diperbarui." : "Berhasil ditambahkan.", "ok")
      closeForm()
      fetchData()
    } catch {
      showToast("Gagal menyimpan. Coba lagi.", "err")
    } finally {
      setSubmitting(false)
    }
  }

  // ── DELETE ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!userId) return
    try {
      const res = await fetch(
        `/api/crud?id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error()
      showToast("Transaksi dihapus.", "ok")
      fetchData()
    } catch {
      showToast("Gagal menghapus.", "err")
    } finally {
      setDeleteId(null)
    }
  }

  // ── AI ────────────────────────────────────────────────────────
  const handleAI = async () => {
    if (!userId) { showToast("Belum login.", "err"); return }
    setLoadingAI(true)
    setInsight(null)
    setInsightMeta(null)
    try {
      const res = await fetch("/api/core/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:  userId,
          input:    aiInput.trim() || "analisis pengeluaran gw bulan ini",
          nama:     userName,
          durasi,
          is_guest: isGuest,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setInsight("AI sedang tidak bisa dihubungi. Coba beberapa saat lagi."); return }
      setInsight(json.insight ?? "Tidak ada insight.")
      setInsightMeta(json.meta ?? null)
    } catch {
      setInsight("Koneksi ke AI gagal. Cek internet kamu.")
    } finally {
      setLoadingAI(false)
    }
  }

  // ── LOGOUT ────────────────────────────────────────────────────
  // guest: hapus semua data di Supabase + sessionStorage + cookie
  // google: logout firebase + clear cookie
  const handleLogout = async () => {
    if (isGuest && userId) {
      try {
        // hapus semua data guest dari Supabase
        const rows = await fetch(`/api/crud?user_id=${encodeURIComponent(userId)}`)
        const json = await rows.json()
        const ids: string[] = (json.data ?? []).map((r: Transaksi) => r.id)

        // delete satu per satu
        await Promise.all(
          ids.map(id =>
            fetch(`/api/crud?id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(userId)}`, {
              method: "DELETE",
            })
          )
        )
      } catch { /* silent — tetap logout */ }

      // hapus sessionStorage
      sessionStorage.clear()

      // hapus cookie session
      await fetch("/api/session", { method: "DELETE" })

      router.replace("/login")
      return
    }

    // google logout
    try {
      await logout()
    } catch { /* silent */ }

    await fetch("/api/session", { method: "DELETE" })
    router.replace("/login")
  }

  // ── LOADING AUTH ─────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#4A7C59]/20 border-t-[#4A7C59] rounded-full animate-spin" />
      </div>
    )
  }

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F0E8]">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-40 bg-[#1B3A2D] px-5 py-3.5 flex items-center justify-between shadow-lg shadow-[#1B3A2D]/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#4A7C59] flex items-center justify-center shadow-md">
            <Wallet size={16} className="text-[#FAFAF7]" />
          </div>
          <div>
            <p className="text-[#FAFAF7] font-black text-sm leading-none tracking-tight">KostMate</p>
            <p className="text-[#FAFAF7]/50 text-[10px] leading-none mt-0.5">
              Hei, {userName}
              {isGuest && <span className="ml-1 text-[#F2C96E]">· Tamu</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push("/budget")}
            className="flex items-center gap-1 text-[#FAFAF7]/70 hover:text-[#FAFAF7] text-xs font-semibold px-3 py-2 rounded-xl hover:bg-[#FAFAF7]/10 transition-all duration-200"
          >
            Budget <ChevronRight size={12} />
          </button>
          <button
            onClick={() => setShowLogoutConf(true)}
            className="flex items-center gap-1.5 text-[#FAFAF7]/50 hover:text-[#FAFAF7] px-2.5 py-2 rounded-xl hover:bg-[#FAFAF7]/10 transition-all duration-200"
          >
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* ── SUMMARY CARDS ── */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show"
          className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Budget",   val: `Rp ${(budget/1000).toFixed(0)}rb`, sub: "bulan ini",              bg: "bg-[#1B3A2D]", text: "text-[#FAFAF7]"  },
            { label: "Terpakai", val: `Rp ${(total/1000).toFixed(0)}rb`,  sub: `${pct}%`,                bg: "bg-[#FAFAF7]", text: "text-[#2D2D2A]"  },
            { label: "Sisa",     val: `Rp ${(Math.abs(sisa)/1000).toFixed(0)}rb`, sub: sisa < 0 ? "over!" : "aman",
              bg: sisa < 0 ? "bg-[#C4603A]" : "bg-[#4A7C59]", text: "text-[#FAFAF7]" },
          ].map(({ label, val, sub, bg, text }) => (
            <div key={label} className={clsx("rounded-2xl p-4 shadow-md", bg)}>
              <p className={clsx("text-[9px] font-bold uppercase tracking-widest mb-1.5 opacity-50", text)}>{label}</p>
              <p className={clsx("font-black text-base leading-none", text)}>{val}</p>
              <p className={clsx("text-[10px] mt-1 opacity-60 font-medium", text)}>{sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ── PROGRESS BUDGET ── */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show"
          className="bg-[#FAFAF7] rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#2D2D2A]">Progress Bulan Ini</span>
            <span className={clsx("text-xs font-black",
              pct >= 85 ? "text-[#C4603A]" : pct >= 65 ? "text-[#E8A042]" : "text-[#4A7C59]"
            )}>{pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#E8DCC8] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
              className={clsx("h-full rounded-full",
                pct >= 85 ? "bg-gradient-to-r from-[#E8A042] to-[#C4603A]"
                : pct >= 65 ? "bg-[#E8A042]" : "bg-[#4A7C59]"
              )}
            />
          </div>
          {Object.keys(perKat).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(perKat).sort((a, b) => b[1] - a[1]).map(([kat, val]) => (
                <span key={kat} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#F5F0E8] text-[#2D2D2A] px-2.5 py-1 rounded-full">
                  <KatIcon kategori={kat} size={10} />
                  {kat} · Rp {(val/1000).toFixed(0)}rb
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── AI MENTOR ── */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show"
          className="bg-[#1B3A2D] rounded-2xl p-4 shadow-lg shadow-[#1B3A2D]/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#4A6B8A] flex items-center justify-center shrink-0">
              <Sparkles size={13} className="text-[#FAFAF7]" />
            </div>
            <span className="text-[#FAFAF7] font-bold text-sm">AI Mentor</span>
            <span className="ml-auto text-[9px] font-mono text-[#FAFAF7]/25 tracking-wider">llama-3.2-3b</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loadingAI && handleAI()}
              placeholder="Tanya atau biarkan kosong untuk analisis otomatis..."
              className="flex-1 min-w-0 bg-[#FAFAF7]/8 border border-[#FAFAF7]/10 focus:border-[#4A6B8A] text-[#FAFAF7] placeholder-[#FAFAF7]/25 text-xs px-3 py-2.5 rounded-xl outline-none transition-colors"
            />
            <button
              onClick={handleAI}
              disabled={loadingAI}
              className="shrink-0 bg-[#4A7C59] hover:bg-[#7DB88A] disabled:opacity-50 text-[#FAFAF7] px-4 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center gap-1.5"
            >
              {loadingAI
                ? <span className="w-3.5 h-3.5 border-2 border-[#FAFAF7]/30 border-t-[#FAFAF7] rounded-full animate-spin" />
                : <Sparkles size={12} />
              }
              {loadingAI ? "..." : "Analisis"}
            </button>
          </div>

          <AnimatePresence>
            {insight && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-3 bg-[#FAFAF7]/6 border border-[#FAFAF7]/10 rounded-xl p-4"
              >
                <p className="text-[#FAFAF7]/85 text-sm leading-relaxed whitespace-pre-line">{insight}</p>
                {insightMeta && (
                  <div className="mt-3 pt-3 border-t border-[#FAFAF7]/10 flex flex-wrap gap-2">
                    {[
                      ["Rata harian", `Rp ${Number(insightMeta.rata_harian).toLocaleString("id-ID")}`],
                      ["Terboros",    insightMeta.kategori_terboros as string],
                    ].map(([k, v]) => v && (
                      <span key={String(k)} className="text-[10px] text-[#FAFAF7]/35 bg-[#FAFAF7]/5 px-2.5 py-1 rounded-lg">
                        {k}: <span className="text-[#F2C96E] font-bold">{v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── ADD BUTTON ── */}
        <motion.button
          variants={fadeUp} custom={3} initial="hidden" animate="show"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => openForm()}
          className="w-full flex items-center justify-center gap-2 bg-[#4A7C59] hover:bg-[#7DB88A] text-[#FAFAF7] font-bold py-3.5 rounded-2xl transition-colors duration-300 shadow-md shadow-[#4A7C59]/20"
        >
          <Plus size={16} /> Tambah Pengeluaran
        </motion.button>

        {/* ── TRANSAKSI LIST ── */}
        <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#2D2D2A] text-sm tracking-tight">Transaksi Bulan Ini</h2>
            <span className="text-[10px] text-[#8A8A7E] font-medium">{bulanIni.length} transaksi</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-[66px] rounded-2xl bg-[#E8DCC8] animate-pulse" />)}
            </div>
          ) : bulanIni.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#E8DCC8] flex items-center justify-center">
                <TrendingUp size={22} className="text-[#8A8A7E]" />
              </div>
              <div>
                <p className="text-[#2D2D2A] font-bold text-sm">Belum ada transaksi</p>
                <p className="text-[#8A8A7E] text-xs mt-0.5">Tap tombol di atas untuk mulai catat.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {bulanIni.map((t, i) => (
                  <motion.div
                    key={t.id}
                    layout
                    variants={fadeUp} custom={i}
                    initial="hidden" animate="show"
                    exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
                    whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                    className="bg-[#FAFAF7] rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#F5F0E8] flex items-center justify-center shrink-0 text-[#4A7C59]">
                      <KatIcon kategori={t.kategori} size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-[#2D2D2A] text-sm truncate leading-tight">{t.nama}</p>
                        <p className="font-black text-[#2D2D2A] text-sm shrink-0 leading-tight">
                          Rp {Number(t.nominal).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-[#F5F0E8] text-[#8A8A7E] px-2 py-0.5 rounded-full font-medium capitalize">{t.kategori}</span>
                        <span className="text-[10px] text-[#8A8A7E]">{t.tanggal}</span>
                        {t.catatan && <span className="text-[10px] text-[#8A8A7E] truncate">{t.catatan}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => openForm(t)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#E8DCC8] transition-colors">
                        <Pencil size={11} className="text-[#8A8A7E]" />
                      </button>
                      <button onClick={() => setDeleteId(t.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#C4603A]/10 transition-colors">
                        <Trash2 size={11} className="text-[#C4603A]" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
        <div className="h-4" />
      </div>

      {/* ── FORM MODAL ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1B3A2D]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closeForm()}
          >
            <motion.div
              initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md bg-[#FAFAF7] rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-[#2D2D2A] text-lg">{editId ? "Edit Transaksi" : "Tambah Pengeluaran"}</h3>
                <button onClick={closeForm} className="w-8 h-8 rounded-xl bg-[#E8DCC8] hover:bg-[#ddd0b8] flex items-center justify-center transition-colors">
                  <X size={14} className="text-[#2D2D2A]" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">Nama Item</label>
                  <input type="text" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                    placeholder="Nasi goreng, GrabBike..." autoFocus
                    className="w-full bg-[#E8DCC8] text-[#2D2D2A] placeholder-[#8A8A7E] text-sm px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">Nominal (Rp)</label>
                    <input type="number" value={form.nominal} onChange={e => setForm(f => ({ ...f, nominal: e.target.value }))}
                      placeholder="15000"
                      className="w-full bg-[#E8DCC8] text-[#2D2D2A] placeholder-[#8A8A7E] text-sm px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">Budget Bulanan</label>
                    <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                      placeholder="500000"
                      className="w-full bg-[#E8DCC8] text-[#2D2D2A] placeholder-[#8A8A7E] text-sm px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">Kategori</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {KATEGORI.map(({ value, label, icon: Icon }) => (
                      <button key={value} onClick={() => setForm(f => ({ ...f, kategori: value }))}
                        className={clsx("flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                          form.kategori === value ? "bg-[#1B3A2D] text-[#FAFAF7] shadow-md" : "bg-[#E8DCC8] text-[#2D2D2A] hover:bg-[#ddd0b8]"
                        )}>
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">Tanggal</label>
                    <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                      className="w-full bg-[#E8DCC8] text-[#2D2D2A] text-sm px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">Catatan</label>
                    <input type="text" value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                      placeholder="Opsional..."
                      className="w-full bg-[#E8DCC8] text-[#2D2D2A] placeholder-[#8A8A7E] text-sm px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 mt-5">
                <button onClick={closeForm} className="flex-1 py-3 rounded-xl bg-[#E8DCC8] hover:bg-[#ddd0b8] text-[#2D2D2A] text-sm font-bold transition-colors">Batal</button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#4A7C59] hover:bg-[#7DB88A] disabled:opacity-60 text-[#FAFAF7] text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-[#FAFAF7]/30 border-t-[#FAFAF7] rounded-full animate-spin" />
                    : <><Check size={14} /> {editId ? "Simpan" : "Tambah"}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1B3A2D]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#FAFAF7] rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#C4603A]/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-[#C4603A]" />
              </div>
              <h3 className="font-black text-[#2D2D2A] text-base mb-1">Hapus transaksi?</h3>
              <p className="text-[#8A8A7E] text-xs mb-5 leading-relaxed">Data ini tidak bisa dikembalikan.</p>
              <div className="flex gap-2.5">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl bg-[#E8DCC8] text-[#2D2D2A] text-sm font-bold hover:bg-[#ddd0b8] transition-colors">Batal</button>
                <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-[#C4603A] hover:bg-[#b55535] text-[#FAFAF7] text-sm font-bold transition-colors">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LOGOUT CONFIRM ── */}
      <AnimatePresence>
        {showLogoutConf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1B3A2D]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#FAFAF7] rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#1B3A2D] flex items-center justify-center mx-auto mb-4">
                <LogOut size={20} className="text-[#FAFAF7]" />
              </div>
              <h3 className="font-black text-[#2D2D2A] text-base mb-1">
                {isGuest ? "Keluar & hapus data?" : "Keluar dari KostMate?"}
              </h3>
              <p className="text-[#8A8A7E] text-xs mb-5 leading-relaxed">
                {isGuest
                  ? "Karena kamu tamu, semua data transaksi yang sudah diinput akan dihapus permanen dan tidak bisa dikembalikan."
                  : "Data kamu tetap tersimpan dan bisa diakses lagi saat login."
                }
              </p>
              {isGuest && (
                <div className="bg-[#C4603A]/8 border border-[#C4603A]/20 rounded-xl p-3 mb-4">
                  <p className="text-[#C4603A] text-[11px] font-semibold">
                    {bulanIni.length} transaksi akan dihapus permanen.
                  </p>
                </div>
              )}
              <div className="flex gap-2.5">
                <button onClick={() => setShowLogoutConf(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#E8DCC8] text-[#2D2D2A] text-sm font-bold hover:bg-[#ddd0b8] transition-colors">
                  Batal
                </button>
                <button onClick={handleLogout}
                  className={clsx("flex-1 py-2.5 rounded-xl text-[#FAFAF7] text-sm font-bold transition-colors",
                    isGuest ? "bg-[#C4603A] hover:bg-[#b55535]" : "bg-[#1B3A2D] hover:bg-[#2d5c47]"
                  )}>
                  {isGuest ? "Hapus & Keluar" : "Keluar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>

    </div>
  )
}