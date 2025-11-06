import { NextResponse } from "next/server"
import { AGENT_PERSONAS, type AgentPersona } from "@/lib/agent-personas"
import {
  collectAgentIntel,
  type AgentIntel,
  type PortfolioToken,
} from "@/lib/agent-intelligence"

interface ChatHistoryItem {
  role: "user" | "agent"
  content: string
}

interface TokenSnapshot {
  mint: string
  symbol?: string
  name?: string
  balance: number
  value?: number
  price?: number
  change24h?: number
}

interface ChatRequestBody {
  agentId?: string
  message?: string
  history?: ChatHistoryItem[]
  walletAddress?: string | null
  tokens?: TokenSnapshot[]
}

interface DeepSeekMessage {
  role: "system" | "user" | "assistant"
  content: string
}

const MAX_TOKENS = 16

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody
    const { agentId, message, history = [], walletAddress, tokens = [] } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 })
    }

    const persona = AGENT_PERSONAS.find((agent) => agent.id === agentId) ?? AGENT_PERSONAS[0]
    const sanitizedTokens = Array.isArray(tokens) ? tokens.slice(0, MAX_TOKENS) : []
    const portfolioSummary = buildPortfolioSummary(sanitizedTokens)
    const portfolioContext = createPortfolioContext(sanitizedTokens, walletAddress)

    let agentIntel: AgentIntel | null = null
    const intelTokens: PortfolioToken[] = sanitizedTokens.map((token) => ({
      mint: token.mint,
      symbol: token.symbol,
      name: token.name,
      value: token.value,
      change24h: token.change24h,
    }))

    try {
      agentIntel = await collectAgentIntel(persona, intelTokens)
    } catch (_error) {
      agentIntel = null
    }

    const reply = await generateAgentReply({
      persona,
      message,
      history,
      portfolioSummary,
      portfolioContext,
      tokens: sanitizedTokens,
      agentIntel,
    })

    return NextResponse.json({
      success: true,
      reply,
      agentId: persona.id,
      intel: agentIntel,
    })
  } catch (_error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

async function generateAgentReply({
  persona,
  message,
  history,
  portfolioSummary,
  portfolioContext,
  tokens,
  agentIntel,
}: {
  persona: AgentPersona
  message: string
  history: ChatHistoryItem[]
  portfolioSummary: string
  portfolioContext: string
  tokens: TokenSnapshot[]
  agentIntel: AgentIntel | null
}): Promise<string> {
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const deepseekMessages = buildDeepSeekMessages({
        persona,
        history,
        message,
        portfolioSummary,
        portfolioContext,
        agentIntel,
      })

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: pickTemperature(persona.riskProfile),
          max_tokens: 2500,
          messages: deepseekMessages,
        }),
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const content = payload.choices?.[0]?.message?.content
        if (content && content.trim().length > 0) {
          return content.trim()
        }
      } else {
        await response.json().catch(() => ({}))
      }
    } catch (_error) {}
  }

  return generateFallbackReply({ persona, message, tokens, portfolioSummary, portfolioContext, agentIntel })
}

function buildDeepSeekMessages({
  persona,
  history,
  message,
  portfolioSummary,
  portfolioContext,
  agentIntel,
}: {
  persona: AgentPersona
  history: ChatHistoryItem[]
  message: string
  portfolioSummary: string
  portfolioContext: string
  agentIntel: AgentIntel | null
}): DeepSeekMessage[] {
  const systemPrompt = `You are ${persona.name} (${persona.title}). ${persona.description} Stay strictly in character, speak with the tone "${persona.tone}" and follow the strategy: ${persona.strategy}`

  const behaviourPrompt = `Conversation style: ${persona.conversationStyle}.
Recommendation style: ${persona.recommendationStyle}.
Deliver concise sections with actionable recommendations and risk considerations.`

  const contextParts: string[] = []
  if (portfolioContext) {
    contextParts.push(`Portfolio context: ${portfolioContext}`)
  }
  if (portfolioSummary) {
    contextParts.push(`Assets snapshot:\n${portfolioSummary}`)
  }

  const contextPrompt = contextParts.length
    ? contextParts.join("\n\n")
    : "No portfolio data available beyond the incoming question."

  const intelPrompt = composeIntelPrompt(agentIntel)
  const deepseekHistory = convertHistoryToDeepSeekMessages(history)

  const messages: DeepSeekMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: behaviourPrompt },
    { role: "system", content: contextPrompt },
  ]

  if (intelPrompt) {
    messages.push({ role: "system", content: intelPrompt })
  }

  messages.push(...deepseekHistory)
  messages.push({ role: "user", content: message })

  return messages
}

