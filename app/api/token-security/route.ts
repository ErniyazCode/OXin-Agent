import { NextResponse } from "next/server"

/**
 * Advanced Token Security Analysis
 * Combines RugCheck API + Code Analysis for comprehensive security checks
 */
export async function POST(request: Request) {
  try {
    const { tokenAddress } = await request.json()

    if (!tokenAddress) {
      return NextResponse.json({ error: "Token address is required" }, { status: 400 })
    }

    const securityReport: any = {
      tokenAddress,
      timestamp: Date.now(),
      rugcheck: null,
      helius: null,
      securityScore: 0,
      riskLevel: "UNKNOWN",
      risks: [],
      warnings: [],
      greenFlags: [],
      maliciousCode: false,
      freezeAuthority: null,
      mintAuthority: null,
      totalLiquidity: null,
      holderConcentration: null,
      isNativeToken: false,
    }

    // 1. RugCheck Analysis (FREE, No Auth Required)
    try {
      const rugCheckResponse = await fetch(`https://api.rugcheck.xyz/v1/tokens/${tokenAddress}/report`)

      if (rugCheckResponse.ok) {
        const rugData = await rugCheckResponse.json()
        securityReport.rugcheck = rugData

        // Parse RugCheck score (0-1, higher is better)
        securityReport.securityScore = rugData.score || 0
        securityReport.rugged = rugData.rugged || false

        // Extract authority info
        securityReport.freezeAuthority = rugData.freezeAuthority
        securityReport.mintAuthority = rugData.mintAuthority

        // Analyze risks
        if (rugData.risks && Array.isArray(rugData.risks)) {
          rugData.risks.forEach((risk: any) => {
            const riskItem = {
              level: risk.level, // "danger", "warning", "info"
              name: risk.name,
              description: risk.description,
              score: risk.score,
            }

            if (risk.level === "danger") {
              securityReport.risks.push(riskItem)
            } else if (risk.level === "warning") {
              securityReport.warnings.push(riskItem)
            } else {
              securityReport.greenFlags.push(riskItem)
            }
          })
        }

        // Check for malicious indicators
        if (rugData.rugged) {
          securityReport.maliciousCode = true
          securityReport.risks.push({
            level: "danger",
            name: "RUG PULL DETECTED",
            description: "This token has been flagged as a rug pull by RugCheck",
            score: 0,
          })
        }

        // Market analysis
        if (rugData.markets && rugData.markets.length > 0) {
          securityReport.markets = rugData.markets.map((market: any) => ({
            dex: market.dex,
            liquidity: market.liquidity,
            lpLocked: market.lp?.locked || false,
            lpLockedPct: market.lp?.pct || 0,
          }))

          const aggregatedLiquidity = rugData.totalMarketLiquidity ?? rugData.markets.reduce((sum: number, market: any) => {
            const value = typeof market.liquidity === "number" ? market.liquidity : Number(market.liquidityUsd) || 0
            return sum + value
          }, 0)

          securityReport.totalLiquidity = aggregatedLiquidity > 0 ? aggregatedLiquidity : null
          securityReport.totalLPProviders = rugData.totalLPProviders || 0
        }

        // Holder analysis
        securityReport.totalHolders = rugData.totalHolders || 0
        securityReport.creatorBalance = rugData.creatorBalance || 0

        // Top holders concentration
        if (rugData.topHolders && rugData.topHolders.length > 0) {
          const top10Pct = rugData.topHolders
            .slice(0, 10)
            .reduce((sum: number, holder: any) => sum + (holder.pct || 0), 0)

          securityReport.holderConcentration = top10Pct

          if (top10Pct > 50) {
            securityReport.warnings.push({
              level: "warning",
              name: "High Holder Concentration",
              description: `Top 10 holders control ${top10Pct.toFixed(1)}% of supply`,
              score: 0.5,
            })
          }
        }

      }
  } catch (_error) {}

    // 2. Helius DAS API - Get Token Metadata and Program Info
    if (process.env.HELIUS_API_KEY) {
      try {
        const heliusResponse = await fetch(
          `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "helius-security",
              method: "getAsset",
              params: { id: tokenAddress },
            }),
          },
        )

        if (heliusResponse.ok) {
          const heliusData = await heliusResponse.json()
          if (heliusData.result) {
            securityReport.helius = heliusData.result

            // Check token metadata
            const metadata = heliusData.result.content?.metadata
            if (metadata) {
              securityReport.tokenName = metadata.name
              securityReport.tokenSymbol = metadata.symbol

              // Check for suspicious metadata
              if (!metadata.name || !metadata.symbol) {
                securityReport.warnings.push({
                  level: "warning",
                  name: "Missing Metadata",
                  description: "Token has incomplete metadata",
                  score: 0.7,
                })
              }
            }

            // Check ownership and authorities
            const ownership = heliusData.result.ownership
            if (ownership) {
              securityReport.owner = ownership.owner
              securityReport.frozen = ownership.frozen

              if (ownership.frozen) {
                securityReport.risks.push({
                  level: "danger",
                  name: "Token Frozen",
                  description: "This token is currently frozen and cannot be transferred",
                  score: 0,
                })
              }
            }

          }
        }
  } catch (_error) {}
    }

    // 3. Calculate Risk Level
    const riskCount = securityReport.risks.length
    const warningCount = securityReport.warnings.length
    const score = securityReport.securityScore

    // Check if it's a well-known native token - automatically LOW risk
    const nativeTokens = [
      "So11111111111111111111111111111111111111112", // SOL
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    ]

    const isNativeToken = nativeTokens.includes(tokenAddress)
    securityReport.isNativeToken = isNativeToken

    if (isNativeToken) {
      securityReport.riskLevel = "LOW"
      securityReport.totalLiquidity = null
      securityReport.holderConcentration = null
    } else if (securityReport.rugged || riskCount >= 3) {
      securityReport.riskLevel = "CRITICAL"
    } else if (riskCount >= 1 || score < 0.5) {
      securityReport.riskLevel = "HIGH"
    } else if (warningCount >= 2 || score < 0.75) {
      securityReport.riskLevel = "MEDIUM"
    } else if (score >= 0.9) {
      securityReport.riskLevel = "LOW"
    } else {
      securityReport.riskLevel = "MODERATE"
    }

    // 4. Generate Recommendation
    securityReport.recommendation = generateRecommendation(securityReport)

    // 5. Summary
    securityReport.summary = {
      totalRisks: riskCount,
      totalWarnings: warningCount,
      totalGreenFlags: securityReport.greenFlags.length,
      score: score,
      riskLevel: securityReport.riskLevel,
      isSafe: securityReport.riskLevel === "LOW" || securityReport.riskLevel === "MODERATE",
    }

    return NextResponse.json({
      success: true,
      data: securityReport,
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Security analysis failed", message: error.message }, { status: 500 })
  }
}

function generateRecommendation(report: any): string {
  const { riskLevel, rugged, risks, warnings, totalLiquidity, totalHolders, tokenSymbol, tokenAddress } = report

  // Check if it's a well-known native token
  const nativeTokens = [
    "So11111111111111111111111111111111111111112", // SOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  ]

  if (nativeTokens.includes(tokenAddress)) {
    return "✅ NATIVE TOKEN: This is a well-known native Solana token. Generally safe for holding."
  }

  if (rugged) {
    return "🚨 AVOID: This token is confirmed as a rug pull. Do not invest."
  }

  if (riskLevel === "CRITICAL") {
    return "🔴 CRITICAL RISK: Multiple serious issues detected. Strongly recommend avoiding this token."
  }

  if (riskLevel === "HIGH") {
    return "⚠️ HIGH RISK: Significant security concerns. Only invest what you can afford to lose."
  }

  if (riskLevel === "MEDIUM") {
    return "⚡ MODERATE RISK: Some concerns present. Exercise caution and do thorough research."
  }

  if (totalLiquidity && totalLiquidity < 10000) {
    return "💧 LOW LIQUIDITY: Very low liquidity detected. High risk of price manipulation."
  }

  if (totalHolders && totalHolders < 100) {
    return "👥 FEW HOLDERS: Very few holders detected. Token may not have organic community."
  }

  if (warnings.length === 0 && risks.length === 0) {
    return "✅ RELATIVELY SAFE: No major red flags detected. Always DYOR before investing."
  }

  return "⚡ PROCEED WITH CAUTION: Review the detailed risk analysis before investing."
}
