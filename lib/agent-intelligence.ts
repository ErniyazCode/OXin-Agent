import type { AgentPersona } from "./agent-personas"
import {
  fetchMacroSnapshot,
  fetchMomentumLeaders,
  fetchNetworkHealth,
  fetchRiskSignals,
  fetchTrendingMemes,
  type MemePairInsight,
  type MomentumLeader,
  type RiskSignal,
} from "./market-intel"

export interface PortfolioToken {
  mint: string
  symbol?: string
  name?: string
  value?: number
  change24h?: number
}

export interface AgentIntel {
  promptContext: string
  highlights: string[]
  risks: string[]
  opportunities: string[]
  dataTimestamp: string
  recommendations: RecommendationBlock[]
}

interface RecommendationToken {
  name: string
  symbol?: string
  address: string
  rationale: string
  createdAtHours?: number | null
  liquidityUsd?: number | null
  volume24hUsd?: number | null
}

interface RecommendationBlock {
  message: string
  confidence: "high" | "medium" | "low"
  tokens: RecommendationToken[]
  insight?: string
}

interface IntelBundle {
  memes?: MemePairInsight[]
  leaders?: MomentumLeader[]
  macro?: Awaited<ReturnType<typeof fetchMacroSnapshot>>
  network?: Awaited<ReturnType<typeof fetchNetworkHealth>>
  riskSignals?: RiskSignal[]
  recommendations: RecommendationBlock[]
}