function convertHistoryToDeepSeekMessages(history: ChatHistoryItem[]): DeepSeekMessage[] {
  return history
    .filter((item) => item.content && item.content.trim().length > 0)
    .map((item) => ({
      role: item.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: item.content,
    }))
}

function generateFallbackReply({
  persona,
  message,
  tokens,
  portfolioSummary,
  portfolioContext,
  agentIntel,
}: {
  persona: AgentPersona
  message: string
  tokens: TokenSnapshot[]
  portfolioSummary: string
  portfolioContext: string
  agentIntel: AgentIntel | null
}) {
  const totalValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0)

  const topTokenLines = tokens
    .filter((token) => (token.value || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 3)
    .map((token, index) => {
      const percentage = totalValue > 0 ? (((token.value || 0) / totalValue) * 100).toFixed(1) : "0"
      const label = token.symbol || token.name || token.mint.slice(0, 6)
      const change = typeof token.change24h === "number" ? `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%` : "N/A"
      return `${index + 1}. ${label} - $${(token.value || 0).toFixed(2)} (${percentage}%), 24h: ${change}`
    })

  const hotMoves = tokens
    .filter((token) => typeof token.change24h === "number" && token.change24h >= 12)
    .slice(0, 2)
    .map((token) => `${token.symbol || token.mint.slice(0, 6)} up ${token.change24h!.toFixed(1)}%`)

  const weakMoves = tokens
    .filter((token) => typeof token.change24h === "number" && token.change24h <= -12)
    .slice(0, 2)
    .map((token) => `${token.symbol || token.mint.slice(0, 6)} down ${token.change24h!.toFixed(1)}%`)

  const actionPlan = buildActionPlan(persona, { totalValue, hotMoves, weakMoves })
  const intelHighlights = agentIntel ? formatIntelSections(agentIntel) : ""

  const recommendations = agentIntel?.recommendations ?? []
  const recommendationText = recommendations.length
    ? `\n\n🎯 CONCRETE RECOMMENDATIONS:\n${recommendations
        .map((rec) => {
          const recTokens = rec.tokens
            .map((token) =>
              `  • ${token.name}${token.symbol ? ` (${token.symbol})` : ""}\n    Contract: ${token.address}\n    ${token.rationale}`,
            )
            .join("\n")
          return `${rec.message}\n${recTokens}${rec.insight ? `\n  💡 ${rec.insight}` : ""}`
        })
        .join("\n\n")}\n`
    : "\n\n⚠️ No qualifying meme plays detected in current market scan. Preserve capital.\n"

  return `${persona.emoji} ${persona.name}

${persona.greeting}

Your question: "${message}"

${portfolioContext ? `📊 Context:\n${portfolioContext}\n\n` : ""}${portfolioSummary.trim().length ? `🔎 Assets:\n${portfolioSummary}\n\n` : ""}${intelHighlights}${topTokenLines.length ? `🏆 Top positions:\n${topTokenLines.map((line) => `- ${line}`).join("\n")}\n\n` : ""}${hotMoves.length ? `🔥 Strong movers: ${hotMoves.join(", ")}\n` : ""}${weakMoves.length ? `⚠️ Under pressure: ${weakMoves.join(", ")}\n` : ""}${recommendationText}
${actionPlan}`.trim()
}

function composeIntelPrompt(agentIntel: AgentIntel | null) {
  if (!agentIntel) return null
  const summarySections = [
    formatIntelSection("Highlights", agentIntel.highlights),
    formatIntelSection("Risk alerts", agentIntel.risks),
    formatIntelSection("Opportunities", agentIntel.opportunities),
  ]
    .filter((section) => section.length > 0)
    .join("\n")

  const header = `Market intelligence snapshot (${agentIntel.dataTimestamp} UTC):`
  const summary = summarySections ? `${summarySections}\n\n` : ""
  return `${header}\n${summary}${agentIntel.promptContext}`
}

