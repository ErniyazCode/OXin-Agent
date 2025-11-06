"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Wallet, ArrowLeft, TrendingUp, TrendingDown, Loader2, PieChart, AlertCircle, Shield, AlertTriangle, CheckCircle, XCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { PortfolioChart } from "@/components/portfolio-chart"
import { PNLChart } from "@/components/pnl-chart"
import { GradientBlur } from "@/components/ui/gradient-blur"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import Image, { type StaticImageData } from "next/image"
import metamaskIcon from "@/scr/walletIcon/metamask.png"
import coinbaseIcon from "@/scr/walletIcon/coinbase.jpg"
import trustWalletIcon from "@/scr/walletIcon/trustwallet.jpg"
import TwitterIcon from "@/scr/logoSocial/twitter.png"
import DexScreenerIcon from "@/scr/logoSocial/dexscanner.png"
import { usePhantomWallet } from "@/hooks/use-phantom-wallet"

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

interface SecurityReport {
  rugCheckScore: number | null
  isRugged: boolean
  riskLevel: "LOW" | "MEDIUM" | "MODERATE" | "HIGH" | "CRITICAL"
  risks: Array<{
    level: string
    name: string
    description: string
    score: number
  }>
  authorities: {
    hasFreezeAuthority: boolean
    hasMintAuthority: boolean
  }
  holderConcentration: number | null
  liquidity: number | null
  recommendation: string
  isNativeToken?: boolean
  metadata?: {
    name: string
    symbol: string
    supply: string
  }
}

const upcomingWallets: Array<{
  name: string
  icon: StaticImageData
  accent: string
}> = [
  {
    name: "MetaMask",
    icon: metamaskIcon,
    accent: "from-[#f6851b]/50 via-[#f6851b]/15 to-transparent",
  },
  {
    name: "Coinbase Wallet",
    icon: coinbaseIcon,
    accent: "from-[#0052ff]/45 via-[#1e40ff]/15 to-transparent",
  },
  {
    name: "Trust Wallet",
    icon: trustWalletIcon,
    accent: "from-[#3375ff]/45 via-[#1d4ed8]/12 to-transparent",
  },
]

