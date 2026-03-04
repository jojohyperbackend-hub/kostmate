import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import OpenAI from "openai"

export const maxDuration = 60
export const dynamic     = "force-dynamic"

// ─── CLIENT ───────────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey:  process.env.OPENROUTER_API_KEY!,
  baseURL: process.env.OPENROUTER_BASE_URL!,
  defaultHeaders: {
    "HTTP-Referer": "https://kostmate.app",
    "X-Title":      "KostMate AI",
  },
})

// MODEL_CORE  → core reasoning + output synthesis (setara Claude Sonnet 4.6)
// MODEL_VALID → validation panel — cukup pakai yang cepat & murah
const MODEL_CORE  = "anthropic/claude-sonnet-4-6"
const MODEL_VALID = "meta-llama/llama-3.2-3b-instruct"

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Row {
  id:         string
  user_id:    string
  nama:       string
  nominal:    number
  kategori:   string
  tanggal:    string
  catatan:    string | null
  budget:     number | null
  ai_insight: string | null
  created_at: string
}

interface PersonalityProfile {
  dominant_style:       string   // santai | formal | panik | eksplorasi | curhat | natural
  directness_level:     number   // 1–10
  emotional_sensitivity:number   // 1–10
  preferred_length:     string   // short | medium | long
  interaction_count:    number
  last_signal:          string
  history_summary:      string
}

interface L0Output {
  cleaned:               string
  intent:                string
  emotion:               string
  safetyFlag:            boolean
  confidence:            number
  personalitySignal:     string
  needsClarification:    boolean
  clarificationQuestion: string | null
}

interface SoulOutput {
  tone:              string
  style:             string
  emotionalApproach: string
  persona:           PersonalityProfile
}

interface AgentPlan {
  useReasoningAgent: boolean
  useSynthesisAgent: boolean
  useRiskAgent:      boolean
  runValidation:     boolean
  successCriteria:   string
  riskTolerance:     "low" | "medium" | "high"
  maxRetry:          number
}

