"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, ArrowLeft, Sparkles, Coffee,
  Bus, ShoppingBag, Gamepad2, BookOpen,
  Zap, AlertTriangle, Check, TrendingUp,
  TrendingDown, Calendar
} from "lucide-react"
import { useRouter } from "next/navigation"
import { onUserChanged } from "@/lib/firebase"
import clsx from "clsx"

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Transaksi {
  id: string
  user_id: string
  nama: string
  nominal: number
  kategori: string
  tanggal: string
  budget: number | null
  ai_insight: string | null
  created_at: string
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const KATEGORI = [
  { value: "makan",     label: "Makan & Minum", icon: Coffee,      suggested: 0.40 },
  { value: "transport", label: "Transport",      icon: Bus,         suggested: 0.15 },
  { value: "belanja",   label: "Belanja",        icon: ShoppingBag, suggested: 0.15 },
  { value: "hiburan",   label: "Hiburan",        icon: Gamepad2,    suggested: 0.10 },
  { value: "kuliah",    label: "Kuliah",         icon: BookOpen,    suggested: 0.10 },
  { value: "lainnya",   label: "Lainnya",        icon: Zap,         suggested: 0.10 },
]

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.42, ease: EASE, delay: i * 0.07 }
  }),
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const router = useRouter()

  // auth
  const [userId,    setUserId]    = useState<string | null>(null)
  const [userName,  setUserName]  = useState("Kamu")
  const [isGuest,   setIsGuest]   = useState(false)
  const [durasi,    setDurasi]    = useState("beberapa bulan")
  const [authReady, setAuthReady] = useState(false)

  // data dari supabase
  const [transaksi,  setTransaksi]  = useState<Transaksi[]>([])
  const [loading,    setLoading]    = useState(true)

  // budget input
  const [budgetInput,  setBudgetInput]  = useState("500000")
  const [savingBudget, setSavingBudget] = useState(false)
  const [savedOk,      setSavedOk]      = useState(false)
  const [budgetError,  setBudgetError]  = useState("")

  // ai
  const [insight,    setInsight]    = useState<string | null>(null)
  const [loadingAI,  setLoadingAI]  = useState(false)

  // ── AUTH ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return

    const guest = sessionStorage.getItem("is_guest")
    if (guest === "true") {
      const gNama   = sessionStorage.getItem("guest_nama")   ?? "Tamu"
      const gUid    = sessionStorage.getItem("guest_uid")    ?? "guest_anon"
      const gDurasi = sessionStorage.getItem("guest_durasi") ?? "beberapa bulan"
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

  // ── FETCH DATA DARI SUPABASE ──────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/crud?user_id=${encodeURIComponent(userId)}`)
      const json = await res.json()
      const rows: Transaksi[] = json.data ?? []
      setTransaksi(rows)

      // set budget input dari data terbaru
      const latestBudget = rows[0]?.budget
      if (latestBudget) setBudgetInput(String(latestBudget))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { if (authReady) fetchData() }, [authReady, fetchData])

  // ── KALKULASI DARI DATA NYATA ─────────────────────────────────
  const bulanKey  = new Date().toISOString().slice(0, 7)
  const bulanIni  = transaksi.filter(t => t.tanggal.startsWith(bulanKey))

  const budgetAktif = Number(bulanIni[0]?.budget ?? budgetInput ?? 500000)
  const totalPakai  = bulanIni.reduce((s, t) => s + Number(t.nominal), 0)
  const sisa        = budgetAktif - totalPakai
  const pct         = Math.min(Math.round((totalPakai / budgetAktif) * 100), 100)

  // per kategori dari data nyata
  const perKat = bulanIni.reduce<Record<string, number>>((acc, t) => {
    acc[t.kategori] = (acc[t.kategori] ?? 0) + Number(t.nominal)
    return acc
  }, {})

  // proyeksi
  const hari       = new Date().getDate()
  const totalHari  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const sisaHari   = totalHari - hari
  const rataHarian = hari > 0 ? Math.round(totalPakai / hari) : 0
  const proyeksiRp = rataHarian * totalHari
  const overBudget = proyeksiRp > budgetAktif

  // transaksi terbesar bulan ini
  const transaksiTerbesar = [...bulanIni]
    .sort((a, b) => Number(b.nominal) - Number(a.nominal))
    .slice(0, 3)

  // ── SIMPAN BUDGET BARU ────────────────────────────────────────
  const handleSaveBudget = async () => {
    const newBudget = Number(budgetInput)
    if (!newBudget || newBudget < 10000) {
      setBudgetError("Budget minimal Rp 10.000.")
      return
    }
    if (!userId) return

    setBudgetError("")
    setSavingBudget(true)

    try {
      if (bulanIni.length === 0) {
        // belum ada transaksi bulan ini — POST dummy untuk simpan budget
        await fetch("/api/crud", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id:  userId,
            nama:     "Budget awal",
            nominal:  0,
            kategori: "lainnya",
            tanggal:  new Date().toISOString().split("T")[0],
            budget:   newBudget,
          }),
        })
      } else {
        // update semua transaksi bulan ini dengan budget baru
        await Promise.all(
          bulanIni.map(t =>
            fetch("/api/crud", {
              method:  "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: t.id, user_id: userId, budget: newBudget }),
            })
          )
        )
      }

      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
      fetchData()
    } catch {
      setBudgetError("Gagal menyimpan. Coba lagi.")
    } finally {
      setSavingBudget(false)
    }
  }

  // ── AI BUDGET ADVISOR ─────────────────────────────────────────
  const handleAI = async () => {
    if (!userId) return
    setLoadingAI(true)
    setInsight(null)
    try {
      const katDetail = Object.entries(perKat)
        .map(([k, v]) => `${k} Rp ${v.toLocaleString("id-ID")}`)
        .join(", ") || "belum ada data"

      const res = await fetch("/api/core/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          input:   `Analisis alokasi budget gw. Budget Rp ${budgetAktif.toLocaleString("id-ID")}, sudah pakai Rp ${totalPakai.toLocaleString("id-ID")} (${pct}%). Per kategori: ${katDetail}. Kasih rekomendasi alokasi yang lebih optimal dan konkret buat sisa ${sisaHari} hari ini.`,
          nama:    userName,
          durasi,
          is_guest: isGuest,
        }),
      })

      const json = await res.json()
      setInsight(json.insight ?? "AI lagi tidak bisa dihubungi.")
    } catch {
      setInsight("Koneksi ke AI gagal. Cek internet kamu.")
    } finally {
      setLoadingAI(false)
    }
  }

  // ── LOADING ───────────────────────────────────────────────────
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
      <nav className="sticky top-0 z-40 bg-[#1B3A2D] px-5 py-3.5 flex items-center gap-3 shadow-lg shadow-[#1B3A2D]/20">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-8 h-8 rounded-xl bg-[#FAFAF7]/10 hover:bg-[#FAFAF7]/20 flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={15} className="text-[#FAFAF7]" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#4A7C59] flex items-center justify-center">
            <Wallet size={14} className="text-[#FAFAF7]" />
          </div>
          <div>
            <p className="text-[#FAFAF7] font-black text-sm leading-none">Budget Planner</p>
            <p className="text-[#FAFAF7]/50 text-[10px] leading-none mt-0.5">
              {userName}{isGuest && <span className="ml-1 text-[#F2C96E]">· Tamu</span>}
            </p>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* ── SET BUDGET ── */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show"
          className="bg-[#1B3A2D] rounded-2xl p-5 shadow-lg shadow-[#1B3A2D]/20">
          <p className="text-[#FAFAF7]/50 text-[10px] font-bold uppercase tracking-widest mb-3">
            Budget Bulanan
          </p>

          <div className="flex items-center gap-2.5">
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FAFAF7]/40 text-sm font-bold pointer-events-none">
                Rp
              </span>
              <input
                type="number"
                value={budgetInput}
                onChange={e => { setBudgetInput(e.target.value); setBudgetError("") }}
                onKeyDown={e => e.key === "Enter" && handleSaveBudget()}
                className="w-full bg-[#FAFAF7]/8 border border-[#FAFAF7]/10 focus:border-[#4A7C59] text-[#FAFAF7] font-black text-xl pl-10 pr-4 py-3 rounded-xl outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleSaveBudget}
              disabled={savingBudget}
              className={clsx(
                "shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-1.5",
                savedOk
                  ? "bg-[#7DB88A] text-[#FAFAF7]"
                  : "bg-[#4A7C59] hover:bg-[#7DB88A] text-[#FAFAF7] disabled:opacity-50"
              )}
            >
              {savingBudget
                ? <span className="w-3.5 h-3.5 border-2 border-[#FAFAF7]/30 border-t-[#FAFAF7] rounded-full animate-spin" />
                : savedOk ? <><Check size={13} /> Tersimpan</> : "Simpan"
              }
            </button>
          </div>

          {budgetError && (
            <p className="text-[#C4603A] text-xs font-medium mt-2">{budgetError}</p>
          )}

          {/* progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#FAFAF7]/50">Terpakai bulan ini</span>
              <span className={clsx("font-black",
                pct >= 85 ? "text-[#C4603A]" : pct >= 65 ? "text-[#E8A042]" : "text-[#7DB88A]"
              )}>{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-[#FAFAF7]/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={clsx("h-full rounded-full",
                  pct >= 85 ? "bg-gradient-to-r from-[#E8A042] to-[#C4603A]"
                  : pct >= 65 ? "bg-[#E8A042]" : "bg-[#4A7C59]"
                )}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[#FAFAF7]/35 text-[10px]">
                Rp {totalPakai.toLocaleString("id-ID")} terpakai
              </span>
              <span className="text-[#FAFAF7]/35 text-[10px]">
                Sisa Rp {Math.max(sisa, 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── PROYEKSI CARDS ── */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show"
          className="grid grid-cols-3 gap-2.5">
          {[
            {
              icon: TrendingUp,
              label: "Rata Harian",
              val: `Rp ${rataHarian.toLocaleString("id-ID")}`,
              warn: false,
            },
            {
              icon: Calendar,
              label: "Sisa Hari",
              val: `${sisaHari} hari`,
              warn: false,
            },
            {
              icon: overBudget ? TrendingDown : TrendingUp,
              label: "Proyeksi",
              val: `Rp ${proyeksiRp.toLocaleString("id-ID")}`,
              warn: overBudget,
            },
          ].map(({ icon: Icon, label, val, warn }) => (
            <div key={label} className={clsx(
              "rounded-2xl p-3.5 shadow-md",
              warn ? "bg-[#C4603A]/10 border border-[#C4603A]/20" : "bg-[#FAFAF7]"
            )}>
              <Icon size={13} className={warn ? "text-[#C4603A]" : "text-[#4A7C59]"} />
              <p className="text-[9px] font-bold text-[#8A8A7E] uppercase tracking-wider mt-1.5">{label}</p>
              <p className={clsx("font-black text-xs mt-0.5 leading-tight",
                warn ? "text-[#C4603A]" : "text-[#2D2D2A]"
              )}>{val}</p>
              {warn && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle size={9} className="text-[#C4603A]" />
                  <span className="text-[9px] text-[#C4603A] font-semibold">over budget</span>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* ── ALOKASI PER KATEGORI (DATA NYATA) ── */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show"
          className="bg-[#FAFAF7] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-[#2D2D2A] text-sm">Alokasi Per Kategori</h2>
            <span className="text-[10px] text-[#8A8A7E]">bulan ini · data nyata</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-12 rounded-xl bg-[#E8DCC8] animate-pulse" />
              ))}
            </div>
          ) : bulanIni.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#8A8A7E] text-sm font-medium">Belum ada transaksi bulan ini.</p>
              <p className="text-[#8A8A7E] text-xs mt-1">Tambah dulu di dashboard.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {KATEGORI.map(({ value, label, icon: Icon, suggested }, i) => {
                const pakai       = perKat[value] ?? 0
                const pctKat      = budgetAktif > 0 ? Math.min(Math.round((pakai / budgetAktif) * 100), 100) : 0
                const suggestedRp = Math.round(budgetAktif * suggested)
                const over        = pakai > suggestedRp && pakai > 0
                const ada         = pakai > 0

                return (
                  <motion.div key={value} variants={fadeUp} custom={i} initial="hidden" animate="show">
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                        over ? "bg-[#C4603A]/10" : ada ? "bg-[#F5F0E8]" : "bg-[#F5F0E8]"
                      )}>
                        <Icon size={14} className={over ? "text-[#C4603A]" : ada ? "text-[#4A7C59]" : "text-[#8A8A7E]"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#2D2D2A]">{label}</span>
                          <div className="flex items-center gap-2">
                            {over && (
                              <span className="text-[9px] font-bold text-[#C4603A] bg-[#C4603A]/10 px-1.5 py-0.5 rounded-full">
                                over
                              </span>
                            )}
                            <span className={clsx("text-xs font-black",
                              over ? "text-[#C4603A]" : ada ? "text-[#2D2D2A]" : "text-[#8A8A7E]"
                            )}>
                              {ada ? `Rp ${pakai.toLocaleString("id-ID")}` : "Rp 0"}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-[#8A8A7E]">
                            Ideal: Rp {suggestedRp.toLocaleString("id-ID")} ({Math.round(suggested * 100)}%)
                          </span>
                          <span className={clsx("text-[10px] font-semibold",
                            over ? "text-[#C4603A]" : "text-[#8A8A7E]"
                          )}>
                            {pctKat}% dari budget
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* progress bar */}
                    <div className="ml-11 h-1.5 rounded-full bg-[#E8DCC8] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pctKat}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: i * 0.08 }}
                        className={clsx("h-full rounded-full",
                          over    ? "bg-gradient-to-r from-[#E8A042] to-[#C4603A]"
                          : ada   ? "bg-[#4A7C59]"
                          :         "bg-[#E8DCC8]"
                        )}
                      />
                    </div>

                    {/* ideal marker — garis putus */}
                    <div className="ml-11 relative h-0 mt-[-3px]">
                      <div
                        style={{ left: `${Math.round(suggested * 100)}%` }}
                        className="absolute w-0.5 h-3 bg-[#8A8A7E]/30 rounded-full -translate-x-1/2 -top-1.5"
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* ── TRANSAKSI TERBESAR ── */}
        {transaksiTerbesar.length > 0 && (
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show"
            className="bg-[#FAFAF7] rounded-2xl p-5 shadow-md">
            <h2 className="font-black text-[#2D2D2A] text-sm mb-3">Pengeluaran Terbesar</h2>
            <div className="space-y-2.5">
              {transaksiTerbesar.map((t, i) => {
                const Icon = KATEGORI.find(k => k.value === t.kategori)?.icon ?? Zap
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#8A8A7E] w-4 shrink-0">#{i+1}</span>
                    <div className="w-7 h-7 rounded-lg bg-[#F5F0E8] flex items-center justify-center shrink-0">
                      <Icon size={12} className="text-[#4A7C59]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#2D2D2A] truncate">{t.nama}</p>
                      <p className="text-[10px] text-[#8A8A7E]">{t.tanggal} · {t.kategori}</p>
                    </div>
                    <p className="font-black text-sm text-[#2D2D2A] shrink-0">
                      Rp {Number(t.nominal).toLocaleString("id-ID")}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── ALOKASI IDEAL REFERENSI ── */}
        <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show"
          className="bg-[#E8DCC8] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[#4A7C59]" />
            <h3 className="font-bold text-[#2D2D2A] text-sm">Referensi Alokasi Ideal</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {KATEGORI.map(({ value, label, icon: Icon, suggested }) => (
              <div key={value} className="bg-[#FAFAF7] rounded-xl px-3 py-2.5 flex items-center gap-2">
                <Icon size={12} className="text-[#4A7C59] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#2D2D2A] truncate">{label}</p>
                  <p className="text-[10px] text-[#8A8A7E]">
                    {Math.round(suggested * 100)}% · Rp {Math.round(budgetAktif * suggested).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── AI BUDGET ADVISOR ── */}
        <motion.div variants={fadeUp} custom={5} initial="hidden" animate="show"
          className="bg-[#1B3A2D] rounded-2xl p-5 shadow-lg shadow-[#1B3A2D]/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#4A6B8A] flex items-center justify-center">
              <Sparkles size={13} className="text-[#FAFAF7]" />
            </div>
            <span className="text-[#FAFAF7] font-bold text-sm">AI Budget Advisor</span>
            <span className="ml-auto text-[9px] font-mono text-[#FAFAF7]/25 tracking-wider">llama-3.2-3b</span>
          </div>

          <p className="text-[#FAFAF7]/40 text-xs mb-3 leading-relaxed">
            AI analisis pola pengeluaran nyata kamu dan kasih saran alokasi yang lebih optimal buat sisa bulan ini.
          </p>

          <button
            onClick={handleAI}
            disabled={loadingAI || bulanIni.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#4A7C59] hover:bg-[#7DB88A] disabled:opacity-40 text-[#FAFAF7] py-3 rounded-xl text-sm font-bold transition-colors duration-200"
          >
            {loadingAI
              ? <><span className="w-3.5 h-3.5 border-2 border-[#FAFAF7]/30 border-t-[#FAFAF7] rounded-full animate-spin" /> Menganalisis...</>
              : <><Sparkles size={14} /> Minta Saran AI</>
            }
          </button>

          {bulanIni.length === 0 && !loadingAI && (
            <p className="text-[#FAFAF7]/30 text-[10px] text-center mt-2">
              Tambah transaksi dulu di dashboard biar AI punya data untuk dianalisis.
            </p>
          )}

          <AnimatePresence>
            {insight && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 bg-[#FAFAF7]/6 border border-[#FAFAF7]/10 rounded-xl p-4"
              >
                <p className="text-[#FAFAF7]/85 text-sm leading-relaxed whitespace-pre-line">{insight}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="h-4" />
      </div>
    </div>
  )
}