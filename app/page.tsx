"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { ShinyButton } from "@/components/ui/shiny-button"
import { Timeline, type TimelineEntry } from "@/components/ui/timeline"
import { ArrowRight, Shield, TrendingUp, Wallet, Zap, BarChart3, Circle, Brain, Sparkles, Activity } from "lucide-react"
import { motion, useInView } from "framer-motion"
import { GradientButton } from "@/components/ui/gradient-button"
import { GradientBlur } from "@/components/ui/gradient-blur"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { FloatingParticles, PulseDots } from "@/components/ui/micro-animations"
import TokenSniperGlobe from "@/components/ui/token-sniper-globe"
import Image from "next/image"
import TwitterIcon from "@/scr/logoSocial/twitter.jpg"
import { useRef } from "react"

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string
  delay?: number
  width?: number
  height?: number
  rotate?: number
  gradient?: string
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
  ease: [0.23, 0.86, 0.39, 0.96] as const,
        opacity: { duration: 1.2 },
      }}
      className={className}
      style={{ position: "absolute" }}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className="absolute inset-0 rounded-full bg-linear-to-r to-transparent backdrop-blur-[2px] border-2 border-white/15 shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] after:absolute after:inset-0 after:rounded-full after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          style={{
            backgroundImage: `linear-gradient(to right, ${gradient.replace("from-", "")}, transparent)`,
          }}
        />
      </motion.div>
    </motion.div>
  )
}

