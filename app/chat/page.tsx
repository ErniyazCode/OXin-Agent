"use client"

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PlaceholdersAndVanishInput,
  type PlaceholdersAndVanishInputHandle,
} from "@/components/ui/placeholders-and-vanish-input"
import { GradientBlur } from "@/components/ui/gradient-blur"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { usePhantomWallet } from "@/hooks/use-phantom-wallet"
import { AGENT_PERSONAS } from "@/lib/agent-personas"
import { ArrowLeft, MessageSquare, RefreshCw, Shield, TrendingUp, Wallet, Zap } from "lucide-react"
import TwitterIcon from "@/scr/logoSocial/twitter.png"
import DexScreenerIcon from "@/scr/logoSocial/dexscanner.png"

interface Token {
  mint: string
  balance: number
  decimals: number
  symbol?: string
  name?: string
  logoURI?: string
  price?: number
  value?: number
  change24h?: number
}

interface ChatMessage {
  id: string
  role: "user" | "agent"
  agentId: string
  content: string
  timestamp: number
}

const MAX_HISTORY = 12

const createInitialConversations = () => {
  const now = Date.now()
  const record: Record<string, ChatMessage[]> = {}
  for (const persona of AGENT_PERSONAS) {
    record[persona.id] = [
      {
        id: `${persona.id}-greeting`,
        role: "agent",
        agentId: persona.id,
        content: persona.greeting,
        timestamp: now,
      },
    ]
  }
  return record
}

