import { NextResponse } from "next/server"

/**
 * Get real-time streaming data for tokens (especially memecoins)
 * Uses SolanaStreaming API for live price updates
 */
export async function POST(request: Request) {
  try {
    const { tokenAddress } = await request.json()

    if (!tokenAddress) {
      return NextResponse.json({ error: "Token address is required" }, { status: 400 })
    }

    // SolanaStreaming API for real-time memecoin data
    if (process.env.SOLANASTREAMING_API_KEY) {
      try {
        // According to docs: https://solanastreaming.com/blog/how-to-stream-live-solana-token-prices
        const response = await fetch(`https://api.solanastreaming.com/v1/token/live/${tokenAddress}`, {
          headers: {
            Authorization: `Bearer ${process.env.SOLANASTREAMING_API_KEY}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()

          return NextResponse.json({
            success: true,
            tokenAddress,
            dataSource: "solanastreaming",
            data: {
              price: data.price,
              priceChange24h: data.priceChange24h,
              volume24h: data.volume24h,
              marketCap: data.marketCap,
              liquidity: data.liquidity,
              holders: data.holders,
              lastUpdate: data.timestamp,
            },
          })
        }
  } catch (_error) {}
    }

    // Fallback to DexScreener for real-time data
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)

      if (response.ok) {
        const data = await response.json()
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0]

          return NextResponse.json({
            success: true,
            tokenAddress,
            dataSource: "dexscreener",
            data: {
              price: Number.parseFloat(pair.priceUsd) || 0,
              priceChange24h: pair.priceChange?.h24 || 0,
              volume24h: pair.volume?.h24 || 0,
              marketCap: pair.marketCap || 0,
              liquidity: pair.liquidity?.usd || 0,
              holders: null,
              lastUpdate: Date.now(),
            },
          })
        }
      }
  } catch (_error) {}

    return NextResponse.json(
      {
        error: "No streaming data available",
        message: "Unable to fetch live data from any source",
      },
      { status: 404 },
    )
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Get streaming data for multiple tokens at once
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tokens = searchParams.get("tokens")?.split(",") || []

    if (tokens.length === 0) {
      return NextResponse.json({ error: "No tokens provided" }, { status: 400 })
    }

    // SolanaStreaming supports batch requests
    if (process.env.SOLANASTREAMING_API_KEY) {
      try {
        const response = await fetch(`https://api.solanastreaming.com/v1/tokens/batch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SOLANASTREAMING_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokens: tokens,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            success: true,
            dataSource: "solanastreaming",
            tokens: data.tokens,
          })
        }
  } catch (_error) {}
    }

    // Fallback: fetch each token individually from DexScreener
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`)
          if (response.ok) {
            const data = await response.json()
            if (data.pairs && data.pairs.length > 0) {
              const pair = data.pairs[0]
              return {
                address: token,
                price: Number.parseFloat(pair.priceUsd) || 0,
                priceChange24h: pair.priceChange?.h24 || 0,
                volume24h: pair.volume?.h24 || 0,
                liquidity: pair.liquidity?.usd || 0,
              }
            }
          }
  } catch (_error) {}
        return null
      }),
    )

    const filteredResults = results.filter((r) => r !== null)

    return NextResponse.json({
      success: true,
      dataSource: "dexscreener",
      tokens: filteredResults,
    })
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
