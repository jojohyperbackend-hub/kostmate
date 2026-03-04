"use client"

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useScroll, useTransform } from "framer-motion"
import {
  Wallet,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  Zap,
  Coffee,
  ShoppingBag,
  Bus,
  Gamepad2,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import clsx from "clsx"

// ─── Framer Motion Variants ───────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: i * 0.1 },
  }),
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

// ─── Animated Section Wrapper ─────────────────────────────────────────────────
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Spend Card (hero floating card) ─────────────────────────────────────────
const spendItems = [
  { icon: Coffee, label: "Kopi & Snack", amount: "Rp 28.000", cat: "makan", pct: 62 },
  { icon: Bus, label: "Transport", amount: "Rp 15.000", cat: "transport", pct: 38 },
  { icon: ShoppingBag, label: "Belanja", amount: "Rp 45.000", cat: "belanja", pct: 78 },
  { icon: Gamepad2, label: "Hiburan", amount: "Rp 20.000", cat: "hiburan", pct: 50 },
]

function SpendCard({
  icon: Icon,
  label,
  amount,
  pct,
}: {
  icon: React.ElementType
  label: string
  amount: string
  pct: number
}) {
  const danger = pct >= 75
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -3 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-[#FAFAF7] rounded-2xl px-4 py-3 shadow-md flex items-center gap-3 cursor-default"
    >
      <div className="w-9 h-9 rounded-xl bg-[#F5F0E8] flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[#4A7C59]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-[#2D2D2A] truncate">{label}</span>
          <span className="text-xs font-bold text-[#2D2D2A] ml-2 shrink-0">{amount}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#E8DCC8] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
            className={clsx(
              "h-full rounded-full",
              danger ? "bg-[#C4603A]" : "bg-[#E8A042]"
            )}
          />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  badge,
  delay,
}: {
  icon: React.ElementType
  title: string
  desc: string
  badge?: string
  delay: number
}) {
  return (
    <Reveal delay={delay}>
      <motion.div
        whileHover={{ scale: 1.03, y: -4 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-[#FAFAF7] rounded-3xl p-6 shadow-lg shadow-[#1B3A2D]/8 flex flex-col gap-4 h-full relative overflow-hidden"
      >
        {badge && (
          <span className="absolute top-4 right-4 text-[10px] font-bold bg-[#F2C96E] text-[#2D2D2A] px-2.5 py-1 rounded-full uppercase tracking-wider">
            {badge}
          </span>
        )}
        <div className="w-12 h-12 rounded-2xl bg-[#1B3A2D] flex items-center justify-center">
          <Icon size={20} className="text-[#FAFAF7]" />
        </div>
        <div>
          <h3 className="font-bold text-[#2D2D2A] text-lg leading-snug mb-1">{title}</h3>
          <p className="text-[#8A8A7E] text-sm leading-relaxed">{desc}</p>
        </div>
      </motion.div>
    </Reveal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const [budgetPct] = useState(71)

  return (
    <div className="min-h-screen bg-[#F5F0E8] font-sans overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#1B3A2D] px-6 md:px-12 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#4A7C59] flex items-center justify-center">
            <Wallet size={15} className="text-[#FAFAF7]" />
          </div>
          <span className="text-[#FAFAF7] font-extrabold text-lg tracking-tight">KostMate</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["Fitur", "Cara Kerja", "AI Mentor"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-[#FAFAF7]/70 hover:text-[#FAFAF7] text-sm font-medium transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>
        <Link
          href="/login"
          className="bg-[#4A7C59] hover:bg-[#7DB88A] text-[#FAFAF7] text-sm font-bold px-5 py-2.5 rounded-xl transition-colors duration-300"
        >
          Mulai Gratis
        </Link>
      </motion.nav>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-6 overflow-hidden"
      >
        {/* bg blobs */}
        <div className="absolute top-24 -left-32 w-[480px] h-[480px] rounded-full bg-[#4A7C59]/10 blur-[96px] pointer-events-none" />
        <div className="absolute bottom-10 -right-24 w-[360px] h-[360px] rounded-full bg-[#E8A042]/15 blur-[80px] pointer-events-none" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="w-full max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* LEFT — copy */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="flex-1 text-center lg:text-left"
            >
              <motion.div variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-1.5 bg-[#1B3A2D] text-[#F2C96E] text-xs font-bold px-3.5 py-1.5 rounded-full mb-6 uppercase tracking-widest">
                  <Sparkles size={11} />
                  AI-Powered · Buat Anak Kos
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-5xl md:text-6xl xl:text-7xl font-black text-[#2D2D2A] leading-[1.05] tracking-tight mb-6"
              >
                Catat. Analisis.
                <br />
                <span className="text-[#4A7C59]">Hemat Lebih.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-[#8A8A7E] text-lg md:text-xl leading-relaxed max-w-md mx-auto lg:mx-0 mb-10"
              >
                KostMate bantu kamu lacak pengeluaran harian dan kasih rekomendasi AI biar dompet
                gak jebol sebelum akhir bulan.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 bg-[#4A7C59] hover:bg-[#7DB88A] text-[#FAFAF7] font-bold text-base px-8 py-4 rounded-xl transition-colors duration-300 shadow-lg shadow-[#4A7C59]/30"
                >
                  Coba Sekarang — Gratis
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                <a
                  href="#cara-kerja"
                  className="inline-flex items-center justify-center gap-2 bg-[#E8DCC8] hover:bg-[#E8DCC8]/70 text-[#2D2D2A] font-semibold text-base px-8 py-4 rounded-xl transition-colors duration-300"
                >
                  Lihat Cara Kerja
                </a>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="mt-10 flex items-center gap-6 justify-center lg:justify-start">
                {[["500+", "Pengguna Aktif"], ["Rp 12jt", "Sudah Dihemat"], ["4.9★", "Rating"]].map(([val, label]) => (
                  <div key={label} className="text-center">
                    <div className="text-[#2D2D2A] font-black text-xl">{val}</div>
                    <div className="text-[#8A8A7E] text-xs mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* RIGHT — floating UI mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
              className="flex-1 w-full max-w-sm mx-auto lg:max-w-none"
            >
              <div className="bg-[#1B3A2D] rounded-3xl p-5 shadow-2xl shadow-[#1B3A2D]/25">
                {/* card header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[#FAFAF7]/50 text-xs font-medium">Budget Bulan Ini</p>
                    <p className="text-[#FAFAF7] font-black text-2xl mt-0.5">Rp 500.000</p>
                  </div>
                  <div className="bg-[#F2C96E] text-[#2D2D2A] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                    🔥 7 hari hemat
                  </div>
                </div>

                {/* progress bar budget */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#FAFAF7]/60">Terpakai</span>
                    <span className={clsx("font-bold", budgetPct >= 75 ? "text-[#C4603A]" : "text-[#E8A042]")}>
                      {budgetPct}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#FAFAF7]/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${budgetPct}%` }}
                      transition={{ duration: 1.4, ease: "easeOut", delay: 0.6 }}
                      className={clsx(
                        "h-full rounded-full",
                        budgetPct >= 75 ? "bg-gradient-to-r from-[#E8A042] to-[#C4603A]" : "bg-[#E8A042]"
                      )}
                    />
                  </div>
                  <p className="text-[#FAFAF7]/40 text-[11px] mt-1.5">Sisa Rp 145.000 dari Rp 500.000</p>
                </div>

                {/* spend items */}
                <div className="flex flex-col gap-2.5">
                  {spendItems.map((item) => (
                    <SpendCard key={item.label} {...item} />
                  ))}
                </div>

                {/* AI badge */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8, duration: 0.5 }}
                  className="mt-4 bg-[#4A6B8A]/30 backdrop-blur border border-[#4A6B8A]/40 rounded-2xl p-3.5 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#4A6B8A] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-[#FAFAF7]" />
                  </div>
                  <p className="text-[#FAFAF7]/80 text-xs leading-relaxed">
                    💡 Pengeluaran makan kamu 60% dari budget. Coba masak sendiri 2x seminggu — hemat{" "}
                    <span className="text-[#F2C96E] font-bold">~Rp 80.000</span>
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-[#8A8A7E] text-xs">Scroll ke bawah</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown size={16} className="text-[#8A8A7E]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── CARA KERJA ── */}
      <section id="cara-kerja" className="py-24 px-6 bg-[#F5F0E8]">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-[#4A7C59] text-xs font-bold uppercase tracking-widest">Alur Kerja</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#2D2D2A] mt-2 mb-4">
              Dari input ke insight,<br />semua otomatis.
            </h2>
            <p className="text-[#8A8A7E] text-lg max-w-xl mx-auto">
              KostMate proses pengeluaran kamu secara real-time dan AI langsung kasih analisis personal.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Input Form", desc: "Isi pengeluaran — nama, nominal, kategori. Cuma 5 detik.", icon: Wallet },
              { step: "02", title: "AI Generate", desc: "Data langsung diproses LLM Llama 3.2 via MCP agent.", icon: Zap },
              { step: "03", title: "AI Analisis", desc: "Pola belanja dianalisis, dibandingkan dengan budget kamu.", icon: TrendingDown },
              { step: "04", title: "Output Insight", desc: "Rekomendasi personal muncul langsung di dashboard.", icon: Sparkles },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <Reveal key={step} delay={i} className="relative">
                <div className="bg-[#FAFAF7] rounded-3xl p-6 h-full shadow-md shadow-[#1B3A2D]/6">
                  <span className="text-[#E8DCC8] font-black text-4xl leading-none block mb-4">{step}</span>
                  <div className="w-10 h-10 rounded-xl bg-[#1B3A2D] flex items-center justify-center mb-4">
                    <Icon size={17} className="text-[#FAFAF7]" />
                  </div>
                  <h3 className="font-bold text-[#2D2D2A] text-base mb-1">{title}</h3>
                  <p className="text-[#8A8A7E] text-sm leading-relaxed">{desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2 z-10 w-4 h-4 items-center justify-center">
                    <ArrowRight size={14} className="text-[#8A8A7E]" />
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FITUR ── */}
      <section className="py-24 px-6 bg-[#E8DCC8]/40">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-[#4A7C59] text-xs font-bold uppercase tracking-widest">Fitur</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#2D2D2A] mt-2">
              Semua yang kamu butuh,<br />dalam satu app.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Wallet}
              title="CRUD Pengeluaran"
              desc="Tambah, edit, hapus transaksi harian dengan form yang super cepat dan mudah."
              delay={0}
            />
            <FeatureCard
              icon={TrendingDown}
              title="Budget Tracker"
              desc="Set budget per kategori. Progress bar dinamis berubah warna kalau hampir limit."
              badge="Real-time"
              delay={1}
            />
            <FeatureCard
              icon={Sparkles}
              title="AI Insight"
              desc="LLM Llama 3.2 analisis pola belanja kamu dan kasih rekomendasi hemat yang relevan."
              badge="AI"
              delay={2}
            />
            <FeatureCard
              icon={Zap}
              title="AI Mentor Chat"
              desc="Tanya tips hemat, rencana keuangan, atau apapun ke AI mentor yang tau kondisi kamu."
              delay={3}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Login Google"
              desc="Auth via Firebase Google. Data kamu aman dan tersimpan di Supabase."
              delay={4}
            />
            <FeatureCard
              icon={TrendingDown}
              title="Laporan Bulanan"
              desc="Rangkuman pengeluaran bulanan lengkap dengan insight otomatis dari AI."
              badge="Soon"
              delay={5}
            />
          </div>
        </div>
      </section>

      {/* ── AI INSIGHT SECTION ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-[#1B3A2D] rounded-3xl overflow-hidden p-8 md:p-14">
            {/* bg glow */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#4A6B8A]/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#4A7C59]/20 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1">
                <Reveal>
                  <span className="inline-flex items-center gap-1.5 bg-[#4A6B8A]/40 border border-[#4A6B8A]/50 text-[#FAFAF7]/80 text-xs font-bold px-3 py-1.5 rounded-full mb-5 uppercase tracking-widest">
                    <Sparkles size={10} />
                    Powered by Llama 3.2 · MCP Agent
                  </span>
                </Reveal>
                <Reveal delay={1}>
                  <h2 className="text-3xl md:text-4xl font-black text-[#FAFAF7] leading-tight mb-4">
                    AI yang ngerti<br />kondisi dompet kamu.
                  </h2>
                </Reveal>
                <Reveal delay={2}>
                  <p className="text-[#FAFAF7]/60 text-base leading-relaxed mb-8 max-w-md">
                    Bukan sekedar catatan — KostMate paham pola belanja kamu dan kasih saran
                    yang benar-benar actionable, bukan generic.
                  </p>
                </Reveal>
                <Reveal delay={3}>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 bg-[#4A7C59] hover:bg-[#7DB88A] text-[#FAFAF7] font-bold px-7 py-3.5 rounded-xl transition-colors duration-300"
                  >
                    Mulai Sekarang <ArrowRight size={15} />
                  </Link>
                </Reveal>
              </div>

              {/* insight card mockup */}
              <Reveal delay={2} className="flex-1 w-full max-w-sm mx-auto">
                <div className="space-y-3">
                  {[
                    {
                      emoji: "💡",
                      text: "Kamu habis 65% budget buat GrabFood minggu ini. Coba masak 2x — hemat Rp 90.000.",
                      tag: "Hemat",
                      tagColor: "bg-[#4A7C59]",
                    },
                    {
                      emoji: "⚠️",
                      text: "Budget transport hampir habis. Pertimbangkan naik angkot atau ojek langganan.",
                      tag: "Perhatian",
                      tagColor: "bg-[#E8A042]",
                    },
                    {
                      emoji: "🎯",
                      text: "Kalau pengeluaran hiburan dikurangi 30%, kamu bisa nabung Rp 150.000 bulan ini.",
                      tag: "Target",
                      tagColor: "bg-[#4A6B8A]",
                    },
                  ].map(({ emoji, text, tag, tagColor }, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.15, duration: 0.5, ease: "easeOut" }}
                      whileHover={{ scale: 1.02 }}
                      className="bg-[#FAFAF7]/8 backdrop-blur border border-[#FAFAF7]/10 rounded-2xl p-4 flex gap-3 items-start"
                    >
                      <span className="text-xl shrink-0">{emoji}</span>
                      <div className="flex-1">
                        <p className="text-[#FAFAF7]/80 text-sm leading-relaxed">{text}</p>
                        <span className={clsx("inline-block mt-2 text-[10px] font-bold text-[#FAFAF7] px-2 py-0.5 rounded-full", tagColor)}>
                          {tag}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA AKHIR ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <div className="w-16 h-16 rounded-3xl bg-[#1B3A2D] flex items-center justify-center mx-auto mb-6">
              <Wallet size={28} className="text-[#FAFAF7]" />
            </div>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="text-4xl md:text-5xl font-black text-[#2D2D2A] leading-tight mb-4">
              Mulai hemat hari ini.<br />Gratis selamanya.
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="text-[#8A8A7E] text-lg mb-10">
              Daftar dalam 10 detik pakai akun Google kamu.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 bg-[#4A7C59] hover:bg-[#7DB88A] text-[#FAFAF7] font-bold text-lg px-10 py-4 rounded-xl transition-colors duration-300 shadow-xl shadow-[#4A7C59]/25"
            >
              Login dengan Google
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1B3A2D] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4A7C59] flex items-center justify-center">
              <Wallet size={13} className="text-[#FAFAF7]" />
            </div>
            <span className="text-[#FAFAF7] font-bold text-base">KostMate</span>
          </div>
          <p className="text-[#FAFAF7]/40 text-sm">© 2026 KostMate · Dibuat buat anak kos 🏠</p>
          <div className="flex gap-5">
            {["Privasi", "Syarat", "Kontak"].map((item) => (
              <a key={item} href="#" className="text-[#FAFAF7]/40 hover:text-[#FAFAF7]/80 text-sm transition-colors duration-200">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}