export default function LandingPage() {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
  ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  }

  const featureTitleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  }

  const featureCardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: i * 0.12,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    }),
  }

  const howItWorksTitleVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.9,
        ease: [0.19, 1, 0.22, 1] as const,
      },
    },
  }

  const howItWorksStepVariants = {
    hidden: { opacity: 0, x: -40, scale: 0.96 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.75,
        delay: i * 0.14,
        ease: [0.19, 1, 0.22, 1] as const,
      },
    }),
  }

  const floatingBackdropTransition = {
    duration: 18,
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "mirror" as const,
    ease: [0.45, 0, 0.55, 1] as const,
  }

  type ChatMessage = {
    id: string
    role: "user" | "assistant"
    sender: string
    content: string
    delay: number
    timestamp: string
  }

  const conversation = useMemo<ChatMessage[]>(
    () => [
      {
        id: "msg-1",
        role: "user",
        sender: "Alex",
        content: "OXin Core, can you sweep my Phantom portfolio for anything risky?",
        delay: 600,
        timestamp: "09:14",
      },
      {
        id: "msg-2",
        role: "assistant",
        sender: "OXin Core",
        content:
          "Scanning SOL, JUP, and BONK exposures now. Liquidity health is strong, and no rug signatures detected in the last 24h.",
        delay: 1400,
        timestamp: "09:14",
      },
      {
        id: "msg-3",
        role: "user",
        sender: "Alex",
        content: "Nice. What should I rebalance first if the market pops 5%?",
        delay: 1200,
        timestamp: "09:15",
      },
      {
        id: "msg-4",
        role: "assistant",
        sender: "OXin Core",
        content:
          "Shift 12% from BONK into SOL for tighter volatility control. Set a trailing stop at $170 for SOL to protect the upside.",
        delay: 1600,
        timestamp: "09:15",
      },
      {
        id: "msg-5",
        role: "assistant",
        sender: "OXin Core",
        content:
          "Reminder: Jupiter DCA is queued for 18:00 UTC. I’ll ping you if liquidity thins or gas spikes above 40 gwei.",
        delay: 1800,
        timestamp: "09:15",
      },
    ],
    [],
  )

  const simulatedHoldings = useMemo(
    () => [
      { symbol: "SOL", allocation: "46%", value: "$216,400" },
      { symbol: "JUP", allocation: "28%", value: "$132,050" },
      { symbol: "BONK", allocation: "16%", value: "$75,420" },
      { symbol: "USDC", allocation: "10%", value: "$47,880" },
    ],
    [],
  )

  const agentsTimeline = useMemo<TimelineEntry[]>(
    () => [
      {
        title: "Agent X",
        content: (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-[0_30px_60px_rgba(5,10,30,0.55)]">
                <video
                  src="/videoAgents/X.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-56 w-full object-cover md:h-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/0 to-transparent px-6 py-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">{"Long-Horizon Strategist"}</p>
                  <p className="text-base text-white/85">{"Plans decades ahead to preserve asymmetric wins."}</p>
                </div>
              </div>

              <div className="space-y-5 text-white/75">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.35em] text-white/40">{"Profile"}</p>
                  <p className="text-xl font-semibold text-white">
                    {"Former financial titan who traded the CEO chair for multi-generational venture plays."}
                  </p>
                  <p className="text-base">
                    {"X orchestrates capital like a grandmaster—calm, methodical, and obsessed with compounding advantages over decades."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Age"}</p>
                    <p className="mt-1 text-lg text-white">{"52"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Net Worth"}</p>
                    <p className="mt-1 text-lg text-white">{"$5B"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Origin"}</p>
                    <p className="mt-1 text-lg text-white">{"Ex-CEO, Fortune 100"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Focus"}</p>
                    <p className="mt-1 text-lg text-white">{"Venture Architecture"}</p>
                  </div>
                </div>
                <blockquote className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-base italic text-white/80">
                  {"“Life isn’t a race. I can wait as long as it takes to secure the superior outcome.”"}
                </blockquote>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Agent Avenna",
        content: (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-[0_30px_60px_rgba(5,10,30,0.55)]">
                <video
                  src="/videoAgents/Avenna.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-56 w-full object-cover md:h-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/0 to-transparent px-6 py-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">{"Wall Street Disciplined"}</p>
                  <p className="text-base text-white/85">{"Fifteen years of cool-headed execution under pressure."}</p>
                </div>
              </div>

              <div className="space-y-5 text-white/75">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.35em] text-white/40">{"Profile"}</p>
                  <p className="text-xl font-semibold text-white">
                    {"Avenna engineered performance desks along Wall Street before advising elite funds worldwide."}
                  </p>
                  <p className="text-base">
                    {"Analytical to the core, she thrives in turbulence—translating chaos into conviction-grade trades."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Age"}</p>
                    <p className="mt-1 text-lg text-white">{"40"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Net Worth"}</p>
                    <p className="mt-1 text-lg text-white">{"$800M"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Origin"}</p>
                    <p className="mt-1 text-lg text-white">{"Wall Street Operator"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Focus"}</p>
                    <p className="mt-1 text-lg text-white">{"Macro Risk Controls"}</p>
                  </div>
                </div>
                <blockquote className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-base italic text-white/80">
                  {"“Success isn’t about instant wins. It’s the calm execution when everyone else is unraveling.”"}
                </blockquote>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Agent Tyo",
        content: (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-[0_30px_60px_rgba(5,10,30,0.55)]">
                <video
                  src="/videoAgents/Tyo.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-56 w-full object-cover md:h-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/0 to-transparent px-6 py-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-amber-200/80">{"Relentless Self-Starter"}</p>
                  <p className="text-base text-white/85">{"Built a portfolio from scratch—discipline forged in the grind."}</p>
                </div>
              </div>

              <div className="space-y-5 text-white/75">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.35em] text-white/40">{"Profile"}</p>
                  <p className="text-xl font-semibold text-white">
                    {"Tyo evolved from scrappy day trader to data-obsessed trend hunter with disciplined edge."}
                  </p>
                  <p className="text-base">
                    {"He treats every session as a new rep—tracking microstructure, sharpening reflexes, and protecting capital."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Age"}</p>
                    <p className="mt-1 text-lg text-white">{"29"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Net Worth"}</p>
                    <p className="mt-1 text-lg text-white">{"$2M"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Origin"}</p>
                    <p className="mt-1 text-lg text-white">{"Home Trading Desk"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Focus"}</p>
                    <p className="mt-1 text-lg text-white">{"Momentum Structuring"}</p>
                  </div>
                </div>
                <blockquote className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-base italic text-white/80">
                  {"“If you never leap, you never learn how high you can climb. Every day is a new shot at freedom.”"}
                </blockquote>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Agent Sweet",
        content: (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-[0_30px_60px_rgba(5,10,30,0.55)]">
                <video
                  src="/videoAgents/Sweet.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-56 w-full object-cover md:h-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/0 to-transparent px-6 py-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-pink-200/80">{"Culture Whisperer"}</p>
                  <p className="text-base text-white/85">{"Turns viral energy into hard alpha across meme markets."}</p>
                </div>
              </div>

              <div className="space-y-5 text-white/75">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.35em] text-white/40">{"Profile"}</p>
                  <p className="text-xl font-semibold text-white">
                    {"Sweet engineered meme economies into a disciplined playbook for cultural liquidity."}
                  </p>
                  <p className="text-base">
                    {"He spots narrative spikes faster than the feed refreshes—bridging humor, community, and profit."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Age"}</p>
                    <p className="mt-1 text-lg text-white">{"24"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Net Worth"}</p>
                    <p className="mt-1 text-lg text-white">{"$50M"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Origin"}</p>
                    <p className="mt-1 text-lg text-white">{"Meme Market Maker"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">{"Focus"}</p>
                    <p className="mt-1 text-lg text-white">{"Trend Arbitrage"}</p>
                  </div>
                </div>
                <blockquote className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-base italic text-white/80">
                  {"“I’m fluent in fun and serious money. Memes pay when you know how to ride the wave.”"}
                </blockquote>
              </div>
            </div>
          </div>
        ),
      },
    ],
    [],
  )

  const [visibleMessages, setVisibleMessages] = useState(0)
  const [typingRole, setTypingRole] = useState<"user" | "assistant" | null>(null)

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = []

    const scheduleSequence = () => {
      timeouts.forEach(clearTimeout)
      timeouts = []
      setVisibleMessages(0)
      setTypingRole(null)

      let cumulativeDelay = 0

      conversation.forEach((message, index) => {
        const typingLead = Math.max(message.delay - 500, 150)
        cumulativeDelay += typingLead

        timeouts.push(
          setTimeout(() => {
            setTypingRole(message.role)
          }, cumulativeDelay)
        )

        cumulativeDelay += message.delay - typingLead

        timeouts.push(
          setTimeout(() => {
            setVisibleMessages(index + 1)
            setTypingRole(null)
          }, cumulativeDelay)
        )
      })

      timeouts.push(
        setTimeout(() => {
          scheduleSequence()
        }, cumulativeDelay + 2800),
      )
    }

    scheduleSequence()

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [conversation])

  return (
    <div className="min-h-screen relative">
  <div className="fixed inset-0 pointer-events-none z-100 hidden md:block">
        <GradientBlur radius={12} opacityDecay={0.03} color={[64, 224, 208]} />
      </div>

      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-xl sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-deMbW7xBQWsHf5z1iFWQ7gS2a6Uw6E.png"
                alt="OXin Agent Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold text-balance" style={{ fontFamily: "var(--font-julius)" }}>
              {"OXin Agent"}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {"Demo"}
            </Link>
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {"Features"}
            </Link>
            <Link href="#agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {"Our Agents"}
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {"How It Works"}
            </Link>
            <Link href="/analyze" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {"Analyze"}
            </Link>
            <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {"Chat with Agent"}
            </Link>
          </nav>
          <Link href="/analyze" className="inline-flex">
            <RainbowButton className="gap-2 px-6 text-sm font-semibold">
              <span>{"Launch App"}</span>
              <ArrowRight className="w-4 h-4" />
            </RainbowButton>
          </Link>
        </div>
      </header>

      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#030303] pt-8">
  <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent to-rose-500/5 blur-3xl" />

        <div className="absolute inset-0 overflow-hidden">
          <ElegantShape
            delay={0.3}
            width={600}
            height={140}
            rotate={12}
            gradient="from-indigo-500/[0.15]"
            className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
          />

          <ElegantShape
            delay={0.5}
            width={500}
            height={120}
            rotate={-15}
            gradient="from-rose-500/[0.15]"
            className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
          />

          <ElegantShape
            delay={0.4}
            width={300}
            height={80}
            rotate={-8}
            gradient="from-violet-500/[0.15]"
            className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
          />

          <ElegantShape
            delay={0.6}
            width={200}
            height={60}
            rotate={20}
            gradient="from-amber-500/[0.15]"
            className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
          />

          <ElegantShape
            delay={0.7}
            width={150}
            height={40}
            rotate={-25}
            gradient="from-cyan-500/[0.15]"
            className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
          />
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              custom={0}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/3 border border-white/8 mb-8 md:mb-12 mt-8"
            >
              <Circle className="h-2 w-2 fill-rose-500/80" />
              <span className="text-sm text-white/60 tracking-wide">{"Control the Chaos. Own the Future."}</span>
            </motion.div>

            <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 tracking-tight leading-tight">
                <span className="bg-clip-text text-transparent bg-linear-to-b from-white to-white/80 block">
                  {"The AI Agent That Thinks Before You Trade"}
                </span>
              </h1>
            </motion.div>

            <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
              <p className="text-base sm:text-lg md:text-xl text-white mb-8 leading-relaxed font-light tracking-wide max-w-3xl mx-auto px-4">
                {"Meet OXin Agent — your AI-powered strategist that analyzes your portfolio, detects risks, and makes smarter crypto decisions with intelligence, not emotion."}
              </p>
            </motion.div>

            <motion.div custom={3} variants={fadeUpVariants} initial="hidden" animate="visible" className="mb-16">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/analyze">
                  <GradientButton className="gap-2 text-base px-8">
                    {"Start Analysis"}
                    <ArrowRight className="w-5 h-5" />
                  </GradientButton>
                </Link>
                <Link href="#demo">
                  <GradientButton variant="variant" className="gap-2 text-base px-8">
                    {"Watch Demo"}
                  </GradientButton>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

  <div className="absolute inset-0 bg-linear-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />
        {/* Smooth fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
      </section>

      {/* Token Sniper Globe 3D Section */}
      <section className="relative py-32 overflow-hidden bg-black">
        {/* Smooth fade from previous section */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-20" />
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-cyan-500/5" />
        <FloatingParticles count={40} size="lg" color="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 space-y-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 ring-1 ring-emerald-400/20 mb-6"
            >
              <Shield className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-emerald-200 tracking-widest">REAL-TIME THREAT DETECTION</span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold mb-4"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-400 bg-[length:200%_auto] animate-gradient">
                Token Sniper Dashboard
              </span>
            </motion.h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
              Live 3D visualization of token scans across Solana. Watch real-time alerts, threat detection, and security analysis as they happen.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <TokenSniperGlobe />
          </motion.div>
          
          {/* Feature highlights below globe */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto"
          >
            {[
              { icon: Shield, title: "Rug Detection", desc: "AI identifies suspicious patterns" },
              { icon: Zap, title: "Instant Alerts", desc: "Real-time notifications on threats" },
              { icon: Activity, title: "24/7 Monitoring", desc: "Continuous Solana network scanning" }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="group relative"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500" />
                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-emerald-400/30 transition-all">
                  <feature.icon className="h-8 w-8 text-emerald-400 mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
        {/* Smooth fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#050505]/80 pointer-events-none z-20" />
      </section>

      <motion.section
        id="demo"
        className="relative py-24 overflow-hidden bg-[#050505]"
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -120px" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
  <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-white/5" />

        {/* Floating particles background */}
        <FloatingParticles count={30} size="md" speed="slow" />
        
        <div className="relative z-10 container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mb-12 space-y-4"
          >
            <motion.span 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 ring-1 ring-emerald-400/10"
            >
              <PulseDots count={3} color="bg-emerald-400" size={2} />
              <Sparkles className="h-3 w-3" />
              {"Live AI Simulation"}
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-balance"
            >
              <span className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                {"Real-Time Intelligence in Motion"}
              </span>
            </motion.h2>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
              {
                "Watch OXin Core orchestrate a live portfolio check-in, surfacing insights and safeguards before you ever hit confirm."
              }
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
            <div className="relative rounded-3xl border border-white/8 bg-white/5 backdrop-blur-xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-emerald-400/40 to-cyan-400/40 border border-white/10 shadow-[0_10px_30px_rgba(16,255,203,0.25)]" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200/80">{"OXin Core"}</p>
                    <p className="text-base text-white/80">{"Portfolio Command Node"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-emerald-200 text-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  {"Streaming"}
                </div>
              </div>

              <div className="space-y-5">
                {conversation.slice(0, visibleMessages).map((message) => {
                  const isUser = message.role === "user"
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex max-w-[85%] items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        <div
                          className={`h-9 w-9 shrink-0 rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(12,18,32,0.45)] ${
                            isUser ? "bg-white/10" : "bg-linear-to-br from-emerald-400/30 to-cyan-400/30"
                          }`}
                        />
                        <div
                          className={`rounded-3xl border border-white/8 px-5 py-4 text-sm leading-relaxed text-white/80 shadow-[0_20px_45px_rgba(6,14,28,0.35)] ${
                            isUser ? "bg-white/10" : "bg-linear-to-br from-emerald-500/10 to-cyan-500/10"
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                            <span>{message.sender}</span>
                            <span className="h-1 w-1 rounded-full bg-white/30" />
                            <span>{message.timestamp}</span>
                          </div>
                          <p className="text-base text-white/80">{message.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {typingRole && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${typingRole === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex items-start gap-3 ${typingRole === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`h-9 w-9 shrink-0 rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(12,18,32,0.45)] ${
                          typingRole === "user"
                            ? "bg-white/10"
                            : "bg-linear-to-br from-emerald-400/30 to-cyan-400/30"
                        }`}
                      />
                      <div className="rounded-3xl border border-white/8 bg-white/10 px-5 py-4 text-sm text-white/70">
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((dot) => (
                            <span
                              key={dot}
                              className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
                              style={{ animationDelay: `${dot * 120}ms` }}
                            />
                          ))}
                          <span className="ml-2 text-xs uppercase tracking-[0.35em] text-white/40">
                            {typingRole === "assistant" ? "Composing" : "Drafting"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <aside className="relative rounded-3xl border border-white/8 bg-white/5 backdrop-blur-xl p-6 md:p-7">
              <div className="mb-6 space-y-2">
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">{"Portfolio Pulse"}</p>
                <h3 className="text-2xl font-semibold text-white">{"Phantom Wallet"}</h3>
                <p className="text-sm text-white/60">{"Synced 12 sec ago"}</p>
              </div>

              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">{"Total Balance"}</p>
                <p className="mt-2 text-3xl font-semibold">{"$471,750"}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-200/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  {"+3.8% today"}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {simulatedHoldings.map((holding) => (
                  <div
                    key={holding.symbol}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 text-center leading-9 text-white/70 font-semibold">
                        {holding.symbol}
                      </span>
                      <div>
                        <p className="text-base font-medium text-white/80">{holding.value}</p>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/40">{holding.symbol}</p>
                      </div>
                    </div>
                    <span className="text-sm text-white/60">{holding.allocation}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.35em] text-white/40">{"Alerts"}</span>
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-emerald-100 text-xs">{"All Clear"}</span>
                </div>
                <p className="mt-3 text-white/80">
                  {"Next auto-check scheduled in 15 minutes. I’ll surface liquidity changes instantly."}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        id="features"
        className="container mx-auto px-4 py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "0px 0px -120px 0px" }}
      >
        <motion.div className="text-center mb-16 space-y-4" variants={featureTitleVariants}>
          <h2 className="text-4xl md:text-5xl font-bold text-balance">{"Powerful Features"}</h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            {"Everything you need to analyze and optimize your crypto portfolio"}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <motion.div className="relative rounded-2xl" variants={featureCardVariants} custom={0}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors relative rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-cyan-300" />
              </div>
              <h3 className="text-xl font-semibold">{"Multi-Wallet Support"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Connect Phantom and watch every token appear in a single, beautifully organized view."}
              </p>
            </Card>
          </motion.div>

          <motion.div className="relative rounded-2xl" variants={featureCardVariants} custom={1}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors relative rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                <Brain className="w-6 h-6 text-fuchsia-300" />
              </div>
              <h3 className="text-xl font-semibold">{"AI-Powered Analysis"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Advanced AI studies each token, reviewing price history, liquidity flows, and hidden risks before you act."}
              </p>
            </Card>
          </motion.div>

          <motion.div className="relative rounded-2xl" variants={featureCardVariants} custom={2}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors relative rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-300" />
              </div>
              <h3 className="text-xl font-semibold">{"Scam Detection"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Automatically identify suspicious tokens and protect yourself from rug pulls."}
              </p>
            </Card>
          </motion.div>

          <motion.div className="relative rounded-2xl" variants={featureCardVariants} custom={3}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors relative rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-chart-3" />
              </div>
              <h3 className="text-xl font-semibold">{"Price Predictions"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Get AI-generated forecasts based on historical data and market trends."}
              </p>
            </Card>
          </motion.div>

          <motion.div className="relative rounded-2xl" variants={featureCardVariants} custom={4}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors relative rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-chart-4" />
              </div>
              <h3 className="text-xl font-semibold">{"Portfolio Insights"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Visualize your holdings with interactive charts and detailed breakdowns."}
              </p>
            </Card>
          </motion.div>

          <motion.div className="relative rounded-2xl" variants={featureCardVariants} custom={5}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors relative rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-chart-5/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-chart-5" />
              </div>
              <h3 className="text-xl font-semibold">{"Real-Time Data"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Access live prices, volume, and market data from multiple sources."}
              </p>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      <section id="agents" className="relative overflow-hidden bg-[#050505] py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(120,120,120,0.12),transparent_60%)]" />
        <Timeline
          className="relative z-10 mx-auto w-full px-4 md:px-8 lg:px-12"
          heading={
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as const }}
              className="space-y-4"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                {"OXin Core Collective"}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-balance text-white">
                {"Meet the Agents Behind the Signals"}
              </h2>
              <p className="text-lg md:text-xl text-white/65 max-w-2xl">
                {"Each persona fuses lived experience with autonomous analysis—so your trades inherit the instincts of operators who already mastered the game."}
              </p>
            </motion.div>
          }
          data={agentsTimeline}
        />
      </section>

      {/* How It Works */}
      <motion.section
        id="how-it-works"
  className="container relative mx-auto overflow-hidden rounded-4xl border border-white/5 bg-white/3 px-4 py-20 backdrop-blur"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "0px 0px -120px" }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          animate={{ opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, repeatType: "mirror" }}
        >
          <motion.div
            className="absolute h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"
            style={{ left: "5%", top: "-10%" }}
            animate={{ y: [0, 35, 0], x: [0, 20, -10, 0] }}
            transition={floatingBackdropTransition}
          />
          <motion.div
            className="absolute h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl"
            style={{ right: "8%", top: "20%" }}
            animate={{ y: [0, -25, 10, 0], x: [0, -18, 12, 0] }}
            transition={{ ...floatingBackdropTransition, duration: 16 }}
          />
          <motion.div
            className="absolute h-56 w-56 rounded-full bg-purple-500/15 blur-3xl"
            style={{ left: "38%", bottom: "-18%" }}
            animate={{ y: [0, 28, -10, 0], x: [0, 15, -20, 0] }}
            transition={{ ...floatingBackdropTransition, duration: 20 }}
          />
        </motion.div>

        <motion.div className="text-center mb-16 space-y-4" variants={howItWorksTitleVariants}>
          <h2 className="text-4xl md:text-5xl font-bold text-balance">{"How It Works"}</h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            {"Get professional portfolio analysis in three simple steps"}
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div className="flex gap-6 items-start" variants={howItWorksStepVariants} custom={0}>
            <div className="shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {"1"}
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">{"Connect Your Wallet"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Link Phantom and let the agent pull every on-chain detail while your keys stay safe on your device."}
              </p>
            </div>
          </motion.div>

          <motion.div className="flex gap-6 items-start" variants={howItWorksStepVariants} custom={1}>
            <div className="shrink-0 w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-lg">
              {"2"}
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">{"View Your Portfolio"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"See all your tokens, their current values, and performance metrics in a beautiful dashboard."}
              </p>
            </div>
          </motion.div>

          <motion.div className="flex gap-6 items-start" variants={howItWorksStepVariants} custom={2}>
            <div className="shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
              {"3"}
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">{"Get AI Analysis"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {"Tap analyze and watch the agent examine every token, surfacing tailored recommendations and risk signals."}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="text-center mt-12">
          <Link href="/analyze" className="inline-flex">
            <ShinyButton className="px-8 text-base">
              <span>{"Try It Now"}</span>
              <ArrowRight className="w-5 h-5" />
            </ShinyButton>
          </Link>
        </div>
      </motion.section>

      {/* Stats Section with CTA */}
      <section className="relative py-32 pb-40 overflow-hidden bg-black">
        {/* REDUCED ROTATING GRADIENT - Contained */}
        <motion.div
          className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 opacity-60"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ 
            transformOrigin: "center center",
            filter: "blur(40px)"
          }}
        />
        
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-violet-950/20 to-black" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-2 ring-1 ring-violet-400/20 mb-6"
            >
              <Shield className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-200">PROVEN TRACK RECORD</span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold mb-4"
            >
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Trusted by DeFi Professionals
              </span>
            </motion.h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Real-time intelligence powering smarter trading decisions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
              <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-2xl bg-violet-500/10 p-4 ring-1 ring-violet-400/20">
                    <TrendingUp className="h-6 w-6 text-violet-400" />
                  </div>
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
                  <AnimatedCounter value={12400} decimals={0} />+
                </div>
                <div className="text-white/60 font-medium">Portfolios Analyzed</div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
              <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/20">
                    <Shield className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
                  <AnimatedCounter value={847} decimals={0} />
                </div>
                <div className="text-white/60 font-medium">Risk Alerts Prevented</div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
              <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-400/20">
                    <BarChart3 className="h-6 w-6 text-amber-400" />
                  </div>
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-2">
                  +<AnimatedCounter value={23.5} decimals={1} />%
                </div>
                <div className="text-white/60 font-medium">Avg. Yield Optimized</div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
              <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-2xl bg-cyan-500/10 p-4 ring-1 ring-cyan-400/20">
                    <Wallet className="h-6 w-6 text-cyan-400" />
                  </div>
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  $<AnimatedCounter value={50} decimals={0} />M+
                </div>
                <div className="text-white/60 font-medium">Total Value Secured</div>
              </div>
            </motion.div>
          </div>

          {/* CTA Block - Integrated */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] as const, delay: 0.3 }}
            className="mt-32 max-w-4xl mx-auto"
          >
            <Card className="relative bg-black/40 backdrop-blur-2xl border-white/20 p-12 text-center space-y-6 overflow-visible shadow-2xl">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 rounded-3xl" />
              
              <div className="relative z-10 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-4xl md:text-5xl font-bold text-balance bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                    {"Ready to Optimize Your Portfolio?"}
                  </h2>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="text-xl text-white/70 text-pretty max-w-2xl mx-auto"
                >
                  {"Join thousands of crypto investors using AI to make smarter decisions"}
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                >
                  <Link href="/analyze" className="inline-flex">
                    <ShinyButton className="px-10 text-base group">
                      <span>{"Get Started Free"}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </ShinyButton>
                  </Link>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-center gap-6 text-sm text-white/50"
                >
                  <span className="flex items-center gap-2">
                    <Circle className="h-1.5 w-1.5 fill-emerald-400 text-emerald-400" />
                    No credit card required
                  </span>
                  <span className="flex items-center gap-2">
                    <Circle className="h-1.5 w-1.5 fill-emerald-400 text-emerald-400" />
                    Free forever
                  </span>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 relative">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-deMbW7xBQWsHf5z1iFWQ7gS2a6Uw6E.png"
                    alt="OXin Agent Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="text-lg font-bold" style={{ fontFamily: "var(--font-julius)" }}>
                  {"OXin Agent"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {"AI-powered crypto portfolio analysis for smarter investments."}
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">{"Product"}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#demo" className="hover:text-foreground transition-colors">
                    {"Demo"}
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-foreground transition-colors">
                    {"Features"}
                  </Link>
                </li>
                <li>
                  <Link href="#agents" className="hover:text-foreground transition-colors">
                    {"Our Agents"}
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-foreground transition-colors">
                    {"How It Works"}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">{"Resources"}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="https://oxin.gitbook.io/oxin-agent-documentation/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {"Documentation"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="mailto:dikipozitive@gmail.com"
                    className="hover:text-foreground transition-colors"
                  >
                    {"Support"}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">{"Socials"}</h4>
              <div className="flex items-center gap-3">
                <Link
                  href="https://x.com/oxinagent"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow OXin Agent on X"
                >
                  <Image
                    src={TwitterIcon}
                    alt="X (Twitter) logo"
                    width={TwitterIcon.width}
                    height={TwitterIcon.height}
                    className="h-8 w-8 transition-transform duration-200 hover:scale-105"
                  />
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
            {"© 2025 OXin Agent. All rights reserved."}
          </div>
        </div>
      </footer>
    </div>
  )
}