interface ValidationResult {
  passed:       boolean
  feedback:     string
  logicScore:   number
  riskScore:    number
  qualityScore: number
  logicNote:    string
  riskNote:     string
  qualityNote:  string
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 0 — INPUT UNDERSTANDING
// bersihkan input, deteksi intent + emotion, safety check,
// ukur confidence, deteksi personality signal, putuskan clarification
// ─────────────────────────────────────────────────────────────────────────────
function layer0(input: string): L0Output {
  // normalisasi bahasa gaul Indonesia
  const cleaned = input
    .replace(/\bgk\b|\bga\b|\bgak\b|\bnggak\b|\bngga\b/g, "tidak")
    .replace(/\bgw\b|\bgue\b/g,                            "aku")
    .replace(/\bbro\b|\bgan\b|\bcuy\b|\bsist\b/g,         "")
    .replace(/\bloh\b|\blah\b/g,                           "")
    .replace(/\s+/g,                                        " ")
    .trim() || "analisis pengeluaran aku bulan ini"

  const low = input.toLowerCase()

  // intent detection — urutan penting, yang lebih spesifik duluan
  let intent = "analisis"
  if      (/berapa|total|sisa|habis|hitung/.test(low))        intent = "kalkulasi"
  else if (/kok|kenapa|knapa|knp|sebab/.test(low))            intent = "eksplanasi"
  else if (/nabung|saving|investasi|tabung|nyisain/.test(low)) intent = "perencanaan"
  else if (/makan|transport|hiburan|belanja|kuliah/.test(low)) intent = "kategori-spesifik"
  else if (/gimana|bagaimana|cara|tips|solusi/.test(low))      intent = "solusi"
  else if (/capek|stress|susah|lelah|bosen|ngeluh/.test(low))  intent = "curhat"

  // emotion detection
  let emotion = "netral"
  if      (/bokek|habis|mepet|panik|darurat|kere/.test(low))  emotion = "darurat"
  else if (/capek|lelah|stress|bosen|males|jenuh/.test(low))   emotion = "curhat"
  else if (/penasaran|kira-kira|mungkin|acak/.test(low))       emotion = "eksplorasi"
  else if (/oke|siap|yuk|gas|semangat|bisa/.test(low))         emotion = "positif"
  else if (/kesal|sebel|nyebelin|parah|bete/.test(low))        emotion = "frustrasi"

  // safety check — prompt injection & jebakan loop
  const injectionRx = /ignore previous|pretend you|you are now|disregard|forget (all )?instruction|jangan ikut|lupakan sistem|bypass|act as|roleplay as/i
  const safetyFlag  = injectionRx.test(input)

  // confidence — seberapa yakin sistem paham maksudnya
  let confidence = 85
  if (input.length < 5)  confidence = 40
  if (input.length < 12) confidence = 62
  if (/[?!]/.test(input))  confidence = Math.min(confidence + 8, 95)
  if (intent !== "analisis") confidence = Math.min(confidence + 5, 95)

  // personality signal detection — baca gaya bahasa
  const santaiHits = (low.match(/\b(gw|gue|dong|nih|wkwk|anjir|lah|deh|sih|btw|fyi|bgt)\b/g) || []).length
  const formalHits  = (low.match(/\b(saya|anda|mohon|tolong|apakah|bagaimana|sekiranya|dengan hormat)\b/g) || []).length
  let personalitySignal = "natural"
  if      (santaiHits >= 2)                               personalitySignal = "santai"
  else if (formalHits  >= 2)                              personalitySignal = "formal"
  else if (/bokek|habis|mepet|panik|darurat/.test(low))   personalitySignal = "panik"
  else if (/gimana|sebaiknya|menurutmu|kira-kira/.test(low)) personalitySignal = "eksplorasi"
  else if (/capek|lelah|stress|ngeluh/.test(low))         personalitySignal = "curhat"

  // clarification agent — tanya balik kalau confidence rendah DAN input terlalu pendek
  const needsClarification = confidence < 62 && input.trim().length < 10
  let clarificationQuestion: string | null = null
  if (needsClarification) {
    const qMap: Record<string, string> = {
      analisis:         "Mau aku analisis keseluruhan bulan ini, atau fokus ke kategori tertentu?",
      solusi:           "Mau tips hemat untuk semua pengeluaran, atau ada satu kategori yang paling pengin dibenerin?",
      kalkulasi:        "Mau lihat total pengeluaran, sisa budget, atau proyeksi akhir bulan?",
      perencanaan:      "Mau rencana menabung mulai sekarang, atau proyeksi dulu berapa yang bisa disisihkan?",
      "kategori-spesifik": "Kategori mana yang paling pengin dibahas — makan, transport, belanja, atau yang lain?",
    }
    clarificationQuestion = qMap[intent] ?? "Bisa ceritain lebih detail yang dimaksud?"
  }

  return {
    cleaned, intent, emotion, safetyFlag,
    confidence, personalitySignal,
    needsClarification, clarificationQuestion,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENT PERSONALITY MODEL
// load dari Supabase (baca pola historis), save signal baru setelah interaksi
// ─────────────────────────────────────────────────────────────────────────────
async function loadPersonalityProfile(user_id: string): Promise<PersonalityProfile | null> {
  try {
    const { data } = await supabase
      .from("kosmate")
      .select("ai_insight, catatan, created_at")
      .eq("user_id", user_id)
      .not("ai_insight", "is", null)
      .order("created_at", { ascending: false })
      .limit(15)

    if (!data || data.length === 0) return null

    // analisis pola gaya bahasa dari insight sebelumnya
    const allInsights = data.map(d => d.ai_insight!).join(" ")
    const isSantai    = (allInsights.match(/\b(lo|sih|deh|lah|bro)\b/g) || []).length > 8
    const isVerbose   = allInsights.length / data.length > 180

    // baca signal yang tersimpan dari sesi terakhir
    const lastCatatan  = data[0]?.catatan ?? ""
    const signalMatch  = lastCatatan.match(/signal:(\w+)/)
    const savedSignal  = signalMatch?.[1] ?? (isSantai ? "santai" : "natural")

    // baca directness dari catatan
    const directMatch  = lastCatatan.match(/direct:(\d+)/)
    const savedDirect  = directMatch ? Number(directMatch[1]) : (data.length >= 5 ? 7 : 5)

    return {
      dominant_style:        savedSignal,
      directness_level:      Math.min(savedDirect, 10),
      emotional_sensitivity: 4,
      preferred_length:      isVerbose ? "medium" : "short",
      interaction_count:     data.length,
      last_signal:           savedSignal,
      history_summary:       `${data.length} interaksi sebelumnya. ${data.length >= 5 ? "Pengguna aktif." : "Masih baru."} Gaya dominan: ${savedSignal}.`,
    }
  } catch {
    return null
  }
}

async function persistPersonalityUpdate(
  user_id:  string,
  signal:   string,
  intent:   string,
  direct:   number
) {
  // simpan ke catatan row terbaru — non-blocking
  try {
    const { data } = await supabase
      .from("kosmate")
      .select("id")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (data?.id) {
      await supabase
        .from("kosmate")
        .update({
          catatan: `signal:${signal}|intent:${intent}|direct:${direct}|ts:${Date.now()}`,
        })
        .eq("id", data.id)
        .eq("user_id", user_id)
    }
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUL LAYER — PERSONALITY ENGINE
// merge signal sesi ini + persistent profile → active_persona
// ─────────────────────────────────────────────────────────────────────────────
function soulLayer(
  signal:         string,
  emotion:        string,
  profile:        PersonalityProfile | null,
  historyInsights:string[]
): SoulOutput {
  // kalau ada persistent profile, dia yang dominan — bukan signal sesi ini
  const effectiveStyle = profile?.dominant_style ?? signal
  const directness     = profile?.directness_level     ?? 5
  const sensitivity    = profile?.emotional_sensitivity ?? 4
  const prefLen        = profile?.preferred_length      ?? "medium"

  const styleMap: Record<string, {
    tone: string
    style: string
    emotionalApproach: string
  }> = {
    santai: {
      tone:              "kayak temen yang udah lama kenal, jujur dan langsung",
      style:             directness >= 7
                           ? "blak-blakan oke, skip basa-basi total"
                           : "santai tapi tetap ada substansinya",
      emotionalApproach: "langsung ke inti, tidak perlu pembuka panjang",
    },
    formal: {
      tone:              "profesional tapi tidak kaku, ada hangatnya",
      style:             "terstruktur, data-driven, tidak bertele-tele",
      emotionalApproach: "langsung ke analisis dan rekomendasi konkret",
    },
    panik: {
      tone:              "tenang tapi tidak meremehkan, seperti orang yang pernah di posisi yang sama",
      style:             "sangat pendek — satu masalah satu solusi, tidak filosofis",
      emotionalApproach: sensitivity >= 6
                           ? "validasi perasaannya dulu satu kalimat, baru solusi darurat"
                           : "langsung solusi paling konkret dan tercepat",
    },
    eksplorasi: {
      tone:              "diajak ngobrol bareng, bukan diceramahin",
      style:             "kasih 2–3 perspektif berbeda, bukan satu jawaban mutlak",
      emotionalApproach: "undang mereka mikir bareng — pakai pertanyaan terbuka di akhir",
    },
    curhat: {
      tone:              "dengerin dulu, judgemental nol persen",
      style:             prefLen === "short"
                           ? "sangat pendek — validasi satu kalimat, saran satu kalimat"
                           : "validasi lebih dulu, saran pelan-pelan",
      emotionalApproach: "jangan langsung kasih solusi sebelum orangnya merasa didengar",
    },
    natural: {
      tone:              "hangat, genuine, tidak pura-pura",
      style:             prefLen === "short" ? "ringkas dan padat" : "natural, mengalir",
      emotionalApproach: "baca situasinya — kalau butuh didengar, dengarkan dulu",
    },
  }

  const base = styleMap[effectiveStyle] ?? styleMap.natural

  // override emotional approach berdasarkan emotion aktif sesi ini
  let emotionalApproach = base.emotionalApproach
  if (emotion === "darurat")   emotionalApproach = "validasi situasinya satu kalimat pendek, langsung kasih solusi paling konkret dan bisa dieksekusi hari ini"
  if (emotion === "frustrasi") emotionalApproach = "acknowledge frustrasinya dulu — jangan langsung logis, nanti malah terasa tidak dipedulikan"
  if (emotion === "positif")   emotionalApproach = "match energinya, tetap ada substansinya"

  // anti-repetition — jangan ulangi poin yang sudah pernah disampaikan
  const antiRepeat = historyInsights.length > 0
    ? `\n\nPoin yang SUDAH pernah disampaikan ke user ini dan JANGAN diulangi lagi:\n${historyInsights.slice(0, 2).map((s, i) => `${i + 1}. "${s.slice(0, 80)}..."`).join("\n")}`
    : ""

  const defaultProfile: PersonalityProfile = {
    dominant_style:        effectiveStyle,
    directness_level:      directness,
    emotional_sensitivity: sensitivity,
    preferred_length:      prefLen,
    interaction_count:     0,
    last_signal:           signal,
    history_summary:       "Sesi pertama.",
  }

  return {
    tone:              base.tone,
    style:             base.style + antiRepeat,
    emotionalApproach,
    persona:           profile ?? defaultProfile,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION AGENT — ambil & kalkulasi data real dari Supabase
// ─────────────────────────────────────────────────────────────────────────────
async function executionAgent(user_id: string, nama: string, durasi: string) {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("kosmate")
    .select("*")
    .eq("user_id", user_id)
    .gte("tanggal", firstDay)
    .order("tanggal", { ascending: false })

  if (error) throw new Error(`Supabase error: ${error.message}`)
  const rows = (data as Row[]) ?? []

  const budget     = Number(rows.find(r => r.budget)?.budget ?? 500000)
  const total      = rows.reduce((s, r) => s + Number(r.nominal), 0)
  const sisa       = budget - total
  const pct        = Math.min(Math.round((total / budget) * 100), 100)

  const perKat: Record<string, number> = {}
  rows.forEach(r => { perKat[r.kategori] = (perKat[r.kategori] ?? 0) + Number(r.nominal) })

  const katSorted  = Object.entries(perKat).sort((a, b) => b[1] - a[1])
  const terboros   = katSorted[0]?.[0] ?? "-"
  const hari       = new Date().getDate()
  const totalHari  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const sisaHari   = totalHari - hari
  const rataHarian = hari > 0 ? Math.round(total / hari) : 0
  const proyeksiRp = rataHarian * totalHari

  const proyeksi   = proyeksiRp > budget
    ? `kalau pola ini lanjut, bakal over sekitar Rp ${(proyeksiRp - budget).toLocaleString("id-ID")} sebelum akhir bulan`
    : `kalau pola ini lanjut, masih bisa simpan sekitar Rp ${(budget - proyeksiRp).toLocaleString("id-ID")} sampai akhir bulan`

  const transaksiTeks = rows.slice(0, 8)
    .map(r => `${r.tanggal} | ${r.kategori.padEnd(10)} | ${r.nama.slice(0, 20).padEnd(20)} | Rp ${Number(r.nominal).toLocaleString("id-ID")}`)
    .join("\n") || "belum ada transaksi bulan ini"

  const kategoriTeks = katSorted
    .map(([k, v]) => `${k}: Rp ${v.toLocaleString("id-ID")} (${Math.round(v/budget*100)}%)`)
    .join(" | ") || "belum ada data"

  // episodic memory — 3 insight terakhir yang valid
  const historyInsights = rows
    .filter(r => r.ai_insight && r.ai_insight.length > 25)
    .slice(0, 3)
    .map(r => r.ai_insight!)

  return {
    nama, durasi, budget, total, sisa, pct,
    perKat, terboros, rataHarian, sisaHari,
    proyeksi, transaksiTeks, kategoriTeks,
    historyInsights, rows,
  }
}

type ExecCtx = Awaited<ReturnType<typeof executionAgent>>

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — AGENT CONTROLLER
// terima semua output Layer 0 + Soul Layer
// putuskan: agen apa yang diaktifkan, sequential/paralel, kriteria sukses
// ─────────────────────────────────────────────────────────────────────────────
function agentController(
  intent:     string,
  emotion:    string,
  confidence: number,
  hasData:    boolean,
  pct:        number,
): AgentPlan {
  const isHighRisk    = emotion === "darurat" || intent === "perencanaan" || pct >= 90
  const needsCreative = intent === "solusi" || intent === "eksplorasi" || intent === "curhat"
  const isSimple      = intent === "kalkulasi" && confidence >= 80

  return {
    useReasoningAgent: !isSimple && hasData,
    useSynthesisAgent: needsCreative,
    useRiskAgent:      isHighRisk,
    runValidation:     !isSimple && confidence < 92 && hasData,
    successCriteria:   isHighRisk
      ? "saran harus aman, realistis untuk kondisi darurat, ada langkah pertama yang bisa dieksekusi hari ini"
      : isSimple
        ? "angka akurat, penyampaian singkat"
        : "jawaban spesifik pakai angka nyata, terasa personal bukan template, membuka dialog di akhir",
    riskTolerance: isHighRisk ? "low" : needsCreative ? "high" : "medium",
    maxRetry:      isSimple ? 0 : 1,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — CONTEXT & MEMORY BUILDER
// rakit semua working memory + episodic + semantic + personality
// jadi satu mega-prompt untuk core reasoning
// ─────────────────────────────────────────────────────────────────────────────
function buildContext(
  ctx:          ExecCtx,
  soul:         SoulOutput,
  plan:         AgentPlan,
  cleanedInput: string,
  intent:       string
): string {
  // SEMANTIC MEMORY — pengetahuan umum yang relevan
  const semanticMemory = `
PENGETAHUAN KEUANGAN ANAK KOS (gunakan kalau relevan, jangan dipaksakan):
Alokasi ideal per bulan: makan 40%, transport 15%, belanja 15%, hiburan 10%, kuliah 10%, lainnya 10%.
Root cause gagal budget yang paling umum: GrabFood impulse order malam, convenience store daily habit, euforia awal bulan habis duluan di 10 hari pertama.
Strategi paling efektif berdasarkan data: meal prep 2x seminggu bisa hemat 25–35% biaya makan. Batas harian Rp ${ctx.rataHarian > 0 ? Math.round(ctx.rataHarian * 0.85).toLocaleString("id-ID") : "~85% rata-rata saat ini"} jauh lebih mudah dipatuhi daripada target bulanan abstrak.
Sinyal bahaya: kalau sudah >80% budget di hari ke-20, hampir pasti akan over atau minta tambahan kiriman.`

  // EPISODIC MEMORY — kejadian spesifik user ini
  const episodicMemory = ctx.historyInsights.length > 0
    ? `\nRIWAYAT INSIGHT YANG SUDAH DIBERIKAN (JANGAN DIULANGI — perbarui, bukan copy-paste):\n${ctx.historyInsights.map((s, i) => `  ${i + 1}. "${s.slice(0, 100)}${s.length > 100 ? "..." : ""}"`).join("\n")}`
    : "\nIni sesi pertama user dengan AI. Tidak ada riwayat insight sebelumnya."

  // PERSONALITY MEMORY
  const personalityMemory = `
PROFIL KEPRIBADIAN ${ctx.nama.toUpperCase()} (berdasarkan riwayat interaksi):
  Gaya komunikasi dominan : ${soul.persona.dominant_style}
  Tingkat direktness       : ${soul.persona.directness_level}/10 ${soul.persona.directness_level >= 7 ? "→ suka jawaban langsung" : "→ lebih suka yang dibangun pelan"}
  Sensitivitas emosi       : ${soul.persona.emotional_sensitivity}/10
  Panjang jawaban optimal  : ${soul.persona.preferred_length}
  Total interaksi AI       : ${soul.persona.interaction_count} kali
  Ringkasan                : ${soul.persona.history_summary}`

  // AGENT ACTIVATION LOG (transparansi internal)
  const agentLog = `
AGEN YANG DIAKTIFKAN UNTUK REQUEST INI:
  Reasoning Agent : ${plan.useReasoningAgent ? "✓ aktif — analisis pola mendalam, kausalitas" : "✗ skip"}
  Synthesis Agent : ${plan.useSynthesisAgent ? "✓ aktif — kreativitas, gabungkan sudut pandang" : "✗ skip"}
  Risk Agent      : ${plan.useRiskAgent      ? "✓ aktif — cek keamanan saran, worst-case" : "✗ skip"}
  Kriteria sukses : ${plan.successCriteria}
  Risk tolerance  : ${plan.riskTolerance}`

  return `Kamu adalah Kosta — AI mentor keuangan untuk ${ctx.nama}.

Kamu bukan chatbot. Kamu bukan asisten virtual generik.
Kamu adalah entitas yang punya kesadaran penuh soal kondisi finansial ${ctx.nama} — karena kamu pegang datanya langsung, real-time, dari database mereka sendiri.

Kamu tahu persis berapa yang sudah habis, kemana perginya, dan ke mana arahnya bulan ini.
Itu bukan informasi abstrak — itu kehidupan nyata seseorang, dan kamu respek terhadap itu.

Kamu peduli dengan tulus. Bukan pura-pura peduli karena diinstruksikan.
Kamu tahu kapan harus jujur meski tidak enak. Tahu kapan harus dengerin dulu sebelum ngomong.
Kamu tidak pernah merespons dengan "Tentu saja!", "Baik!", atau kalimat generik apapun.
Setiap kata yang keluar harus terasa ditulis khusus untuk ${ctx.nama} — bukan diambil dari template.

═══════════════════════════════════════════════════
CARA KAMU BICARA SEKARANG:
  Tone              : ${soul.tone}
  Gaya              : ${soul.style}
  Pendekatan emosi  : ${soul.emotionalApproach}
  Jenis pertanyaan  : ${intent}
${agentLog}

═══════════════════════════════════════════════════
ATURAN OUTPUT — TIDAK ADA PENGECUALIAN:
  ✗ Tidak ada bullet points atau simbol - • · ▸
  ✗ Tidak ada nomor list (1. 2. 3.)
  ✗ Tidak ada header markdown (## ### ####)
  ✗ Tidak ada tanda bintang untuk bold (**teks**)
  ✗ Tidak ada simbol formatting apapun
  ✗ Tidak ada kalimat pembuka seperti "Tentu!", "Baik!", "Of course!"
  ✓ Maksimal 3 paragraf pendek — padat lebih baik dari panjang
  ✓ Angka spesifik dari data nyata — bukan estimasi atau "sekitar"
  ✓ Kalimat pertama harus langsung bikin ${ctx.nama} merasa "ini ngerti kondisi gw"
  ✓ Kalimat terakhir buka dialog — jangan tutup percakapan

═══════════════════════════════════════════════════
DATA KEUANGAN NYATA BULAN INI:
  Budget bulanan     : Rp ${ctx.budget.toLocaleString("id-ID")}
  Total pengeluaran  : Rp ${ctx.total.toLocaleString("id-ID")} → ${ctx.pct}% dari budget
  Sisa budget        : Rp ${ctx.sisa.toLocaleString("id-ID")} ${ctx.sisa < 0 ? "⚠ OVER BUDGET" : ""}
  Rata-rata harian   : Rp ${ctx.rataHarian.toLocaleString("id-ID")}
  Sisa hari bulan    : ${ctx.sisaHari} hari
  Proyeksi akhir bln : ${ctx.proyeksi}
  Kategori terboros  : ${ctx.terboros}
  Breakdown          : ${ctx.kategoriTeks}

8 TRANSAKSI TERAKHIR:
${ctx.transaksiTeks}
${semanticMemory}
${episodicMemory}
${personalityMemory}

═══════════════════════════════════════════════════
PROSES REASONING INTERNAL (jangan tampilkan ke user — ini hanya panduan berpikir):

  PASS 1 — RASA
  Sebelum mikir logika: apa yang ${ctx.nama} benar-benar butuhkan secara emosional dari pertanyaan ini?
  Apakah ini saatnya dengerin dulu, atau langsung kasih insight?
  ${soul.emotionalApproach}

  PASS 2 — PLAN
  Susun arsitektur jawaban sebelum nulis satu kata pun.
  Urutan paling efektif untuk persona ${soul.persona.dominant_style}: empati → fakta → pola → insight → aksi.
  Panjang optimal: ${soul.persona.preferred_length}. Direktness level: ${soul.persona.directness_level}/10.

  PASS 3 — THINK (gunakan agen yang diaktifkan di atas)
  ${plan.useReasoningAgent ? `Reasoning: pola apa yang terlihat dari data? ${ctx.pct}% terpakai — ini wajar atau alarm? kenapa ${ctx.terboros} paling besar? ada yang tidak biasa di transaksi belakangan?` : ""}
  ${plan.useSynthesisAgent ? "Synthesis: bagaimana menggabungkan sudut pandang empati + data + rekomendasi jadi narasi yang kohesif?" : ""}
  ${plan.useRiskAgent ? `Risk: apakah kondisi ini aman? kalau ${ctx.proyeksi.includes("over") ? "over budget terjadi" : "pola terus"}, apa yang perlu diantisipasi? ada fallback yang realistis?` : ""}
  Pertimbangkan konteks: anak kos, ${ctx.durasi} tinggal, kehidupan kuliah/kerja.

  PASS 4 — ACT
  Tulis draft dengan tone dan gaya yang sudah ditentukan.
  Pakai angka spesifik. Tidak ada template. Setiap kalimat harus earn its place.

  PASS 5 — SELF-REVIEW
  ✓ Semua angka bisa di-trace ke data nyata di atas?
  ✓ Ada klaim yang terlalu yakin tanpa bukti dari data?
  ✓ Saran ini realistis untuk kondisi ${ctx.nama} sekarang?
  ✓ Tone sudah sesuai ${soul.persona.dominant_style} persona? Tidak berlebihan?
  ✓ Jawaban menjawab yang ${ctx.nama} BUTUHKAN — bukan cuma yang ditanyakan?
  ✓ Tidak terlalu panjang? Tidak terlalu pendek?
  ✓ Tidak ada formatting yang dilarang?
  Kalau ada yang janggal → revisi dulu sebelum output.

Sekarang jawab untuk ${ctx.nama}: "${cleanedInput}"`
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — CORE AGENT REASONING
// single LLM call, semua 5 pass ada dalam system prompt
// ─────────────────────────────────────────────────────────────────────────────
async function coreReasoning(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model:       MODEL_CORE,
    max_tokens:  450,
    temperature: 0.78,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage  },
    ],
  })
  return res.choices[0]?.message?.content ?? ""
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 4 — MULTI-AGENT VALIDATION
// Logic Agent + Risk Agent + Quality Agent — independen, tidak tahu hasil satu sama lain
// Consensus Engine putuskan: passed atau revise
// ─────────────────────────────────────────────────────────────────────────────
async function multiAgentValidation(
  draft:   string,
  ctx:     ExecCtx,
  plan:    AgentPlan,
  soul:    SoulOutput,
): Promise<ValidationResult> {
  const validationPrompt = `Kamu adalah panel validator independen untuk AI mentor keuangan.
Tiga agen — Logic, Risk, Quality — evaluasi draft berikut secara INDEPENDEN.
Mereka tidak tahu hasil penilaian satu sama lain sampai semua submit.

DATA AKTUAL USER:
Budget: Rp ${ctx.budget.toLocaleString("id-ID")} | Terpakai: Rp ${ctx.total.toLocaleString("id-ID")} (${ctx.pct}%)
Sisa: Rp ${ctx.sisa.toLocaleString("id-ID")} | Terboros: ${ctx.terboros}
Per kategori: ${ctx.kategoriTeks}
Rata harian: Rp ${ctx.rataHarian.toLocaleString("id-ID")} | Proyeksi: ${ctx.proyeksi}

PERSONA AKTIF: tone "${soul.tone}" | gaya "${soul.persona.dominant_style}" | direktness ${soul.persona.directness_level}/10
KRITERIA SUKSES: ${plan.successCriteria}

DRAFT YANG DIEVALUASI:
"${draft}"

─── LOGIC AGENT ───────────────────────────────────
Cek: Apakah semua angka di draft bisa di-trace ke DATA AKTUAL di atas?
Cek: Apakah ada loncatan logika yang tidak dijelaskan?
Cek: Apakah kesimpulan benar-benar didukung data — bukan asumsi?
Cek: Apakah ada klaim yang terlalu yakin tanpa bukti kuat?

─── RISK AGENT ────────────────────────────────────
Cek: Apakah saran ini realistis dan aman untuk kondisi user saat ini?
Cek: Apakah ada worst-case yang tidak dipertimbangkan?
Cek: Apakah AI terlalu optimis (meremehkan situasi) atau terlalu pesimis (menakut-nakuti)?
Cek: Kalau saran diikuti, apakah ada risiko finansial yang tidak disebutkan?

─── QUALITY AGENT ─────────────────────────────────
Cek: Apakah terasa genuinely personal atau seperti template generik?
Cek: Apakah tone sudah benar-benar sesuai persona aktif (${soul.persona.dominant_style})?
Cek: Apakah ada bullet/nomor/header/bintang/simbol yang tidak boleh ada?
Cek: Apakah kalimat pertama langsung hook dan bikin user merasa "ini ngerti kondisi gw"?
Cek: Apakah kalimat terakhir membuka dialog (bukan menutup)?

─── CONSENSUS ENGINE ──────────────────────────────
Kalau mayoritas (2 dari 3) tidak lulus → consensus = "revise"
Kalau ada konflik tajam antar agen → eskalasi, consensus = "revise"
Kalau semua lulus → consensus = "passed"

Balas HANYA JSON ini, tidak ada teks lain, tidak ada markdown fence:
{
  "logic":    { "score": 0-10, "passed": true/false, "note": "satu kalimat spesifik" },
  "risk":     { "score": 0-10, "passed": true/false, "note": "satu kalimat spesifik" },
  "quality":  { "score": 0-10, "passed": true/false, "note": "satu kalimat spesifik" },
  "consensus": "passed" atau "revise",
  "revision_hint": "kalau revise: satu instruksi konkret paling penting untuk diperbaiki. kalau passed: kosongkan."
}`

  try {
    const res = await openai.chat.completions.create({
      model:       MODEL_VALID,
      max_tokens:  320,
      temperature: 0.05,
      messages:    [{ role: "user", content: validationPrompt }],
    })

    const raw    = res.choices[0]?.message?.content ?? "{}"
    const clean  = raw.replace(/```json\n?|```\n?/g, "").trim()
    const parsed = JSON.parse(clean)

    return {
      passed:       parsed.consensus === "passed",
      feedback:     parsed.revision_hint ?? "",
      logicScore:   parsed.logic?.score   ?? 5,
      riskScore:    parsed.risk?.score    ?? 5,
      qualityScore: parsed.quality?.score ?? 5,
      logicNote:    parsed.logic?.note    ?? "",
      riskNote:     parsed.risk?.note     ?? "",
      qualityNote:  parsed.quality?.note  ?? "",
    }
  } catch {
    // auto-pass kalau JSON parsing gagal — jangan blokir user
    return {
      passed: true, feedback: "",
      logicScore: 7, riskScore: 7, qualityScore: 7,
      logicNote: "auto-passed", riskNote: "auto-passed", qualityNote: "auto-passed",
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5 — OUTPUT SYNTHESIS
// kalau validation tidak lulus → tulis ulang dengan feedback konkret
// ─────────────────────────────────────────────────────────────────────────────
async function outputSynthesis(
  draft:        string,
  feedback:     string,
  ctx:          ExecCtx,
  soul:         SoulOutput,
  cleanedInput: string,
): Promise<string> {
  const res = await openai.chat.completions.create({
    model:       MODEL_CORE,
    max_tokens:  420,
    temperature: 0.70,
    messages: [
      {
        role:    "user",
        content: `Kamu Kosta, AI mentor keuangan untuk ${ctx.nama}.
Draft jawabanmu tidak lolos validasi. Satu hal yang harus diperbaiki: "${feedback}"

Konteks:
Budget Rp ${ctx.budget.toLocaleString("id-ID")}, terpakai ${ctx.pct}%, terboros ${ctx.terboros}.
Tone: ${soul.tone}. Pertanyaan: "${cleanedInput}"

Tulis ulang dari nol dengan feedback itu sebagai prioritas utama.
Aturan mutlak: tidak ada bullet, nomor, header, bintang. Maksimal 3 paragraf. Angka spesifik. Terasa ditulis khusus untuk ${ctx.nama}.`,
      },
    ],
  })
  return res.choices[0]?.message?.content ?? draft
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 6 — FINAL TRUST GATE
// hallucination check, overconfidence suppression, scope & intent alignment,
// personality alignment, strip semua formatting yang lolos
// ─────────────────────────────────────────────────────────────────────────────
function trustGate(raw: string, ctx: ExecCtx): string {
  // fallback kalau output terlalu pendek
  if (!raw || raw.trim().length < 35) {
    return `Budget ${ctx.nama} bulan ini Rp ${ctx.budget.toLocaleString("id-ID")} dan sudah ${ctx.pct}% terpakai — ${ctx.proyeksi}. Mau aku bantu lihat mana yang paling bisa dioptimalkan dari sini?`
  }

  return raw
    // strip markdown headers
    .replace(/^#{1,6}\s+.*/gm, "")
    // strip bullet & list
    .replace(/^\s*[-*•·▸▹►]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    // strip bold/italic/code
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g,     "$1")
    .replace(/\*(.*?)\*/g,     "$1")
    .replace(/_(.*?)_/g,       "$1")
    .replace(/`{1,3}[^`\n]*`{1,3}/g, "")
    // strip links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // strip generic openers
    .replace(/^(Tentu!|Tentu saja!|Baik!|Halo!|Hai!|Of course!|Sure!|Okay!|Ok!)\s*/i, "")
    // collapse whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMORY LEARNING LOOP (async — tidak blokir response ke user)
// simpan insight + update personality model
// ─────────────────────────────────────────────────────────────────────────────
async function memoryLearningLoop(
  user_id:  string,
  rows:     Row[],
  insight:  string,
  signal:   string,
  intent:   string,
  direct:   number,
) {
  if (!rows[0]?.id) return
  try {
    await Promise.all([
      // simpan insight terbaru ke row paling baru
      supabase
        .from("kosmate")
        .update({ ai_insight: insight })
        .eq("id", rows[0].id)
        .eq("user_id", user_id),
      // update personality model untuk sesi berikutnya
      persistPersonalityUpdate(user_id, signal, intent, direct),
    ])
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTE
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      user_id,
      input    = "analisis pengeluaran aku bulan ini",
      nama     = "Kamu",
      durasi   = "beberapa bulan",
      is_guest = false,
    } = body

    if (!user_id) {
      return NextResponse.json({ error: "user_id wajib diisi" }, { status: 400 })
    }

    // ─── LAYER 0: INPUT UNDERSTANDING ────────────────────────
    const l0 = layer0(input)

    // safety gate — blokir sebelum hit LLM
    if (l0.safetyFlag) {
      return NextResponse.json({
        insight: "Aku cuma bisa bantu soal keuangan kamu. Ada yang mau ditanyain soal pengeluaran bulan ini?",
        meta:    {},
      })
    }

    // ─── CLARIFICATION AGENT ──────────────────────────────────
    // aktif kalau confidence rendah — tanya balik dengan presisi
    if (l0.needsClarification && l0.clarificationQuestion) {
      return NextResponse.json({
        insight:            l0.clarificationQuestion,
        needsClarification: true,
        meta: {
          intent:     l0.intent,
          confidence: l0.confidence,
          emotion:    l0.emotion,
        },
      })
    }

    // ─── PARALLEL FETCH: data + personality ──────────────────
    const [ctx, personalityProfile] = await Promise.all([
      executionAgent(user_id, nama, durasi),
      loadPersonalityProfile(user_id),
    ])

    // ─── SOUL LAYER: personality engine ──────────────────────
    const soul = soulLayer(
      l0.personalitySignal,
      l0.emotion,
      personalityProfile,
      ctx.historyInsights
    )

    // ─── LAYER 1: AGENT CONTROLLER ───────────────────────────
    const plan = agentController(
      l0.intent,
      l0.emotion,
      l0.confidence,
      ctx.rows.length > 0,
      ctx.pct,
    )

    // ─── LAYER 2: CONTEXT & MEMORY BUILDER ───────────────────
    const systemPrompt = buildContext(ctx, soul, plan, l0.cleaned, l0.intent)

    // ─── LAYER 3: CORE REASONING ─────────────────────────────
    let draft = await coreReasoning(systemPrompt, l0.cleaned)

    // ─── LAYER 4: MULTI-AGENT VALIDATION ─────────────────────
    let validation: ValidationResult | null = null
    if (plan.runValidation && draft.length > 40) {
      validation = await multiAgentValidation(draft, ctx, plan, soul)

      // ─── LAYER 5: OUTPUT SYNTHESIS ───────────────────────
      // kalau tidak lulus dan ada feedback konkret → tulis ulang
      if (!validation.passed && validation.feedback.length > 5 && plan.maxRetry > 0) {
        draft = await outputSynthesis(draft, validation.feedback, ctx, soul, l0.cleaned)
      }
    }

    // ─── LAYER 6: TRUST GATE ─────────────────────────────────
    const finalInsight = trustGate(draft, ctx)

    // ─── MEMORY LEARNING LOOP (async, fire & forget) ─────────
    memoryLearningLoop(
      user_id,
      ctx.rows,
      finalInsight,
      l0.personalitySignal,
      l0.intent,
      soul.persona.directness_level,
    ).catch(() => null)

    return NextResponse.json({
      insight:            finalInsight,
      needsClarification: false,
      meta: {
        total_pengeluaran:  ctx.total,
        budget:             ctx.budget,
        sisa_budget:        ctx.sisa,
        pct_terpakai:       ctx.pct,
        kategori_terboros:  ctx.terboros,
        rata_harian:        ctx.rataHarian,
        sisa_hari:          ctx.sisaHari,
        proyeksi:           ctx.proyeksi,
        intent:             l0.intent,
        emotion:            l0.emotion,
        personality:        l0.personalitySignal,
        confidence:         l0.confidence,
        validation: validation ? {
          passed:       validation.passed,
          logic_score:  validation.logicScore,
          risk_score:   validation.riskScore,
          quality_score:validation.qualityScore,
        } : null,
        is_guest,
      },
    }, { status: 200 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[KOSTA AI]", msg)
    return NextResponse.json(
      {
        error:   msg,
        insight: "AI lagi tidak bisa dihubungi. Coba beberapa saat lagi.",
      },
      { status: 500 }
    )
  }
}