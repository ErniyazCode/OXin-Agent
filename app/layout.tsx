import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Julius_Sans_One } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import MainIcon from "@/scr/logoSocial/mainFor.png"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const juliusSansOne = Julius_Sans_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-julius",
})

export const metadata: Metadata = {
  title: "OXin Agent - The AI Agent That Thinks Before You Trade",
  description:
    "Meet OXin Agent — your personal AI strategist for smarter crypto investing. Analyze portfolios, detect risks, and make decisions with intelligence, not emotion.",
  generator: "v0.app",
  icons: {
    icon: MainIcon.src,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased ${juliusSansOne.variable}`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