export default function ChatPage() {
  const { connected, publicKey, connectWallet, disconnectWallet, walletError, clearWalletError } = usePhantomWallet()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [pendingInput, setPendingInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(
    () => createInitialConversations(),
  )
  const [selectedAgentId, setSelectedAgentId] = useState<string>(AGENT_PERSONAS[0]?.id ?? "core")
  const inputFormRef = useRef<PlaceholdersAndVanishInputHandle | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  const selectedAgent = useMemo(
    () => AGENT_PERSONAS.find((agent) => agent.id === selectedAgentId) ?? AGENT_PERSONAS[0],
    [selectedAgentId],
  )

  const activeConversation = conversations[selectedAgentId] ?? []

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const renderInline = (text: string): ReactNode[] => {
    const segments = text.split(/(\*\*[^*]+\*\*)/g)
    return segments.map((segment, index) => {
      if (segment.startsWith("**") && segment.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-white">
            {segment.slice(2, -2)}
          </strong>
        )
      }
      if (!segment) return null
      return <Fragment key={index}>{segment}</Fragment>
    })
  }

  const renderMessageContent = (content: string): ReactNode => {
    // Удаляем разделители ---
    const cleanedContent = content.replace(/^\s*-{3,}\s*$/gm, "")
    
    const blocks = cleanedContent.split(/\n\s*\n/)
    return blocks
      .map((rawBlock, blockIndex) => {
        const block = rawBlock.trim()
        if (!block) return null
        const lines = block.split("\n").map((line) => line.trim())

        // Проверка на таблицу (markdown table)
        const isTable = lines.some((line) => line.includes("|"))
        if (isTable) {
          const tableLines = lines.filter((line) => line.includes("|"))
          if (tableLines.length >= 2) {
            const headers = tableLines[0]
              .split("|")
              .map((h) => h.trim())
              .filter((h) => h)
            const rows = tableLines
              .slice(2) // Пропускаем header и separator
              .map((row) =>
                row
                  .split("|")
                  .map((cell) => cell.trim())
                  .filter((cell) => cell),
              )

            return (
              <div key={`table-${blockIndex}`} className="my-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      {headers.map((header, idx) => (
                        <th key={idx} className="px-3 py-2 text-left font-bold text-white">
                          {renderInline(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-white/10">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-white/80">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        }

        // Проверка на заголовок (### или ##) - делаем жирным и подчеркнутым
        if (lines.length === 1 && /^#{2,3}\s+/.test(lines[0])) {
          const text = lines[0].replace(/^#{2,3}\s+/, "")
          return (
            <h3 key={`heading-${blockIndex}`} className="text-lg font-bold text-white mt-4 mb-2 underline decoration-primary decoration-2 underline-offset-4">
              {renderInline(text)}
            </h3>
          )
        }

        const isOrderedList = lines.every((line) => /^\d+\.\s+/.test(line))
        const isUnorderedList = lines.every((line) => /^[-*]\s+/.test(line))

        if (isOrderedList) {
          return (
            <ol key={`list-${blockIndex}`} className="list-decimal space-y-1 pl-5 text-white/80">
              {lines.map((line, lineIndex) => {
                const cleaned = line.replace(/^\d+\.\s+/, "")
                return <li key={`list-item-${blockIndex}-${lineIndex}`}>{renderInline(cleaned)}</li>
              })}
            </ol>
          )
        }

        if (isUnorderedList) {
          return (
            <ul key={`list-${blockIndex}`} className="list-disc space-y-1 pl-5 text-white/80">
              {lines.map((line, lineIndex) => {
                const cleaned = line.replace(/^[-*]\s+/, "")
                return <li key={`list-item-${blockIndex}-${lineIndex}`}>{renderInline(cleaned)}</li>
              })}
            </ul>
          )
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="leading-relaxed text-white/80">
            {lines.map((line, lineIndex) => (
              <Fragment key={`line-${blockIndex}-${lineIndex}`}>
                {renderInline(line)}
                {lineIndex < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        )
      })
      .filter(Boolean)
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (connected && publicKey) {
      fetchTokens()
    } else {
      setTokens([])
    }
  }, [connected, publicKey])

  const fetchTokens = async () => {
    if (!publicKey) return
    setLoadingTokens(true)
    setChatError(null)
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch tokens")
      }

      const data = await response.json()
      setTokens(data.tokens)
    } catch (_error) {
      setChatError("Unable to load tokens. Please try again in a moment.")
      setTokens([])
    } finally {
      setLoadingTokens(false)
    }
  }

  const portfolioValue = useMemo(
    () => tokens.reduce((sum, token) => sum + (token.value || 0), 0),
    [tokens],
  )

  const topHoldings = useMemo(() => {
    const total = portfolioValue || 1
    return tokens
      .filter((token) => (token.value || 0) > 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 3)
      .map((token) => ({
        label: token.symbol || token.name || token.mint.slice(0, 4),
        percentage: ((token.value || 0) / total) * 100,
      }))
  }, [portfolioValue, tokens])

  const displayError = useMemo(() => chatError || walletError, [chatError, walletError])

  const dismissError = () => {
    setChatError(null)
    clearWalletError()
  }

  const handleSendMessage = async () => {
    const trimmed = pendingInput.trim()
    if (!trimmed || isSending) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      agentId: selectedAgentId,
      content: trimmed,
      timestamp: Date.now(),
    }

    setConversations((prev) => ({
      ...prev,
      [selectedAgentId]: [...(prev[selectedAgentId] ?? []), userMessage],
    }))
    setPendingInput("")
    setIsSending(true)
    setChatError(null)

    // Прокрутка только когда пользователь отправляет сообщение
    setTimeout(() => scrollToBottom(), 100)

    try {
      const historyPayload = [...activeConversation, userMessage]
        .slice(-MAX_HISTORY)
        .map((item) => ({
          role: item.role === "user" ? "user" : "agent",
          content: item.content,
        }))

      const response = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          message: trimmed,
          history: historyPayload,
          walletAddress: publicKey,
          tokens,
        }),
      })

      if (!response.ok) {
        throw new Error("Agent is temporarily unavailable. Please try again later.")
      }

      const result = await response.json()
      if (!result.success || !result.reply) {
        throw new Error(result.error || "The agent could not generate a reply.")
      }

      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        agentId: selectedAgentId,
        content: result.reply,
        timestamp: Date.now(),
      }

      setConversations((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] ?? []), agentMessage],
      }))
    } catch (error: any) {
      setChatError(error?.message || "Failed to receive a response from the agent.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <WebGLShader />
      <div className="fixed inset-0 pointer-events-none z-100">
        <GradientBlur radius={25} opacityDecay={0.03} color={[64, 224, 208]} />
      </div>

      <div className="relative min-h-screen">
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <ArrowLeft className="h-5 w-5" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-deMbW7xBQWsHf5z1iFWQ7gS2a6Uw6E.png"
                    alt="OXin Agent Logo"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                  />
                </div>
                <span className="font-julius text-xl font-bold">OXin Agent</span>
              </div>
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
              <Link href="/analyze" className="transition-colors hover:text-foreground">
                Analyze
              </Link>
              <Link href="/chat" className="transition-colors hover:text-foreground">
                Chat with Agent
              </Link>
            </nav>
            {connected ? (
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2">
                  <span className="font-mono text-sm">
                    {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                  </span>
                </div>
                <Button onClick={disconnectWallet} variant="outline">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                className="gap-2"
                onClick={async () => {
                  try {
                    await connectWallet()
                  } catch (_error) {
                    setChatError("Failed to connect wallet. Please try again.")
                  }
                }}
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          {displayError && (
            <Card className="mb-6 border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">{displayError}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={dismissError}>
                  Dismiss
                </Button>
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-6">
              <Card className="border-border/50 bg-black/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Connected Agent</p>
                    <h2 className="text-xl font-semibold">{selectedAgent?.name}</h2>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Live
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-white/80">{selectedAgent?.tagline}</p>
                <div className="mt-2 grid gap-1 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-primary" />
                    <span>{selectedAgent?.tone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-chart-3" />
                    <span>{selectedAgent?.strategy}</span>
                  </div>
                </div>
              </Card>

              <Card className="border-border/50 bg-black/60 p-6 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Portfolio Snapshot
                  </h3>
                  {connected && (
                    <Button variant="ghost" size="sm" className="gap-1" onClick={fetchTokens} disabled={loadingTokens}>
                      <RefreshCw className={`h-4 w-4 ${loadingTokens ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">
                      ${portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {topHoldings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No holdings to display</p>
                    ) : (
                      topHoldings.map((holding) => (
                        <div key={holding.label} className="flex items-center justify-between text-sm">
                          <span>{holding.label}</span>
                          <span className="text-muted-foreground">{holding.percentage.toFixed(1)}%</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                {AGENT_PERSONAS.map((agent) => {
                  const isActive = agent.id === selectedAgentId
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/40 bg-black/40 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border/30">
                          <Image
                            src={agent.avatar}
                            alt={agent.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {agent.emoji} {agent.name}
                            </span>
                            <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] uppercase">
                              {agent.riskProfile}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-white/70">{agent.description}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section>
              <Card className="flex h-[720px] flex-col border-border/50 bg-black/60 backdrop-blur-xl">
                <div className="border-b border-border/40 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">Chat with {selectedAgent?.name}</h1>
                      <p className="text-sm text-white/80">{selectedAgent?.conversationStyle}</p>
                    </div>
                  </div>
                </div>

                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 scrollbar-dark">
                  <div className="space-y-6">
                    {activeConversation.map((message) => {
                      const isUser = message.role === "user"
                      return (
                        <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-lg transition ${
                              isUser
                                ? "border-primary/40 bg-primary/30 text-white"
                                : "border-border/40 bg-black/70 text-white/80"
                            }`}
                          >
                            {!isUser && (
                              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
                                <span>{selectedAgent?.emoji}</span>
                                <span>{selectedAgent?.name}</span>
                              </div>
                            )}
                            <div className="space-y-2 text-sm leading-relaxed">{renderMessageContent(message.content)}</div>
                            <span className="mt-2 block text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                              {isClient
                                ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : ""}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {isSending && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-full border border-border/40 bg-black/70 px-4 py-2 text-xs text-muted-foreground">
                          <Zap className="h-3 w-3 animate-pulse text-primary" />
                          Agent is typing...
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/40 p-6">
                  <div className="mb-3 text-center text-xs text-white/80">
                    <span>{selectedAgent?.recommendationStyle}</span>
                  </div>
                  <div className={`flex flex-col gap-3 ${isSending ? "pointer-events-none opacity-70" : ""}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <PlaceholdersAndVanishInput
                          placeholders={selectedAgent?.placeholders ?? ["Ask something about your portfolio"]}
                          onChange={(event) => setPendingInput(event.target.value)}
                          onSubmit={(event) => {
                            event.preventDefault()
                            handleSendMessage()
                          }}
                          showSubmitButton={false}
                          className="max-w-none"
                          ref={inputFormRef}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-12 shrink-0 rounded-full bg-zinc-800 px-6 text-white transition-colors hover:bg-zinc-700"
                        onClick={() => inputFormRef.current?.submit()}
                        disabled={isSending || !pendingInput.trim()}
                      >
                        Send
                      </Button>
                    </div>
                    <p className="text-center text-xs text-white/70">
                      Advice is educational in nature. Always double-check your decisions.
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        </main>

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
                    <Link href="/#demo" className="hover:text-foreground transition-colors">
                      {"Demo"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/#features" className="hover:text-foreground transition-colors">
                      {"Features"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/#agents" className="hover:text-foreground transition-colors">
                      {"Our Agents"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/#how-it-works" className="hover:text-foreground transition-colors">
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
                  <Link
                    href="#"
                    aria-label="DexScreener"
                    className="group inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition duration-200 hover:bg-white/20"
                  >
                    <Image
                      src={DexScreenerIcon}
                      alt="DexScreener logo"
                      width={DexScreenerIcon.width}
                      height={DexScreenerIcon.height}
                      className="h-6 w-6 transition-transform duration-200 group-hover:scale-105"
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
    </>
  )
}