export default function AnalyzerPage() {
  const { connected, publicKey, connectWallet, disconnectWallet, walletError, clearWalletError } = usePhantomWallet()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [securityModalOpen, setSecurityModalOpen] = useState(false)
  const [loadingSecurityReport, setLoadingSecurityReport] = useState(false)
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)

  useEffect(() => {
    if (connected && publicKey) {
      setError(null)
      fetchTokens()
    } else {
      setTokens([])
      setTotalValue(0)
      setAnalysis(null)
    }
  }, [connected, publicKey])

  const fetchTokens = async () => {
    if (!publicKey) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: publicKey }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch tokens")
      }

      const data = await response.json()
      setTokens(data.tokens)

      const total = data.tokens.reduce((sum: number, token: Token) => sum + (token.value || 0), 0)
      setTotalValue(total)
    } catch (error) {
      setError("Failed to load tokens. Please try again.")
      setTokens([])
      setTotalValue(0)
    } finally {
      setLoading(false)
    }
  }

  const analyzePortfolio = async () => {
    setAnalyzing(true)
    setAnalysis(null)
    setError(null)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokens }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze portfolio")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (error) {
      setError("Failed to analyze portfolio. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  const loadSecurityReport = async (token: Token) => {
    setSelectedToken(token)
    setSecurityModalOpen(true)
    setLoadingSecurityReport(true)
    setSecurityReport(null)

    try {
      const response = await fetch("/api/token-security", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokenAddress: token.mint }),
      })

      if (!response.ok) {
        throw new Error("Failed to load security report")
      }

      const result = await response.json()
      // API возвращает { success: true, data: {...} }
      const data = result.success ? result.data : result
      
      // Преобразуем данные в нужный формат для UI
      const reportData: SecurityReport = {
        rugCheckScore: data.securityScore ?? null,
        isRugged: Boolean(data.rugged),
        riskLevel: data.riskLevel || "MEDIUM",
        risks: data.risks || [],
        authorities: {
          hasFreezeAuthority: Boolean(data.freezeAuthority),
          hasMintAuthority: Boolean(data.mintAuthority),
        },
        holderConcentration:
          typeof data.holderConcentration === "number" && !Number.isNaN(data.holderConcentration)
            ? data.holderConcentration
            : null,
        liquidity:
          typeof data.totalLiquidity === "number" && !Number.isNaN(data.totalLiquidity)
            ? data.totalLiquidity
            : null,
        recommendation: data.recommendation || "No recommendation available",
        isNativeToken: Boolean(data.isNativeToken),
        metadata: data.tokenName
          ? {
              name: data.tokenName,
              symbol: data.tokenSymbol,
              supply: data.totalSupply?.toString() || "Unknown",
            }
          : undefined,
      }
      
      setSecurityReport(reportData)
    } catch (error) {
      setSecurityReport({
        rugCheckScore: null,
        isRugged: false,
        riskLevel: "MEDIUM",
        risks: [],
        authorities: {
          hasFreezeAuthority: false,
          hasMintAuthority: false,
        },
        holderConcentration: null,
        liquidity: null,
        recommendation: "Unable to load security data. Please try again later.",
        isNativeToken: false,
      })
    } finally {
      setLoadingSecurityReport(false)
    }
  }

  const displayError = useMemo(() => error || walletError, [error, walletError])

  const dismissError = () => {
    setError(null)
    clearWalletError()
  }

  return (
    <>
      <WebGLShader />
  <div className="fixed inset-0 pointer-events-none z-100">
        <GradientBlur radius={25} opacityDecay={0.03} color={[64, 224, 208]} />
      </div>

      <div className="min-h-screen relative">
        <header className="border-b border-border/40 backdrop-blur-xl sticky top-0 z-50 bg-background/80">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-deMbW7xBQWsHf5z1iFWQ7gS2a6Uw6E.png"
                    alt="OXin Agent Logo"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <span className="text-xl font-bold font-julius">OXin Agent</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/analyze" className="hover:text-foreground transition-colors">
                Analyze
              </Link>
              <Link href="/chat" className="hover:text-foreground transition-colors">
                Chat with Agent
              </Link>
            </nav>
            {connected ? (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-sm font-mono">
                    {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                  </span>
                </div>
                <Button onClick={disconnectWallet} variant="outline">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={async () => {
                  try {
                    await connectWallet()
                  } catch (connectError) {
                    setError("Failed to connect wallet. Please try again.")
                  }
                }}
                className="gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          {displayError && (
            <Card className="mb-6 p-4 bg-destructive/10 border-destructive/50">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">{displayError}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={dismissError}>
                  Dismiss
                </Button>
              </div>
            </Card>
          )}

          {!connected ? (
            <div className="max-w-2xl mx-auto text-center space-y-8 py-20">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Wallet className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-balance">Connect Your Wallet</h1>
                <p className="text-xl text-muted-foreground text-pretty leading-relaxed">
                  Connect your Solana wallet to start analyzing your crypto portfolio with AI
                </p>
              </div>
              <Card className="p-8 space-y-1 bg-black/40 backdrop-blur-xl border-border/50 shadow-2xl">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Supported Wallets</h3>
                    <p className="text-sm text-muted-foreground/80">
                      Phantom is ready to connect today. Multi-chain support lands next.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="relative flex h-full min-h-[180px] flex-col justify-center overflow-hidden rounded-2xl border border-purple-500/25 bg-[radial-gradient(circle_at_20%_30%,rgba(168,85,247,0.35),transparent_58%),radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.28),transparent_65%),rgba(19,12,40,0.92)] p-6 shadow-[0_18px_48px_-30px_rgba(129,140,248,0.9)]">
                      <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl bg-[radial-gradient(circle_at_35%_25%,rgba(192,132,252,0.6),transparent_65%)]" />
                      <div className="relative flex flex-col gap-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.2)]">
                            <Image
                              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/d39af9c5-39f3-43c0-ace8-b44ec25aadc5_removalai_preview-M1dfptBwTRRFYqUOqWijwe4l39CFwW.png"
                              alt="Phantom Wallet"
                              width={48}
                              height={48}
                              className="h-10 w-10"
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-semibold tracking-tight text-white">Phantom</p>
                            <p className="text-[11px] uppercase tracking-[0.32em] text-purple-100/75">Available now</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-purple-100/75">
                          <span className="inline-flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Instant Solana support
                          </span>
                          <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70">
                            Mainnet
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_100%_-10%,rgba(129,140,248,0.18),transparent_65%),rgba(6,10,26,0.92)] p-6 shadow-[0_16px_40px_-28px_rgba(59,130,246,0.8)]">
                      <div className="pointer-events-none absolute inset-0 opacity-40 blur-3xl bg-[conic-gradient(from_200deg,rgba(59,130,246,0.2),rgba(168,85,247,0.1),rgba(59,130,246,0.2))]" />
                      <div className="relative flex h-full flex-col justify-between gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-base font-semibold tracking-tight text-white">Multi-chain wallets</p>
                            <p className="text-xs text-muted-foreground/80">MetaMask · Coinbase Wallet · Trust Wallet</p>
                          </div>
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                            <Wallet className="h-5 w-5 text-white/70" />
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex -space-x-3">
                            {upcomingWallets.map((wallet) => (
                              <div
                                key={wallet.name}
                                className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
                              >
                                <div
                                  className={`pointer-events-none absolute inset-[-35%] rounded-full opacity-60 blur-xl bg-gradient-to-br ${wallet.accent}`}
                                />
                                <Image
                                  src={wallet.icon}
                                  alt={wallet.name}
                                  width={wallet.icon.width}
                                  height={wallet.icon.height}
                                  className="relative z-10 h-10 w-10 rounded-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
                            <Sparkles className="h-3.5 w-3.5" />
                            Coming soon
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <Button
                    onClick={connectWallet}
                    size="lg"
                    className="group relative w-full min-h-[3.5rem] items-stretch justify-between overflow-hidden rounded-2xl border border-purple-400/40 bg-[radial-gradient(circle_at_-10%_-20%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(circle_at_110%_-10%,rgba(59,130,246,0.3),transparent_70%),linear-gradient(120deg,rgba(18,10,36,0.95),rgba(9,4,20,0.92))] px-8 py-5 text-base font-semibold text-white shadow-[0_22px_55px_-32px_rgba(99,102,241,0.85)] transition duration-500 before:absolute before:inset-[-2px] before:-translate-y-full before:bg-[linear-gradient(115deg,rgba(255,255,255,0.2),transparent,rgba(255,255,255,0.25))] before:opacity-0 before:transition before:duration-700 before:content-[''] before:transform after:pointer-events-none after:absolute after:-inset-[40%] after:-z-10 after:rounded-full after:bg-[conic-gradient(from_0deg,rgba(168,85,247,0.3),rgba(59,130,246,0.08),rgba(249,115,22,0.22),rgba(168,85,247,0.3))] after:opacity-0 after:blur-3xl after:transition after:duration-[1200ms] after:content-[''] after:animate-none after:mix-blend-screen hover:-translate-y-0.5 hover:border-purple-300/60 hover:shadow-[0_28px_68px_-34px_rgba(129,140,248,0.9)] hover:before:translate-y-0 hover:before:opacity-100 hover:after:opacity-60 hover:after:animate-[spin_10s_linear_infinite] focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <span className="relative z-10 flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/d39af9c5-39f3-43c0-ace8-b44ec25aadc5_removalai_preview-M1dfptBwTRRFYqUOqWijwe4l39CFwW.png"
                            alt="Phantom logo"
                            width={32}
                            height={32}
                            className="h-8 w-8"
                          />
                        </span>
                        <span className="flex flex-col items-start gap-0.5">
                          <span className="text-xs uppercase tracking-[0.32em] text-purple-100/80">Connect</span>
                          <span className="text-lg font-semibold leading-tight">Phantom Wallet</span>
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-purple-100/80">
                        <span className="text-xs uppercase tracking-[0.32em]">Secure</span>
                        <Wallet className="h-5 w-5" />
                      </span>
                    </span>
                  </Button>
                </div>
              </Card>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Your wallet data is never stored on our servers</p>
                <p>Analysis happens in real-time using public blockchain data</p>
                <p className="text-xs pt-2 text-muted-foreground/80">
                  Note: Make sure to approve the connection request in your wallet popup
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Portfolio Dashboard</h1>
                  <p className="text-muted-foreground mt-2">
                    Connected: <span className="font-mono text-sm">{publicKey?.slice(0, 8)}...</span>
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2"
                  disabled={loading || tokens.length === 0 || analyzing}
                  onClick={analyzePortfolio}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      Analyze Portfolio
                    </>
                  )}
                </Button>
              </div>

              {analysis && (
                <Card className="p-6 bg-black/60 backdrop-blur-xl border-border/50">
                  <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">AI Portfolio Analysis</h2>
                        <p className="text-sm text-muted-foreground">
                          Powered by AI with data from DexScreener and RugCheck
                        </p>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                          {analysis}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-black/60 backdrop-blur-xl border-border/50">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                    <p className="text-4xl font-bold">
                      ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">{tokens.length} tokens</p>
                  </div>
                </Card>

                <Card className="p-6 bg-black/60 backdrop-blur-xl border-border/50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary" />
                      <p className="text-sm font-semibold">Portfolio Distribution</p>
                    </div>
                    <div className="space-y-2">
                      {tokens.slice(0, 3).map((token, index) => {
                        const percentage = totalValue > 0 ? ((token.value || 0) / totalValue) * 100 : 0
                        return (
                          <div key={token.mint} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{token.symbol || "Unknown"}</span>
                              <span className="font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${index === 0 ? "bg-chart-1" : index === 1 ? "bg-chart-2" : "bg-chart-3"}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              </div>

              {loading ? (
                <Card className="p-8 text-center space-y-4 bg-black/60 backdrop-blur-xl border-border/50">
                  <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Loading your tokens...</h3>
                    <p className="text-muted-foreground">
                      Fetching token data from the blockchain. This may take a moment.
                    </p>
                  </div>
                </Card>
              ) : tokens.length === 0 ? (
                <Card className="p-8 text-center space-y-4 bg-black/60 backdrop-blur-xl border-border/50">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No tokens found</h3>
                    <p className="text-muted-foreground">
                      This wallet doesn't have any tokens yet. Try connecting a different wallet.
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  <Card className="p-6 bg-black/60 backdrop-blur-xl border-border/50">
                    <h2 className="text-2xl font-bold mb-6">Portfolio Breakdown</h2>
                    <PortfolioChart tokens={tokens} totalValue={totalValue} />
                  </Card>

                  {publicKey && <PNLChart walletAddress={publicKey} currentTokens={tokens} />}

                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Your Tokens</h2>
                    <div className="grid gap-4">
                      {tokens.map((token) => (
                        <Card
                          key={token.mint}
                          className="p-6 bg-black/60 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                {token.logoURI ? (
                                  <img
                                    src={token.logoURI || "/placeholder.svg"}
                                    alt={token.symbol}
                                    className="w-12 h-12 rounded-full"
                                  />
                                ) : (
                                  <span className="text-lg font-bold text-primary">
                                    {token.symbol?.slice(0, 2) || "??"}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold">
                                  {token.name || token.symbol || "Unknown Token"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {token.balance.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 6,
                                  })}{" "}
                                  {token.symbol || ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-semibold">
                                  $
                                  {(token.value || 0).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                                {token.change24h !== undefined && token.change24h !== 0 && (
                                  <div
                                    className={`flex items-center gap-1 text-sm ${token.change24h >= 0 ? "text-green-500" : "text-red-500"}`}
                                  >
                                    {token.change24h >= 0 ? (
                                      <TrendingUp className="w-4 h-4" />
                                    ) : (
                                      <TrendingDown className="w-4 h-4" />
                                    )}
                                    <span className="font-medium">
                                      {token.change24h >= 0 ? "+" : ""}
                                      {token.change24h.toFixed(2)}%
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-1">24h</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadSecurityReport(token)}
                                className="gap-2"
                              >
                                <Shield className="w-4 h-4" />
                                Security
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Security Report Modal */}
      <Dialog open={securityModalOpen} onOpenChange={setSecurityModalOpen}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-dark bg-black/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Shield className="w-6 h-6 text-primary" />
              Security Report
            </DialogTitle>
          </DialogHeader>
          
          {selectedToken && (
            <div className="flex items-center gap-2 -mt-2 mb-4">
              {selectedToken.logoURI && (
                <img
                  src={selectedToken.logoURI}
                  alt={selectedToken.symbol}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-base font-semibold">
                {selectedToken.name || selectedToken.symbol || "Unknown Token"}
              </span>
              <span className="text-sm text-muted-foreground">
                ({selectedToken.symbol})
              </span>
            </div>
          )}

          {loadingSecurityReport ? (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin mb-4" />
              <p className="text-muted-foreground">Analyzing token security...</p>
            </div>
          ) : securityReport ? (
            <div className="space-y-6">
              {/* Risk Level Badge */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Overall Risk Level</p>
                  <div className="flex items-center gap-2">
                    {securityReport.riskLevel === "LOW" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : securityReport.riskLevel === "CRITICAL" || securityReport.riskLevel === "HIGH" ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    <Badge
                      variant={
                        securityReport.riskLevel === "LOW"
                          ? "default"
                          : securityReport.riskLevel === "CRITICAL" || securityReport.riskLevel === "HIGH"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-base"
                    >
                      {securityReport.riskLevel}
                    </Badge>
                  </div>
                </div>
                {securityReport.rugCheckScore !== null && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">RugCheck Score</p>
                    <p className="text-2xl font-bold">
                      {(securityReport.rugCheckScore * 100).toFixed(0)}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Rugged Warning */}
              {securityReport.isRugged && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <h3 className="font-semibold text-destructive">⚠️ RUGGED TOKEN DETECTED</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This token has been identified as a rug pull. Do NOT invest in this token.
                  </p>
                </div>
              )}

              {/* Authorities */}
              {securityReport.authorities && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Token Authorities
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Freeze Authority</span>
                      {securityReport.authorities.hasFreezeAuthority ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Mint Authority</span>
                      {securityReport.authorities.hasMintAuthority ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Revoked
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Top 10 Holder Concentration</p>
                  <p className="text-2xl font-bold">
                    {securityReport.isNativeToken
                      ? "Native asset"
                      : securityReport.holderConcentration && securityReport.holderConcentration > 0
                        ? `${securityReport.holderConcentration.toFixed(1)}%`
                        : "N/A"}
                  </p>
                  {securityReport.holderConcentration && securityReport.holderConcentration > 50 && (
                    <Badge variant="destructive" className="mt-2">High Risk</Badge>
                  )}
                  {securityReport.isNativeToken ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Native Solana asset with protocol-level custody.
                    </p>
                  ) : (
                    (securityReport.holderConcentration === 0 || securityReport.holderConcentration === null) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Not enough on-chain data to calculate concentration.
                      </p>
                    )
                  )}
                </Card>
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Total Liquidity</p>
                  <p className="text-2xl font-bold">
                    {securityReport.isNativeToken
                      ? "Tracked across CEX"
                      : securityReport.liquidity && securityReport.liquidity > 0
                        ? `$${securityReport.liquidity.toLocaleString()}`
                        : "N/A"}
                  </p>
                  {securityReport.liquidity && securityReport.liquidity < 10000 && securityReport.liquidity > 0 && (
                    <Badge variant="destructive" className="mt-2">Low Liquidity</Badge>
                  )}
                  {securityReport.isNativeToken ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Liquidity spans centralized and decentralized venues; RugCheck does not aggregate it.
                    </p>
                  ) : (
                    (!securityReport.liquidity || securityReport.liquidity === 0) && (
                      <p className="text-xs text-muted-foreground mt-1">Liquidity data unavailable for this asset.</p>
                    )
                  )}
                </Card>
              </div>

              {/* Risks */}
              {securityReport.risks && securityReport.risks.length > 0 && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Detected Risks ({securityReport.risks.length})
                  </h3>
                  <div className="space-y-3">
                    {securityReport.risks.slice(0, 5).map((risk, index) => (
                      <div key={index} className="p-3 rounded-lg bg-background/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{risk.name}</span>
                          <Badge
                            variant={
                              risk.level === "danger"
                                ? "destructive"
                                : risk.level === "warn"
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {risk.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{risk.description}</p>
                      </div>
                    ))}
                    {securityReport.risks.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{securityReport.risks.length - 5} more risks detected
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Recommendation */}
              <Card className="p-4 bg-primary/10 border-primary/50">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Recommendation
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {securityReport.recommendation}
                </p>
              </Card>

              {/* Token Metadata */}
              {securityReport.metadata && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-3">Token Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{securityReport.metadata.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Symbol:</span>
                      <span className="font-medium">{securityReport.metadata.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Supply:</span>
                      <span className="font-medium">{securityReport.metadata.supply}</span>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Contract Address */}
              {selectedToken && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-3">Contract Address</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2 bg-background/50 rounded font-mono text-xs break-all">
                      {selectedToken.mint}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedToken.mint)
                        }}
                      >
                        Copy Address
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          window.open(`https://solscan.io/token/${selectedToken.mint}`, "_blank")
                        }}
                      >
                        View on Solscan
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
    </>
  )
}
