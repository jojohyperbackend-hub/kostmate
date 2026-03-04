import type { Metadata } from "next"
import "@/styles/globals.css"

export const metadata: Metadata = {
  title: "KostMate",
  description: "Aplikasi manajemen keuangan anak kos",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}