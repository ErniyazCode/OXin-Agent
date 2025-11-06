import { NextResponse } from "next/server"

/**
 * Get advanced token analytics from multiple sources
 * Combines data from Solscan, CoinMarketCap, and other APIs
 */
export async function POST(request: Request) {
  try {
    const { tokenAddress, symbol } = await request.json()

    if (!tokenAddress && !symbol) {
      return NextResponse.json({ error: "Token address or symbol is required" }, { status: 400 })
    }

    const analytics: any = {
      tokenAddress,
      symbol,
      solscan: null,
      coinmarketcap: null,
      combined: {},
    }

    // Get data from Solscan
    if (process.env.SOLSCAN_API_KEY && tokenAddress) {
      try {
        // Token metadata
        const metaResponse = await fetch(`https://pro-api.solscan.io/v2.0/token/meta?address=${tokenAddress}`, {
          headers: {
            token: process.env.SOLSCAN_API_KEY,
          },
        })

        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          analytics.solscan = metaData.data
        }

        // Token holders
        const holdersResponse = await fetch(`https://pro-api.solscan.io/v2.0/token/holders?address=${tokenAddress}`, {
          headers: {
            token: process.env.SOLSCAN_API_KEY,
          },
        })

        if (holdersResponse.ok) {
          const holdersData = await holdersResponse.json()
          if (analytics.solscan) {
            analytics.solscan.holders = holdersData.data
          }
        }

        // Token transfers (last 24h)
        const transfersResponse = await fetch(
          `https://pro-api.solscan.io/v2.0/token/transfer?address=${tokenAddress}&page=1&page_size=10`,
          {
            headers: {
              token: process.env.SOLSCAN_API_KEY,
            },
          },
        )

        if (transfersResponse.ok) {
          const transfersData = await transfersResponse.json()
          if (analytics.solscan) {
            analytics.solscan.recentTransfers = transfersData.data
          }
        }
  } catch (_error) {}
    }

    // Get data from CoinMarketCap (if we have symbol)
    if (process.env.COINMARKETCAP_API_KEY && symbol) {
      try {
        // Get token info by symbol
        const infoResponse = await fetch(
          `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${symbol.toUpperCase()}`,
          {
            headers: {
              "X-CMC_PRO_API_KEY": process.env.COINMARKETCAP_API_KEY,
            },
          },
        )

        if (infoResponse.ok) {
          const infoData = await infoResponse.json()
          const tokenData = infoData.data?.[symbol.toUpperCase()]

            if (tokenData) {
              analytics.coinmarketcap = {
                info: tokenData,
              }

            // Get latest quotes
            const quoteResponse = await fetch(
              `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}`,
              {
                headers: {
                  "X-CMC_PRO_API_KEY": process.env.COINMARKETCAP_API_KEY,
                },
              },
            )

              if (quoteResponse.ok) {
                const quoteData = await quoteResponse.json()
                analytics.coinmarketcap.quote = quoteData.data?.[symbol.toUpperCase()]
              }
          }
        }
  } catch (_error) {}
    }

    // Combine data into useful metrics
    analytics.combined = {
      price: analytics.solscan?.price || analytics.coinmarketcap?.quote?.quote?.USD?.price || null,
      marketCap: analytics.coinmarketcap?.quote?.quote?.USD?.market_cap || analytics.solscan?.market_cap || null,
      volume24h: analytics.solscan?.volume24h || analytics.coinmarketcap?.quote?.quote?.USD?.volume_24h || null,
      priceChange24h:
        analytics.solscan?.price_change_24h || analytics.coinmarketcap?.quote?.quote?.USD?.percent_change_24h || null,
      holders: analytics.solscan?.holders?.total || null,
      totalSupply: analytics.solscan?.supply || analytics.coinmarketcap?.info?.total_supply || null,
      circulatingSupply:
        analytics.solscan?.circulating_supply || analytics.coinmarketcap?.quote?.quote?.USD?.circulating_supply || null,
      rank: analytics.coinmarketcap?.info?.cmc_rank || null,
      website: analytics.coinmarketcap?.info?.urls?.website?.[0] || null,
      twitter: analytics.coinmarketcap?.info?.urls?.twitter?.[0] || null,
      description: analytics.coinmarketcap?.info?.description || null,
    }

    const hasData = analytics.solscan || analytics.coinmarketcap

    if (!hasData) {
      return NextResponse.json(
        {
          error: "No analytics data available",
          message: "Unable to fetch analytics from any source",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: analytics,
    })
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