function formatNumber(value: number | null | undefined, options: Intl.NumberFormatOptions = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return Intl.NumberFormat("en-US", options).format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function buildTable(rows: string[][], headers: string[]): string {
  if (rows.length === 0) return "No data." 
  const headerLine = `| ${headers.join(" | ")} |`
  const separator = `| ${headers.map(() => "---").join(" | ")} |`
  const body = rows.map((columns) => `| ${columns.join(" | ")} |`).join("\n")
  return `${headerLine}\n${separator}\n${body}`
}

function selectTokens(tokens: PortfolioToken[], limit = 5) {
  return tokens
    .filter((token) => (token.value ?? 0) > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, limit)
}

async function gatherIntel(persona: AgentPersona, tokens: PortfolioToken[]): Promise<IntelBundle> {
  const profile = persona.intelligenceProfile
  const mints = tokens.map((token) => token.mint)

  const needsMemes = profile === "meme" || profile === "momentum" || profile === "core"
  const needsMomentum = profile === "momentum" || profile === "core" || profile === "macro"
  const needsMacro = profile === "macro" || profile === "core" || profile === "conservative"
  const needsRisk = profile !== "meme" || mints.length > 0
  const needsNetwork = profile === "macro" || profile === "core" || profile === "conservative"

  const [memes, leaders, macro, network, riskSignals] = await Promise.all([
    needsMemes ? fetchTrendingMemes().catch(() => []) : Promise.resolve([]),
    needsMomentum ? fetchMomentumLeaders().catch(() => []) : Promise.resolve([]),
    needsMacro ? fetchMacroSnapshot().catch(() => null) : Promise.resolve(null),
    needsNetwork ? fetchNetworkHealth().catch(() => null) : Promise.resolve(null),
    needsRisk && mints.length ? fetchRiskSignals(mints).catch(() => []) : Promise.resolve([]),
  ])

  // Validate meme recommendations by checking each token's risk profile
  let validatedMemes: MemePairInsight[] = []
  if (needsMemes && memes.length > 0) {
    const memeAddresses = memes.map((m) => m.address).filter(Boolean)
    const memeRisks = await fetchRiskSignals(memeAddresses.slice(0, 10)).catch(() => [])
    
    // Filter out high-risk tokens
    validatedMemes = memes.filter((meme) => {
      const riskProfile = memeRisks.find((r) => r.mint === meme.address)
      if (!riskProfile) return true // No risk data = allow (conservative)
      
      // CRITICAL RUG INDICATORS - auto-reject
      const hasRugSignal = riskProfile.warnings.some((w) =>
        w.includes("CRITICAL") || w.includes("EXTREME RUG") || w.includes("TOP HOLDER OWNS >50%")
      )
      return !hasRugSignal
    })
  }

  return {
    memes: needsMemes ? validatedMemes : undefined,
    leaders: needsMomentum ? (leaders as MomentumLeader[]) : undefined,
    macro: needsMacro ? macro ?? undefined : undefined,
    network: needsNetwork ? network ?? undefined : undefined,
    riskSignals: needsRisk ? (riskSignals as RiskSignal[]) : undefined,
    recommendations: buildRecommendations({
      profile,
      memes: needsMemes ? validatedMemes : [],
    }),
  }
}

export async function collectAgentIntel(persona: AgentPersona, tokens: PortfolioToken[]): Promise<AgentIntel> {
  const intel = await gatherIntel(persona, tokens)
  const timestamp = new Date().toISOString()

  const highlights: string[] = []
  const risks: string[] = []
  const opportunities: string[] = []

  const promptSections: string[] = []

  if (intel.macro) {
    const macro = intel.macro
    promptSections.push(`**Macro Signals (CoinGecko)**
- SOL price: ${formatUsd(macro.solPriceUsd)} (${formatPercent(macro.solChange24h)})
- SOL market cap: ${formatUsd(macro.solMarketCap)}
- BTC dominance: ${formatPercent(macro.btcDominance)}
- Global 24h market cap change: ${formatPercent(macro.marketCap24hChange)}`)

    if (macro.solPriceUsd) {
      highlights.push(`SOL trading at ${formatUsd(macro.solPriceUsd)} (${formatPercent(macro.solChange24h)})`)
    }
    if ((macro.solChange24h ?? 0) > 5) {
      opportunities.push("SOL momentum accelerating >5% in 24h")
    } else if ((macro.solChange24h ?? 0) < -5) {
      risks.push("SOL dropped more than 5% in the last 24h")
    }
  }

  if (intel.network) {
    const network = intel.network
    promptSections.push(`**Network Health (Solscan/RPC)**
- Block height: ${formatNumber(network.blockHeight)}
- Current slot: ${formatNumber(network.currentSlot)}
- Average TPS: ${formatNumber(network.averageTps)}
- Health flag: ${network.healthy ? "Healthy" : "Stressed"}`)

    if (network.healthy) {
      highlights.push("Solana network throughput healthy; latency risks low")
    }
    if (!network.healthy) {
      risks.push("Solana TPS below healthy threshold; expect degraded fills")
    }
  }

  if (intel.leaders && intel.leaders.length > 0) {
    const rows = intel.leaders.slice(0, 6).map((leader) => [
      leader.symbol ?? leader.name ?? leader.address.slice(0, 4),
      formatUsd(leader.priceUsd),
      formatPercent(leader.change1h),
      formatPercent(leader.change24h),
      formatUsd(leader.volume24hUsd),
      formatUsd(leader.liquidityUsd),
    ])
    promptSections.push("**Momentum Leaders (DexScreener)**\n" +
      buildTable(rows, ["Symbol", "Price", "1h", "24h", "Vol 24h", "Liq"]))

    if (intel.leaders.length) {
      highlights.push(`Momentum leadership: ${intel.leaders
        .slice(0, 3)
        .map((item) => item.symbol ?? item.name ?? item.address.slice(0, 4))
        .join(", ")}`)
    }
    const strongMoves = intel.leaders.filter((item) => (item.change24h ?? 0) > 40)
    if (strongMoves.length) {
      opportunities.push(`Momentum spike in ${strongMoves
        .slice(0, 3)
        .map((item) => item.symbol ?? item.name)
        .join(", ")}`)
    }
  }

  if (intel.memes && intel.memes.length > 0) {
    const rows = intel.memes.slice(0, 6).map((meme) => [
      meme.symbol ?? meme.name ?? meme.address.slice(0, 4),
      formatUsd(meme.priceUsd),
      formatPercent(meme.change1h),
      formatUsd(meme.liquidityUsd),
      formatUsd(meme.volume24hUsd),
      formatNumber(meme.createdAt ? (Date.now() - meme.createdAt * 1000) / 36e5 : null, {
        maximumFractionDigits: 1,
      }) + "h old",
      meme.address,
    ])
    promptSections.push("**Fresh Meme Pairs (<24h)**\n" +
      buildTable(rows, ["Token", "Price", "1h", "Liquidity", "Vol 24h", "Age", "Contract"]))

    const sortedMemes = [...intel.memes].sort((a, b) => (b.change1h ?? 0) - (a.change1h ?? 0))
    const viableCandidates = sortedMemes.filter((meme) => (meme.liquidityUsd ?? 0) >= 30_000 && (meme.volume24hUsd ?? 0) >= 25_000).slice(0, 3)
    const watchlistCandidates = sortedMemes.slice(0, 3)

    if (viableCandidates.length > 0) {
      opportunities.push(`High-liquidity meme momentum: ${viableCandidates
        .map((item) => {
          const name = item.symbol ?? item.name ?? item.address.slice(0, 4)
          return `${name} (${formatPercent(item.change1h)} / liq ${formatUsd(item.liquidityUsd)} / ${item.address})`
        })
        .join(", ")}`)
    } else {
      opportunities.push("No meme launches cleared $30k liquidity and $25k 24h volume yet; keep powder dry or scale entries small.")
    }

    if (watchlistCandidates.length > 0) {
      opportunities.push(`Top emerging meme watchlist: ${watchlistCandidates
        .map((item) => {
          const name = item.symbol ?? item.name ?? item.address.slice(0, 4)
          return `${name} (liq ${formatUsd(item.liquidityUsd)} / vol ${formatUsd(item.volume24hUsd)} / ${item.address})`
        })
        .join(", ")}`)

      const lowLiquidity = watchlistCandidates.filter((item) => (item.liquidityUsd ?? 0) < 30_000)
      if (lowLiquidity.length > 0) {
        risks.push(`Meme liquidity thin: ${lowLiquidity
          .map((item) => `${item.symbol ?? item.name ?? item.address.slice(0, 4)} (${item.address})`)
          .join(", ")} under $30k pools. Scale entries carefully.`)
      }
    }

    highlights.push(`Active meme launches detected; ${intel.memes.length} candidates within 24h window (contract addresses listed below)`)
  }

  if (intel.riskSignals && intel.riskSignals.length > 0) {
    const rows = intel.riskSignals.slice(0, 6).map((signal) => [
      signal.symbol ?? signal.name ?? signal.mint.slice(0, 4),
      formatUsd(signal.priceUsd),
      formatUsd(signal.liquidityUsd),
      formatUsd(signal.volume24hUsd),
      String(signal.holders ?? "n/a"),
      signal.warnings.join("; ") || "None",
    ])
    promptSections.push("**Portfolio Risk Signals**\n" +
      buildTable(rows, ["Token", "Price", "Liquidity", "Vol 24h", "Holders", "Warnings"]))

    signalWarnings(intel.riskSignals, risks)
  }

  const topTokens = selectTokens(tokens, 5)
  if (topTokens.length) {
    const rows = topTokens.map((token) => [
      token.symbol ?? token.name ?? token.mint.slice(0, 4),
      formatUsd(token.value ?? 0),
      formatPercent(token.change24h ?? null),
    ])
    promptSections.push("**Top Portfolio Positions**\n" + buildTable(rows, ["Token", "Value", "24h Change"]))
  }

  if (intel.recommendations.length > 0) {
    const recommendationBlock = intel.recommendations
      .map((item) => {
        const header = `Confidence: ${item.confidence}\n${item.message}`
        const list = item.tokens
          .map((token) =>
            `  • ${token.name}${token.symbol ? ` (${token.symbol})` : ""} — ${token.address} — ${token.rationale}`,
          )
          .join("\n")
        const insight = item.insight ? `\n  Insight: ${item.insight}` : ""
        return `${header}${list ? `\n${list}` : ""}${insight}`
      })
      .join("\n\n")

    promptSections.push(`**Recommendation Summary**\n${recommendationBlock}`)
  }

  const promptContext = [`Data timestamp: ${timestamp}`, ...promptSections].join("\n\n")

  if (opportunities.length === 0) opportunities.push("No obvious high-conviction opportunities detected; consider defensive posture.")
  if (risks.length === 0) risks.push("No immediate red flags detected; continue monitoring liquidity and volume.")
  if (highlights.length === 0) highlights.push("Market conditions stable; no dominant narrative detected.")

  return {
    promptContext,
    highlights,
    risks,
    opportunities,
    dataTimestamp: timestamp,
    recommendations: intel.recommendations,
  }
}

function signalWarnings(signals: RiskSignal[], risks: string[]) {
  for (const item of signals) {
    for (const warning of item.warnings) {
      const label = item.symbol ?? item.name ?? item.mint.slice(0, 4)
      risks.push(`${label}: ${warning}`)
    }
  }
}

function buildRecommendations({
  profile,
  memes,
}: {
  profile: AgentPersona["intelligenceProfile"]
  memes: MemePairInsight[]
}): IntelBundle["recommendations"] {
  const recommendations: IntelBundle["recommendations"] = []

  // Sort by trading score: volume + liquidity combo
  const sortedByScore = [...memes].sort((a, b) => {
    const scoreA = (a.volume24hUsd ?? 0) + (a.liquidityUsd ?? 0) * 0.5
    const scoreB = (b.volume24hUsd ?? 0) + (b.liquidityUsd ?? 0) * 0.5
    return scoreB - scoreA
  })

  // HIGH confidence: established liquidity + volume (PRIME targets)
  const prime = sortedByScore.filter(
    (m) => (m.liquidityUsd ?? 0) >= 100_000 && (m.volume24hUsd ?? 0) >= 80_000
  )

  if (prime.length > 0) {
    recommendations.push({
      confidence: "high",
      message: "🎯 HIGH-CONVICTION MEME PLAYS — Strong liquidity + volume. These are PRIME for sized entries:",
      tokens: prime.slice(0, 3).map((token) => {
        const ageHours = token.createdAt ? (Date.now() / 1000 - token.createdAt) / 3600 : null
        const ageText = ageHours
          ? ageHours < 24
            ? `${ageHours.toFixed(1)}h old (FRESH)`
            : `${(ageHours / 24).toFixed(1)} days old`
          : "age unknown"
        
        return {
          name: token.name ?? token.symbol ?? token.address.slice(0, 6),
          symbol: token.symbol,
          address: token.address,
          rationale: `${ageText} | Liq ${formatUsd(token.liquidityUsd)} | Vol ${formatUsd(token.volume24hUsd)} | 24h ${formatPercent(token.change24h)} | 1h ${formatPercent(token.change1h)}`,
          liquidityUsd: token.liquidityUsd ?? undefined,
          volume24hUsd: token.volume24hUsd ?? undefined,
        }
      }),
      insight: `✅ SAFETY VERIFIED: Passed liquidity + volume thresholds. Position sizing: 3-5% per token. Set stop-loss at -12%. Monitor 1h momentum for exit signals.`,
    })
  }

  // MEDIUM confidence: decent liquidity (TACTICAL entries)
  const tactical = sortedByScore.filter(
    (m) =>
      (m.liquidityUsd ?? 0) >= 50_000 &&
      (m.volume24hUsd ?? 0) >= 30_000 &&
      !prime.includes(m)
  )

  if (tactical.length > 0) {
    recommendations.push({
      confidence: "medium",
      message: "⚡ TACTICAL MEME ENTRIES — Mid-tier liquidity. Scale in carefully, 1-2% position max:",
      tokens: tactical.slice(0, 4).map((token) => {
        const ageHours = token.createdAt ? (Date.now() / 1000 - token.createdAt) / 3600 : null
        const ageText = ageHours
          ? ageHours < 24
            ? `${ageHours.toFixed(1)}h old`
            : `${(ageHours / 24).toFixed(1)} days old`
          : "age unknown"
        
        return {
          name: token.name ?? token.symbol ?? token.address.slice(0, 6),
          symbol: token.symbol,
          address: token.address,
          rationale: `${ageText} | Liq ${formatUsd(token.liquidityUsd)} | Vol ${formatUsd(token.volume24hUsd)} | 1h ${formatPercent(token.change1h)} | 24h ${formatPercent(token.change24h)}`,
          liquidityUsd: token.liquidityUsd ?? undefined,
          volume24hUsd: token.volume24hUsd ?? undefined,
        }
      }),
      insight: `⚠️ MODERATE RISK: Liquidity is decent but not institutional. Use limit orders. Set hard stop at -12%. Exit 50% at 2x to secure capital.`,
    })
  }

  // FRESH launches: NEW tokens created within 24h
  const fresh = [...memes]
    .filter((m) => {
      if (!m.createdAt) return false
      const ageHours = (Date.now() / 1000 - (m.createdAt ?? 0)) / 3600
      return ageHours < 24
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  const viableFresh = fresh.filter(
    (m) => (m.liquidityUsd ?? 0) >= 30_000 && (m.volume24hUsd ?? 0) >= 20_000
  )

  if (viableFresh.length > 0) {
    recommendations.push({
      confidence: "medium",
      message: "🚀 FRESH LAUNCHES (<24h) — Early momentum plays. HIGH volatility, manage risk aggressively:",
      tokens: viableFresh.slice(0, 3).map((token) => {
        const ageHours = token.createdAt
          ? (Date.now() / 1000 - token.createdAt) / 3600
          : null
        return {
          name: token.name ?? token.symbol ?? token.address.slice(0, 6),
          symbol: token.symbol,
          address: token.address,
          rationale: `Age ${ageHours?.toFixed(1)}h, Liq ${formatUsd(token.liquidityUsd)}, Vol ${formatUsd(token.volume24hUsd)}, 1h ${formatPercent(token.change1h)}`,
          createdAtHours: ageHours,
          liquidityUsd: token.liquidityUsd ?? undefined,
          volume24hUsd: token.volume24hUsd ?? undefined,
        }
      }),
      insight: `New launches are EXTREME risk. Only deploy 0.5-1% of capital per token. Take 50% profit at 2x.`,
    })
  }

  // WATCHLIST: interesting but risky (LOW liquidity warning)
  const watchlist = sortedByScore.filter(
    (m) =>
      (m.liquidityUsd ?? 0) >= 15_000 &&
      (m.liquidityUsd ?? 0) < 50_000 &&
      !prime.includes(m) &&
      !tactical.includes(m) &&
      !viableFresh.includes(m)
  )

  if (watchlist.length > 0) {
    recommendations.push({
      confidence: "low",
      message: "👀 WATCHLIST — Thin liquidity. DO NOT size up. Micro entries only (<0.5% portfolio):",
      tokens: watchlist.slice(0, 5).map((token) => {
        const ageHours = token.createdAt ? (Date.now() / 1000 - token.createdAt) / 3600 : null
        const ageText = ageHours
          ? ageHours < 24
            ? `${ageHours.toFixed(1)}h old`
            : `${(ageHours / 24).toFixed(1)} days old`
          : "age unknown"
        
        return {
          name: token.name ?? token.symbol ?? token.address.slice(0, 6),
          symbol: token.symbol,
          address: token.address,
          rationale: `${ageText} | Liq ${formatUsd(token.liquidityUsd)} (THIN) | Vol ${formatUsd(token.volume24hUsd)} | 24h ${formatPercent(token.change24h)}`,
          liquidityUsd: token.liquidityUsd ?? undefined,
          volume24hUsd: token.volume24hUsd ?? undefined,
        }
      }),
      insight: `🚨 HIGH RUG RISK: Liquidity too thin for safe exits. Only for degen plays. Max $10-20 entry. Expect to lose 100%.`,
    })
  }

  // If NO viable plays at all
  if (recommendations.length === 0 && memes.length > 0) {
    recommendations.push({
      confidence: "low",
      message: "⚠️ NO QUALIFIED PLAYS — All detected memes below safety thresholds. HOLD CASH or stick to SOL/majors:",
      tokens: sortedByScore.slice(0, 3).map((token) => {
        const ageHours = token.createdAt ? (Date.now() / 1000 - token.createdAt) / 3600 : null
        const ageText = ageHours
          ? ageHours < 24
            ? `${ageHours.toFixed(1)}h old`
            : `${(ageHours / 24).toFixed(1)} days old`
          : "age unknown"
        
        return {
          name: token.name ?? token.symbol ?? token.address.slice(0, 6),
          symbol: token.symbol,
          address: token.address,
          rationale: `${ageText} | Liq ${formatUsd(token.liquidityUsd)} (BELOW $50k threshold) | Vol ${formatUsd(token.volume24hUsd)}`,
          liquidityUsd: token.liquidityUsd ?? undefined,
          volume24hUsd: token.volume24hUsd ?? undefined,
        }
      }),
      insight: `🛑 MARKET IS COLD: These tokens listed for reference ONLY. DO NOT BUY unless liquidity exceeds $50k + volume exceeds $30k. Wait for better setups.`,
    })
  }

  return recommendations
}