function formatIntelSections(agentIntel: AgentIntel) {
  const sections = [
    formatIntelSection("🧠 Intel highlights", agentIntel.highlights),
    formatIntelSection("⚠️ Risk alerts", agentIntel.risks),
    formatIntelSection("🚀 Opportunity radar", agentIntel.opportunities),
  ].filter((section) => section.length > 0)

  return sections.length ? `${sections.join("\n\n")}\n\n` : ""
}

function formatIntelSection(title: string, items: string[]) {
  if (!items || items.length === 0) return ""
  return `${title}:\n${items.map((item) => `- ${item}`).join("\n")}`
}

function buildPortfolioSummary(tokens: TokenSnapshot[]) {
  if (!tokens.length) return "No asset data available."

  return tokens
    .map((token) => {
      const label = token.symbol || token.name || token.mint.slice(0, 6)
      const value = token.value ? `$${token.value.toFixed(2)}` : "N/A"
      const change = typeof token.change24h === "number" ? `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%` : "N/A"
      return `${label}: ${value}, 24h: ${change}`
    })
    .join("\n")
}

function createPortfolioContext(tokens: TokenSnapshot[], walletAddress?: string | null) {
  if (!walletAddress) {
    return "Wallet not connected - recommendations stay general."
  }
  if (!tokens.length) {
    return `Wallet ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)} connected, but no assets detected.`
  }
  const totalValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0)
  return `Wallet ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}. Portfolio value ~$${totalValue.toFixed(2)}.`
}

function buildActionPlan(
  persona: AgentPersona,
  {
    totalValue,
    hotMoves,
    weakMoves,
  }: {
    totalValue: number
    hotMoves: string[]
    weakMoves: string[]
  },
) {
  const baseLine = totalValue > 0
    ? `Current portfolio value is roughly ~$${totalValue.toFixed(2)}.`
    : "Portfolio size is undefined - operate from risk management first principles."

  switch (persona.riskProfile) {
    case "conservative":
      return `${baseLine}

🛡️ Billioner-X Playbook:
1. Park at least 30% of capital in stables and strong L1 assets.
2. Audit liquidity on risky positions. If depth is under $10k, trim exposure.
3. Configure stops/alerts: -8% on vulnerable assets, +12% to secure gains.`
    case "balanced":
      return `${baseLine}

🏙 Avenna Playbook:
1. Cross-check macro context: SOL index, volume trend, funding rates.
2. For trend leaders, trail stops near prior support zones.
3. For weak positions ${weakMoves.length ? `(${weakMoves.join("; ")}) ` : ""}consider a hedge or partial exit up to 20% of capital.`
    case "adaptive":
      return `${baseLine}

🏠 Tyo Playbook:
1. Update the trading journal: entry, per-trade risk, targets.
2. Reinforce discipline: limit exposure to 2-3 setups at a time.
3. ${hotMoves.length ? `Ride momentum in ${hotMoves.join(", ")}` : "Pick new trades"} only after confirmation from volume and key levels.`
    case "adventurous":
      return `${baseLine}

🎭 Sweet Playbook:
1. Catch momentum early but lock 40-50% after a +25% move.
2. Track social buzz and liquidity; if the wave fades, exit without emotion.
3. Respect the daily loss cap (max 3% of capital).`
    default:
      return `${baseLine}

⚙️ Core Playbook:
1. Allocate capital: 50% core (SOL, stables, tier-one L1s), 30% growth, 20% experiments.
2. Assign every position a role; rebalance when metrics break the thesis.
3. Schedule a weekly review with a risk and objectives checklist.`
  }
}

function pickTemperature(profile: AgentPersona["riskProfile"]) {
  switch (profile) {
    case "conservative":
      return 0.4
    case "balanced":
      return 0.55
    case "adaptive":
      return 0.65
    case "adventurous":
      return 0.8
    default:
      return 0.6
  }
}