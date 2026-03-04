"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Chrome, User, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { loginGoogle } from "@/lib/firebase"
import clsx from "clsx"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DURASI_OPTIONS = [
  { label: "Baru masuk (< 3 bulan)",  value: "lt3"   },
  { label: "3 – 6 bulan",             value: "3to6"  },
  { label: "6 – 12 bulan",            value: "6to12" },
  { label: "Udah lama (> 1 tahun)",   value: "gt1"   },
]

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()

  // step: "pilih" | "guest-form"
  const [step,         setStep]         = useState<"pilih" | "guest-form">("pilih")
  const [nama,         setNama]         = useState("")
  const [durasi,       setDurasi]       = useState("")
  const [openDrop,     setOpenDrop]     = useState(false)
  const [loadingGoogle,setLoadingGoogle]= useState(false)
  const [loadingGuest, setLoadingGuest] = useState(false)
  const [error,        setError]        = useState("")

  const selectedDurasi = DURASI_OPTIONS.find(d => d.value === durasi)

  // ── helpers ──────────────────────────────────────────────────────────────────
  const setSession = async (user_id: string, namaUser: string) => {
    await fetch("/api/session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id, nama: namaUser }),
    })
  }

  // ── login google ─────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError("")
    setLoadingGoogle(true)
    try {
      const user = await loginGoogle()
      await setSession(user.uid, user.displayName ?? "Kamu")
      router.push("/dashboard")
    } catch {
      setError("Gagal login Google. Coba lagi.")
      setLoadingGoogle(false)
    }
  }

  // ── submit guest ──────────────────────────────────────────────────────────────
  const handleGuest = async () => {
    if (!nama.trim()) { setError("Nama wajib diisi dulu."); return }
    if (!durasi)      { setError("Pilih dulu berapa lama tinggal di kos."); return }

    setError("")
    setLoadingGuest(true)

    const uid = "guest_" + nama.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Date.now()

    // simpan ke sessionStorage untuk dipakai di dashboard
    sessionStorage.setItem("is_guest",    "true")
    sessionStorage.setItem("guest_nama",  nama.trim())
    sessionStorage.setItem("guest_durasi", durasi)
    sessionStorage.setItem("guest_uid",   uid)

    await setSession(uid, nama.trim())
    router.push("/dashboard")
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4 relative overflow-hidden">

      {/* bg blobs */}
      <div className="absolute -top-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#4A7C59]/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-[320px] h-[320px] rounded-full bg-[#E8A042]/12 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >

        {/* ── TOMBOL BACK KE LANDING ── */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-[#8A8A7E] hover:text-[#2D2D2A] text-xs font-semibold mb-6 transition-colors duration-200 group"
        >
          <div className="w-6 h-6 rounded-lg bg-[#E8DCC8] group-hover:bg-[#ddd0b8] flex items-center justify-center transition-colors">
            <ArrowLeft size={12} className="text-[#2D2D2A]" />
          </div>
          Kembali ke beranda
        </motion.button>

        {/* ── LOGO ── */}
        <div className="flex flex-col items-center mb-7">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-14 h-14 rounded-2xl bg-[#1B3A2D] flex items-center justify-center mb-4 shadow-lg shadow-[#1B3A2D]/25"
          >
            <Wallet size={24} className="text-[#FAFAF7]" />
          </motion.div>
          <h1 className="text-2xl font-black text-[#2D2D2A] tracking-tight">KostMate</h1>
          <p className="text-[#8A8A7E] text-sm mt-1">Catat. Analisis. Hemat Lebih.</p>
        </div>

        {/* ── CARD ── */}
        <div className="bg-[#FAFAF7] rounded-3xl shadow-xl shadow-[#1B3A2D]/8 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ── STEP: PILIH MODE ── */}
            {step === "pilih" && (
              <motion.div
                key="pilih"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0   }}
                exit={{   opacity: 0, x: -16  }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="p-7"
              >
                <h2 className="text-xl font-black text-[#2D2D2A] mb-1">Selamat datang 👋</h2>
                <p className="text-[#8A8A7E] text-sm mb-7 leading-relaxed">
                  Mau masuk pakai akun Google atau coba dulu sebagai tamu?
                </p>

                {/* Google */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{  scale: 0.98  }}
                  onClick={handleGoogle}
                  disabled={loadingGoogle}
                  className="w-full flex items-center justify-center gap-3 bg-[#1B3A2D] hover:bg-[#2d5c47] disabled:opacity-60 text-[#FAFAF7] font-bold text-sm py-4 rounded-xl transition-colors duration-300 mb-3 shadow-md shadow-[#1B3A2D]/20"
                >
                  {loadingGoogle
                    ? <span className="w-4 h-4 border-2 border-[#FAFAF7]/30 border-t-[#FAFAF7] rounded-full animate-spin" />
                    : <Chrome size={17} />
                  }
                  {loadingGoogle ? "Mengarahkan..." : "Masuk dengan Google"}
                </motion.button>

                {/* divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#E8DCC8]" />
                  <span className="text-[#8A8A7E] text-xs font-medium">atau</span>
                  <div className="flex-1 h-px bg-[#E8DCC8]" />
                </div>

                {/* Guest */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{  scale: 0.98  }}
                  onClick={() => { setError(""); setStep("guest-form") }}
                  className="w-full flex items-center justify-center gap-3 bg-[#E8DCC8] hover:bg-[#ddd0b8] text-[#2D2D2A] font-bold text-sm py-4 rounded-xl transition-colors duration-300"
                >
                  <User size={17} />
                  Lanjut sebagai Tamu
                </motion.button>

                {error && (
                  <p className="text-[#C4603A] text-xs text-center mt-4 font-medium">{error}</p>
                )}

                <p className="text-[#8A8A7E] text-[11px] text-center mt-6 leading-relaxed">
                  Dengan masuk, kamu setuju dengan{" "}
                  <span className="text-[#4A7C59] font-semibold cursor-pointer hover:underline">
                    Syarat & Ketentuan
                  </span>{" "}
                  KostMate.
                </p>
              </motion.div>
            )}

            {/* ── STEP: GUEST FORM ── */}
            {step === "guest-form" && (
              <motion.div
                key="guest-form"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{   opacity: 0, x: 16  }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="p-7"
              >
                {/* back ke pilih */}
                <button
                  onClick={() => { setStep("pilih"); setError(""); setDurasi(""); setNama("") }}
                  className="flex items-center gap-1.5 text-[#8A8A7E] hover:text-[#2D2D2A] text-xs font-medium mb-6 transition-colors duration-200"
                >
                  <ArrowLeft size={13} /> Kembali
                </button>

                <h2 className="text-xl font-black text-[#2D2D2A] mb-1">Kenalan dulu 👋</h2>
                <p className="text-[#8A8A7E] text-sm mb-6 leading-relaxed">
                  Isi info singkat biar AI bisa bantu lebih personal.
                </p>

                {/* nama */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">
                    Nama kamu
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={nama}
                    onChange={e => setNama(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleGuest()}
                    autoFocus
                    className="w-full bg-[#E8DCC8] text-[#2D2D2A] placeholder-[#8A8A7E] font-medium px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all duration-200 text-sm"
                  />
                </div>

                {/* durasi tinggal — custom dropdown */}
                <div className="mb-6">
                  <label className="block text-[10px] font-bold text-[#8A8A7E] uppercase tracking-widest mb-1.5">
                    Sudah berapa lama tinggal di kos?
                  </label>

                  <div className="relative">
                    <button
                      onClick={() => setOpenDrop(!openDrop)}
                      className={clsx(
                        "w-full flex items-center justify-between bg-[#E8DCC8] px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                        selectedDurasi ? "text-[#2D2D2A]" : "text-[#8A8A7E]",
                        openDrop && "ring-2 ring-[#4A7C59]"
                      )}
                    >
                      {selectedDurasi?.label ?? "Pilih durasi..."}
                      <motion.div
                        animate={{ rotate: openDrop ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={15} className="text-[#8A8A7E]" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {openDrop && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                          animate={{ opacity: 1, y: 0,  scaleY: 1    }}
                          exit={{   opacity: 0, y: -6, scaleY: 0.95 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          style={{ transformOrigin: "top" }}
                          className="absolute top-full left-0 right-0 mt-2 bg-[#FAFAF7] rounded-xl shadow-xl shadow-[#1B3A2D]/10 border border-[#E8DCC8] z-20 overflow-hidden"
                        >
                          {DURASI_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setDurasi(opt.value); setOpenDrop(false) }}
                              className={clsx(
                                "w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-150",
                                durasi === opt.value
                                  ? "bg-[#1B3A2D] text-[#FAFAF7]"
                                  : "text-[#2D2D2A] hover:bg-[#E8DCC8]"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {error && (
                  <p className="text-[#C4603A] text-xs font-medium mb-4">{error}</p>
                )}

                {/* submit */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{  scale: 0.98  }}
                  onClick={handleGuest}
                  disabled={loadingGuest}
                  className="w-full flex items-center justify-center gap-2 bg-[#4A7C59] hover:bg-[#7DB88A] disabled:opacity-60 text-[#FAFAF7] font-bold text-sm py-4 rounded-xl transition-colors duration-300 shadow-md shadow-[#4A7C59]/20"
                >
                  {loadingGuest
                    ? <span className="w-4 h-4 border-2 border-[#FAFAF7]/30 border-t-[#FAFAF7] rounded-full animate-spin" />
                    : <><span>Masuk sebagai Tamu</span><ArrowRight size={15} /></>
                  }
                </motion.button>

                <p className="text-[#8A8A7E] text-[11px] text-center mt-5 leading-relaxed">
                  Data tamu tidak tersimpan permanen.{" "}
                  <span
                    onClick={() => { setStep("pilih"); setError("") }}
                    className="text-[#4A7C59] font-semibold cursor-pointer hover:underline"
                  >
                    Login Google
                  </span>{" "}
                  untuk simpan data kamu.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── TRUST BADGE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 mt-5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
          <p className="text-[#8A8A7E] text-[11px]">Data aman · Tidak dijual · Tidak dibagikan</p>
          <div className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
        </motion.div>

      </motion.div>
    </div>
  )
}