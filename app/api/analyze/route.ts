import { NextResponse } from "next/server"

interface TokenData {
  mint: string
  symbol?: string
  name?: string
  balance: number
  value?: number
  price?: number
  change24h?: number
}

interface TokenAnalysis {
  mint: string
  dexscreener?: {
    priceUsd?: number | null
    priceChange?: { h24?: number | null }
    liquidity?: { usd?: number | null }
    volume?: { h24?: number | null }
    url?: string
    symbol?: string
    name?: string
  }
  rugcheck?: {
    score?: number | null
    rugged?: boolean
    risks?: Array<{ level: string; name: string; description?: string }>
    freezeAuthority?: string | null
    mintAuthority?: string | null
    topHolders?: Array<{ address: string; pct: number }>
  }
  birdeye?: any
}

interface AnalyzeRequestBody {
  tokens?: TokenData[]
}

interface ApiStatus {
  deepseek: boolean
}

type EnrichedToken = TokenData & TokenAnalysis

interface DeepSeekMessage {
  role: "system" | "user"
  content: string
}

const MAX_TOKENS = 20

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody
    const tokensInput = Array.isArray(body?.tokens) ? body.tokens : []

    if (!tokensInput.length) {
      const analysis = generateFallbackAnalysis([])
      return NextResponse.json({ analysis, tokenData: [], apiStatus: { deepseek: false } })
    }

    const normalizedTokens = tokensInput
      .filter(isTokenData)
      .slice(0, MAX_TOKENS)
      .map(normalizeTokenData)

    const portfolioSummary = await Promise.all(normalizedTokens.map(enrichTokenData))

    const apiStatus: ApiStatus = { deepseek: false }
    let analysis = ""

    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const messages = buildDeepSeekMessages(portfolioSummary)

        const response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            temperature: 0.7,
            max_tokens: 4000,
            messages,
          }),
        })

        if (response.ok) {
          const payload = await response.json()
          const content = payload.choices?.[0]?.message?.content
          if (typeof content === "string" && content.trim().length) {
            analysis = content.trim()
            apiStatus.deepseek = true
          }
        }
  } catch (_error: any) {}
      }

    if (!analysis) {
      analysis = generateFallbackAnalysis(portfolioSummary)
    }

    return NextResponse.json({
      analysis,
      tokenData: portfolioSummary,
      apiStatus,
    })
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function isTokenData(value: unknown): value is TokenData {
  return !!value && typeof value === "object" && typeof (value as TokenData).mint === "string"
}

function normalizeTokenData(token: TokenData): TokenData {
  return {
    ...token,
    balance: Number.isFinite(token.balance) ? Number(token.balance) : 0,
    value: normalizeNumeric(token.value),
    price: normalizeNumeric(token.price),
    change24h: normalizeNumeric(token.change24h),
  }
}

function normalizeNumeric(value: unknown): number | undefined {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : (value as number)
  return Number.isFinite(numeric) ? Number(numeric) : undefined
}

async function enrichTokenData(token: TokenData): Promise<EnrichedToken> {
  const enriched: EnrichedToken = {
    ...token,
    mint: token.mint,
  }

  if (!enriched.value && enriched.price) {
    enriched.value = enriched.balance * enriched.price
  }

  const [dexResult, rugResult, birdeyeResult] = await Promise.allSettled([
    fetchDexScreenerData(token.mint),
    fetchRugCheckData(token.mint),
    fetchBirdeyeData(token.mint),
  ])

  if (dexResult.status === "fulfilled" && dexResult.value) {
    const dexData = dexResult.value
    enriched.dexscreener = dexData

    if (!enriched.symbol && dexData.symbol) {
      enriched.symbol = dexData.symbol
    }
    if (!enriched.name && dexData.name) {
      enriched.name = dexData.name
    }

    if (normalizeNumeric(enriched.value) === undefined && dexData.priceUsd) {
      enriched.price = dexData.priceUsd
      enriched.value = enriched.balance * (enriched.price || 0)
    }

    if (typeof dexData.priceChange?.h24 === "number") {
      enriched.change24h = dexData.priceChange?.h24 ?? enriched.change24h
    }
  }

  if (rugResult.status === "fulfilled" && rugResult.value) {
    enriched.rugcheck = rugResult.value
  }

  if (birdeyeResult.status === "fulfilled" && birdeyeResult.value) {
    enriched.birdeye = birdeyeResult.value
  }

  return enriched
}

