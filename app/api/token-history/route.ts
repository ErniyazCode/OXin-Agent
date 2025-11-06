import { NextResponse } from "next/server"

interface PricePoint {
  timestamp: number
  price: number
  volume?: number
}

/**
 * Get token price history for charts
 * Supports multiple data sources: Birdeye, CoinAPI, Solscan, SolanaStreaming
 */
export async function POST(request: Request) {
  try {
    const { tokenAddress, timeframe = "24h" } = await request.json()

    if (!tokenAddress) {
      return NextResponse.json({ error: "Token address is required" }, { status: 400 })
    }

    let priceHistory: PricePoint[] = []
    let dataSource = "none"

    // Try Birdeye first (best for historical data)
    if (process.env.BIRDEYE_API_KEY && !priceHistory.length) {
      try {
        const timeMap: { [key: string]: string } = {
          "1h": "1H",
          "24h": "1D",
          "7d": "1W",
          "30d": "1M",
        }

        const response = await fetch(
          `https://public-api.birdeye.so/defi/history_price?address=${tokenAddress}&address_type=token&type=${timeMap[timeframe] || "1D"}`,
          {
            headers: {
              "X-API-KEY": process.env.BIRDEYE_API_KEY,
            },
          },
        )

        if (response.ok) {
          const data = await response.json()
          if (data.data?.items) {
            priceHistory = data.data.items.map((item: any) => ({
              timestamp: item.unixTime * 1000,
              price: item.value,
              volume: item.volume,
            }))
            dataSource = "birdeye"
          }
        }
  } catch (_error) {}
    }

    // Try CoinAPI as alternative
    if (process.env.COINAPI_KEY && !priceHistory.length) {
      try {
        const periodMap: { [key: string]: string } = {
          "1h": "1MIN",
          "24h": "1HRS",
          "7d": "6HRS",
          "30d": "1DAY",
        }

        const period = periodMap[timeframe] || "1HRS"
        const now = new Date()
        const timeStart = new Date(now.getTime() - getTimeframeMs(timeframe))

        const response = await fetch(
          `https://rest.coinapi.io/v1/ohlcv/SOLANA/USD/history?period_id=${period}&time_start=${timeStart.toISOString()}&time_end=${now.toISOString()}`,
          {
            headers: {
              "X-CoinAPI-Key": process.env.COINAPI_KEY,
            },
          },
        )

        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            priceHistory = data.map((item: any) => ({
              timestamp: new Date(item.time_period_start).getTime(),
              price: item.price_close,
              volume: item.volume_traded,
            }))
            dataSource = "coinapi"
          }
        }
  } catch (_error) {}
    }

    // Try DexScreener for recent data (free, no auth)
    if (!priceHistory.length) {
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)

        if (response.ok) {
          const data = await response.json()
          if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0]
            // DexScreener doesn't provide historical data, but we can return current price
            priceHistory = [
              {
                timestamp: Date.now(),
                price: Number.parseFloat(pair.priceUsd) || 0,
                volume: pair.volume?.h24 || 0,
              },
            ]
            dataSource = "dexscreener"
          }
        }
  } catch (_error) {}
    }

    // Try Solscan for token transactions and price estimates
    if (process.env.SOLSCAN_API_KEY && !priceHistory.length) {
      try {
        const response = await fetch(`https://pro-api.solscan.io/v2.0/token/meta?address=${tokenAddress}`, {
          headers: {
            token: process.env.SOLSCAN_API_KEY,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.data?.price) {
            priceHistory = [
              {
                timestamp: Date.now(),
                price: data.data.price,
                volume: data.data.volume24h,
              },
            ]
            dataSource = "solscan"
          }
        }
  } catch (_error) {}
    }

    if (!priceHistory.length) {
      return NextResponse.json(
        {
          error: "No price history available",
          message: "Unable to fetch price history from any source",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      tokenAddress,
      timeframe,
      dataSource,
      data: priceHistory,
      count: priceHistory.length,
    })
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getTimeframeMs(timeframe: string): number {
  const map: { [key: string]: number } = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  }
  return map[timeframe] || map["24h"]
}
