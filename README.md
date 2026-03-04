# KostMate

Aplikasi manajemen keuangan buat anak kos. Catat pengeluaran harian, pantau budget, dan dapet insight dari AI yang beneran ngerti kondisi dompet kamu — bukan sekadar chatbot generik.

Dibangun pakai Next.js + TypeScript, Supabase buat database, Firebase buat auth Google, dan OpenRouter untuk akses LLM Llama 3.2 via Mastra MCP agent.

---

## Fitur

**Auth**
Bisa login pakai akun Google lewat Firebase, atau langsung masuk sebagai tamu tanpa perlu daftar. Kalau tamu, semua data akan dihapus otomatis saat logout.

**CRUD Pengeluaran**
Tambah, edit, hapus transaksi harian dengan form yang simpel. Tiap transaksi punya nama, nominal, kategori, tanggal, catatan opsional, dan budget bulanan.

**Dashboard**
Ringkasan budget vs pengeluaran bulan ini, progress bar yang berubah warna sesuai kondisi, dan breakdown per kategori langsung dari data nyata.

**Budget Planner**
Set budget bulanan, lihat alokasi aktual per kategori dibanding ideal, proyeksi akhir bulan berdasarkan rata-rata harian, dan top 3 pengeluaran terbesar.

**AI Mentor**
AI bisa diajak ngobrol soal keuangan atau analisis otomatis tanpa input. Outputnya personal — pakai angka spesifik dari data kamu, bukan template umum. AI juga baca gaya bahasa kamu dan menyesuaikan tone-nya.

**AI Budget Advisor**
Versi AI yang lebih fokus ke alokasi budget. Dia analisis pola pengeluaran nyata per kategori dan kasih rekomendasi konkret buat sisa hari di bulan itu.

**Proteksi Route**
Halaman `/dashboard` dan `/budget` tidak bisa diakses tanpa login. Middleware cek cookie session di server, bukan client-side doang.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Firebase Authentication |
| AI | OpenRouter — `meta-llama/llama-3.2-3b-instruct` |
| Agent | Mastra MCP (semi) |
| Styling | Tailwind CSS |
| Animasi | Framer Motion |

---

## Struktur Folder

```
src/
├── app/
│   ├── page.tsx               # Landing page
│   ├── login/page.tsx         # Auth — Google & Guest
│   ├── dashboard/page.tsx     # CRUD + AI Mentor
│   ├── budget/page.tsx        # Budget planner + AI Advisor
│   └── api/
│       ├── crud/route.ts      # GET POST PUT DELETE ke Supabase
│       ├── core/ai/route.ts   # Pipeline AI multi-layer
│       └── session/route.ts   # Set & clear cookie session
├── lib/
│   ├── firebase.ts            # Init Firebase + Google Auth
│   └── supabase.ts            # Init Supabase client
├── styles/
│   └── globals.css
└── middleware.ts              # Proteksi route via cookie
```

---

## Cara Pakai

### 1. Clone repo

```bash
git clone https://github.com/username/kostmate.git
cd kostmate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

Buat file `.env.local` di root project, isi dengan konfigurasi berikut:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Supabase — pakai service key, bukan anon key
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### 4. Buat tabel di Supabase

Buka Supabase Dashboard → SQL Editor → New Query, lalu jalankan script ini:

```sql
CREATE TABLE IF NOT EXISTS kosmate (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     varchar(255)  NOT NULL,
  nama        varchar(255)  NOT NULL,
  nominal     numeric(12,2) NOT NULL,
  kategori    varchar(50)   NOT NULL,
  tanggal     date          NOT NULL,
  catatan     text,
  budget      numeric(12,2) DEFAULT 500000,
  ai_insight  text,
  created_at  timestamp     DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kosmate_user_id ON kosmate (user_id);
CREATE INDEX IF NOT EXISTS idx_kosmate_tanggal ON kosmate (tanggal DESC);

ALTER TABLE kosmate ENABLE ROW LEVEL SECURITY;
```

### 5. Jalankan

```bash
npm run dev
```

Buka `http://localhost:3000`

---

## Catatan

- `SUPABASE_SERVICE_KEY` sengaja tidak pakai prefix `NEXT_PUBLIC_` karena hanya dipakai di server. Kalau dikasih prefix itu, key-nya bakal ke-expose ke browser.
- AI butuh minimal 1 transaksi bulan ini buat bisa analisis. Kalau belum ada data, tombol AI di budget page akan disabled.
- Akun tamu data-nya tersimpan di Supabase selama sesi aktif, tapi dihapus permanen saat logout.
- Kalau mau ganti model AI, ubah variabel `MODEL` di `src/app/api/core/ai/route.ts`.

---

## Lisensi

MIT