async function fetchDexScreenerData(mint: string) {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
    if (!response.ok) {
      return null
    }

    const json = await response.json()
    const pair = json?.pairs?.[0]
    if (!pair) {
      return null
    }

    return {
      symbol: pair.baseToken?.symbol as string | undefined,
      name: pair.baseToken?.name as string | undefined,
      priceUsd: safeNumber(pair.priceUsd),
      priceChange: {
        h24: safeNumber(pair.priceChange?.h24),
      },
      liquidity: {
        usd: safeNumber(pair.liquidity?.usd),
      },
      volume: {
        h24: safeNumber(pair.volume?.h24),
      },
      url: pair.url as string | undefined,
    }
  } catch (_error) {
    return null
  }
}

async function fetchRugCheckData(mint: string) {
  try {
    const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`)
    if (!response.ok) {
      return null
    }

    const json = await response.json()
    return {
      score: safeNumber(json?.score),
      rugged: Boolean(json?.rugged),
      freezeAuthority: json?.freezeAuthority ?? null,
      mintAuthority: json?.mintAuthority ?? null,
      risks: Array.isArray(json?.risks)
        ? json.risks.map((risk: any) => ({
            level: risk.level,
            name: risk.name,
            description: risk.description,
          }))
        : [],
      topHolders: Array.isArray(json?.topHolders)
        ? json.topHolders.map((holder: any) => ({
            address: holder.address,
            pct: safeNumber(holder.pct) ?? 0,
          }))
        : [],
    }
  } catch (_error) {
    return null
  }
}

async function fetchBirdeyeData(mint: string) {
  if (!process.env.BIRDEYE_API_KEY) {
    return null
  }

  try {
    const response = await fetch(`https://public-api.birdeye.so/defi/price?address=${mint}`, {
      headers: {
        "X-API-KEY": process.env.BIRDEYE_API_KEY,
      },
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (_error) {
    return null
  }
}

function buildDeepSeekMessages(tokens: EnrichedToken[]): DeepSeekMessage[] {
  const totalValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0)
  const tokenSummaries = tokens.map((token) => ({
    mint: token.mint,
    symbol: token.symbol ?? token.name ?? token.mint.slice(0, 6),
    name: token.name ?? null,
    balance: token.balance,
    value: token.value ?? 0,
    price: token.price ?? 0,
    change24h: token.change24h ?? null,
    sharePct: totalValue > 0 ? ((token.value || 0) / totalValue) * 100 : 0,
    liquidityUsd: token.dexscreener?.liquidity?.usd ?? null,
    volume24h: token.dexscreener?.volume?.h24 ?? null,
    rugScore: token.rugcheck?.score ?? null,
    rugged: token.rugcheck?.rugged ?? false,
    risks: token.rugcheck?.risks ?? [],
  }))

  const dataset = {
    totalValue,
    tokenCount: tokens.length,
    diversificationScore: Math.min(10, tokens.length * 2),
    tokens: tokenSummaries,
  }

  const formatPrompt = `You are an experienced crypto portfolio risk analyst. Respond in concise English with the following sections and uppercase headings. Do not use markdown hashes or numbered headings.

PORTFOLIO SNAPSHOT
- Summarize total value, diversification score, number of tokens, and largest position.

RISK HIGHLIGHTS
- Up to four bullet points calling out urgent risks such as rug flags, thin liquidity, or high concentration.

TOKEN INSIGHTS
For each token include its symbol with percentage weight, risk level emoji, action, price trend, and one key watch item or strength. Use indented hyphen bullets under each token name.

NEXT STEPS
- Provide up to five actionable steps covering diversification, risk management, liquidity, and any urgent exits.

REMINDER
- Close with a single sentence reminding the reader to verify data before trading.`

  return [
    { role: "system", content: formatPrompt },
    { role: "system", content: `Portfolio dataset:\n${JSON.stringify(dataset, null, 2)}` },
    { role: "user", content: "Deliver the portfolio assessment now." },
  ]
}

function safeNumber(value: unknown): number | null {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : (value as number)
  return Number.isFinite(numeric) ? Number(numeric) : null
}

function generateFallbackAnalysis(portfolioSummary: EnrichedToken[]) {
  if (!portfolioSummary.length) {
    return "No portfolio data available. Connect your wallet and try again."
  }

  const totalValue = portfolioSummary.reduce((sum, token) => sum + (token.value || 0), 0)
  const tokenCount = portfolioSummary.length
  const diversificationScore = Math.min(10, tokenCount * 2)

  let healthComment = "balanced mix"
  if (diversificationScore <= 3) {
    healthComment = "critical concentration risk"
  } else if (diversificationScore <= 6) {
    healthComment = "needs better balance"
  }

  const sortedByValue = [...portfolioSummary].sort((a, b) => (b.value || 0) - (a.value || 0))
  const largest = sortedByValue[0]
  const largestShare = totalValue > 0 && largest ? ((largest.value || 0) / totalValue) * 100 : 0

  const sections: string[] = []
  sections.push("PORTFOLIO SNAPSHOT")
  sections.push(`Total value: $${totalValue.toFixed(2)}`)
  sections.push(`Health score: ${diversificationScore}/10 (${healthComment})`)
  sections.push(`Tokens tracked: ${tokenCount}`)
  if (largest) {
    sections.push(`Largest position: ${largest.symbol || "Unknown"} (${largestShare.toFixed(1)}% of value)`)
  }
  sections.push("")

  const tokenSummaries: Array<{ heading: string; lines: string[]; riskLevel: string; recommendation: string }> = []
  const riskAlerts: string[] = []
  const followUpSteps: Set<string> = new Set()

  portfolioSummary.forEach((token) => {
    const percentage = totalValue > 0 ? ((token.value || 0) / totalValue) * 100 : 0
    const priceLine = `Price $${(token.price || 0).toFixed(6)} | 24h ${((token.change24h || 0) >= 0 ? "+" : "")}${(token.change24h || 0).toFixed(2)}%`

    let riskIcon = "🟡"
    let riskLabel = "Moderate"
    let recommendation = "Hold"
    const riskSignals: string[] = []
    const positiveSignals: string[] = []

    if (token.rugcheck) {
      const risks = token.rugcheck.risks || []
      const rugScore = token.rugcheck.score || 0
      const isRugged = token.rugcheck.rugged

      if (isRugged) {
        riskIcon = "🔴"
        riskLabel = "Critical"
        recommendation = "Exit immediately"
        riskSignals.push("RugCheck flags this token as rugged")
      } else if (risks.some((r: any) => r.level === "danger")) {
        riskIcon = "🔴"
        riskLabel = "High"
        recommendation = "Exit or hedge"
        risks
          .filter((r: any) => r.level === "danger")
          .forEach((r: any) => riskSignals.push(`${r.name}: ${r.description}`))
      } else if (risks.some((r: any) => r.level === "warning")) {
        riskIcon = "🟠"
        riskLabel = "Elevated"
        recommendation = "Reduce size and monitor"
        risks
          .filter((r: any) => r.level === "warning")
          .forEach((r: any) => riskSignals.push(r.name))
      } else if (rugScore >= 0.9) {
        riskIcon = "🟢"
        riskLabel = "Low"
        recommendation = "Accumulate on pullbacks"
        positiveSignals.push("Strong RugCheck security score")
      }

      if (token.rugcheck.freezeAuthority) {
        riskSignals.push("Freeze authority is still active")
      }
      if (token.rugcheck.mintAuthority) {
        riskSignals.push("Mint authority is still active")
      }

      if (token.rugcheck.topHolders && token.rugcheck.topHolders.length > 0) {
        const top10Pct = token.rugcheck.topHolders
          .slice(0, 10)
          .reduce((sum: number, h: any) => sum + (h.pct || 0), 0)
        if (top10Pct > 50) {
          riskSignals.push(`Top 10 holders control ${top10Pct.toFixed(1)}% of supply`)
        }
      }
    }

    if (token.dexscreener) {
      const liquidity = token.dexscreener.liquidity?.usd || 0
      if (liquidity < 1000) {
        riskIcon = "🔴"
        riskLabel = "High"
        recommendation = "Exit or hedge"
        riskSignals.push(`Liquidity is extremely low (~$${liquidity.toFixed(0)})`)
      } else if (liquidity < 10000) {
        if (riskIcon !== "🔴") {
          riskIcon = "🟠"
          riskLabel = "Elevated"
          if (recommendation === "Hold") {
            recommendation = "Trade only with tight risk"
          }
        }
        riskSignals.push(`Liquidity is thin (~$${liquidity.toFixed(0)})`)
      } else {
        positiveSignals.push(`Deep liquidity (~$${(token.dexscreener.liquidity?.usd || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })})`)
      }

      const volume24h = token.dexscreener.volume?.h24 || 0
      if (volume24h < 1000) {
        riskSignals.push("24h trading volume is under $1k")
      } else if (volume24h > 0) {
        positiveSignals.push(`24h volume ~$${volume24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}`)
      }
    }

    const heading = `${token.symbol || "Unknown"} (${percentage.toFixed(2)}% of portfolio)`
    const detailLines: string[] = []
    detailLines.push(`${riskIcon} Risk level: ${riskLabel}`)
    detailLines.push(`Action: ${recommendation}`)
    detailLines.push(priceLine)

    if (riskSignals.length) {
      detailLines.push(`Watch: ${riskSignals.slice(0, 3).join("; ")}${riskSignals.length > 3 ? "..." : ""}`)
    }

    if (positiveSignals.length) {
      detailLines.push(`Strengths: ${positiveSignals.slice(0, 3).join("; ")}${positiveSignals.length > 3 ? "..." : ""}`)
    }

    tokenSummaries.push({ heading, lines: detailLines, riskLevel: riskLabel, recommendation })

    if (riskLabel === "Critical" || riskLabel === "High") {
      riskAlerts.push(`${token.symbol || "Unknown"}: ${riskLabel} risk (${percentage.toFixed(1)}% of value). ${riskSignals[0] || "Review immediately."}`)
    }

    if ((recommendation || "").toLowerCase().includes("exit")) {
      followUpSteps.add(`Exit or hedge ${token.symbol || "Unknown"} before liquidity dries up.`)
    }

    if (percentage > 60) {
      followUpSteps.add(`Rebalance so ${token.symbol || "Unknown"} drops below 50% of the portfolio.`)
    }
  })

  if (riskAlerts.length) {
    sections.push("RISK HIGHLIGHTS")
    riskAlerts.slice(0, 4).forEach((alert) => sections.push(`- ${alert}`))
    sections.push("")
  }

  sections.push("TOKEN INSIGHTS")
  tokenSummaries.forEach((token) => {
    sections.push(token.heading)
    token.lines.forEach((line) => sections.push(`  - ${line}`))
    sections.push("")
  })

  const nextSteps: string[] = []
  if (tokenCount < 3) {
    nextSteps.push("Add two or more established assets to reduce single-token risk.")
  }
  if (tokenCount > 10) {
    nextSteps.push("Consolidate smaller positions into your highest conviction assets.")
  }

  followUpSteps.forEach((step) => nextSteps.push(step))
  nextSteps.push("Log your actions and review the portfolio again within 48 hours.")

  sections.push("NEXT STEPS")
  nextSteps.slice(0, 5).forEach((step) => sections.push(`- ${step}`))
  sections.push("")

  sections.push("Reminder: This assessment is based on public on-chain data. Confirm signals before trading.")

  return sections.join("\n")
}
