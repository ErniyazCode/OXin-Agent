import { Connection, PublicKey } from "@solana/web3.js"
import { sharedCache } from "./cache"
import { fetchJson } from "./http"

const DEX_NEW_PAIRS_URL = "https://api.dexscreener.com/latest/dex/search?q=PUMP"  // PUMP memecoins
const DEX_TRENDING_URL = "https://api.dexscreener.com/latest/dex/search?q=SOLANA"
const DEX_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search?q="
const COINGECKO_SIMPLE_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true"
const COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global"
const SOLSCAN_CHAIN_INFO_URL = "https://public-api.solscan.io/chaininfo"
const SOLSCAN_TOKEN_META_URL = "https://public-api.solscan.io/token/meta"

const CACHE_TTL_SHORT = 90_000
const CACHE_TTL_MEDIUM = 180_000
const CACHE_TTL_LONG = 300_000

export interface MemePairInsight {
  name: string
  symbol: string
  address: string
  createdAt: number | null
  liquidityUsd: number | null
  volume24hUsd: number | null
  buyers1h: number | null
  sellers1h: number | null
  priceUsd: number | null
  change1h: number | null
  change6h: number | null
  change24h: number | null
  baseTokenImage?: string
}

export interface MomentumLeader {
  name: string
  symbol: string
  address: string
  priceUsd: number | null
  liquidityUsd: number | null
  volume24hUsd: number | null
  change1h: number | null
  change6h: number | null
  change24h: number | null
  fdvUsd: number | null
}

export interface MacroSnapshot {
  solPriceUsd: number | null
  solChange24h: number | null
  solMarketCap: number | null
  btcDominance: number | null
  marketCap24hChange: number | null
}

export interface RiskSignal {
  mint: string
  name?: string
  symbol?: string
  holders?: number
  liquidityUsd?: number
  priceUsd?: number
  volume24hUsd?: number
  circulatingSupply?: number
  fdvUsd?: number
  topHolders?: Array<{ address: string; percentage: number }>
  warnings: string[]
}

export interface NetworkHealthSnapshot {
  blockHeight: number | null
  averageTps: number | null
  currentSlot: number | null
  healthy: boolean
}

function getEnv(key: string) {
  const value = process.env[key]
  return value && value.trim().length > 0 ? value : undefined
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toUsd(value: unknown): number | null {
  const parsed = parseNumber(value)
  return parsed !== null ? parsed : null
}

export async function fetchTrendingMemes(): Promise<MemePairInsight[]> {
  const cacheKey = "market-intel:trending-memes"
  const cached = sharedCache.get(cacheKey) as MemePairInsight[] | undefined
  if (cached) return cached

  // Fetch meme tokens by searching popular keywords (DexScreener search works best)
  const [pumpResults, solResults] = await Promise.allSettled([
    fetchJson<{ pairs?: any[] }>("https://api.dexscreener.com/latest/dex/search?q=PUMP", {
      headers: { "User-Agent": "OXin-Agent/1.0" },
      timeoutMs: 8000,
    }),
    fetchJson<{ pairs?: any[] }>("https://api.dexscreener.com/latest/dex/search?q=SOLANA", {
      headers: { "User-Agent": "OXin-Agent/1.0" },
      timeoutMs: 8000,
    }),
  ])

  const allPairs: any[] = []
  if (pumpResults.status === "fulfilled") allPairs.push(...(pumpResults.value.pairs ?? []))
  if (solResults.status === "fulfilled") allPairs.push(...(solResults.value.pairs ?? []))

  // Filter for Solana chain only
  const solanaPairs = allPairs.filter((p) => p.chainId === "solana")

  const enriched: MemePairInsight[] = solanaPairs
    .map((pair) => {
      const info = pair?.info ?? {}
      const liquidityUsd = toUsd(pair?.liquidity?.usd)
      const volume24hUsd = toUsd(pair?.volume?.h24)
      
      return {
        name: pair?.baseToken?.name ?? info?.name ?? "Unnamed",
        symbol: pair?.baseToken?.symbol ?? info?.symbol ?? "?",
        address: pair?.pairAddress ?? pair?.tokenAddress ?? pair?.address ?? "",
        createdAt: parseNumber(pair?.pairCreatedAt || pair?.newLp?.createdAt) ?? null,
        liquidityUsd,
        volume24hUsd,
        buyers1h: parseNumber(pair?.txns?.h1?.buys ?? pair?.txns?.h1?.buysCount),
        sellers1h: parseNumber(pair?.txns?.h1?.sells ?? pair?.txns?.h1?.sellsCount),
        priceUsd: toUsd(pair?.priceUsd),
        change1h: parseNumber(pair?.priceChange?.h1),
        change6h: parseNumber(pair?.priceChange?.h6),
        change24h: parseNumber(pair?.priceChange?.h24),
        baseTokenImage: info?.imageUrl ?? pair?.info?.imageUrl,
      }
    })
    // CRITICAL: Filter out tokens with missing data
    .filter((item) => {
      return (
        item.address &&
        item.liquidityUsd !== null &&
        item.volume24hUsd !== null &&
        item.liquidityUsd > 0 &&
        item.volume24hUsd > 0
      )
    })
    // Remove duplicates by address
    .filter((item, index, self) => {
      return self.findIndex((t) => t.address === item.address) === index
    })
    // Sort by trending score: higher volume + liquidity = more trending
    .sort((a, b) => {
      const scoreA = (a.volume24hUsd ?? 0) * 2 + (a.liquidityUsd ?? 0) // Volume weighted 2x
      const scoreB = (b.volume24hUsd ?? 0) * 2 + (a.liquidityUsd ?? 0)
      return scoreB - scoreA
    })

  sharedCache.set(cacheKey, enriched.slice(0, 30), CACHE_TTL_SHORT)
  return enriched.slice(0, 30)
}

export async function fetchMomentumLeaders(): Promise<MomentumLeader[]> {
  const cacheKey = "market-intel:momentum-leaders"
  const cached = sharedCache.get(cacheKey) as MomentumLeader[] | undefined
  if (cached) return cached

  const data = await fetchJson<{ pairs?: any[] }>(DEX_TRENDING_URL, {
    headers: {
      "User-Agent": "OXin-Agent/1.0",
    },
    timeoutMs: 6000,
  })

  const pairs = (data.pairs ?? []) as any[]

  const leaders: MomentumLeader[] = pairs.slice(0, 15).map((pair) => ({
    name: pair?.baseToken?.name ?? "Unnamed",
    symbol: pair?.baseToken?.symbol ?? "?",
    address: pair?.pairAddress ?? pair?.address ?? "",
    priceUsd: toUsd(pair?.priceUsd),
    liquidityUsd: toUsd(pair?.liquidity?.usd),
    volume24hUsd: toUsd(pair?.volume?.h24),
    change1h: parseNumber(pair?.priceChange?.h1),
    change6h: parseNumber(pair?.priceChange?.h6),
    change24h: parseNumber(pair?.priceChange?.h24),
    fdvUsd: toUsd(pair?.fdvUsd),
  }))

  sharedCache.set(cacheKey, leaders, CACHE_TTL_MEDIUM)
  return leaders
}

export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  const cacheKey = "market-intel:macro"
  const cached = sharedCache.get(cacheKey) as MacroSnapshot | undefined
  if (cached) return cached

  const headers: Record<string, string> = {
    "User-Agent": "OXin-Agent/1.0",
  }

  const apiKey = getEnv("COINGECKO_API_KEY")
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey

  const [simple, global] = await Promise.allSettled([
    fetchJson<Record<string, any>>(COINGECKO_SIMPLE_PRICE_URL, { headers, timeoutMs: 7000 }),
    fetchJson<{ data?: any }>(COINGECKO_GLOBAL_URL, { headers, timeoutMs: 7000 }),
  ])

  const simpleData = simple.status === "fulfilled" ? simple.value : undefined
  const globalData = global.status === "fulfilled" ? global.value?.data : undefined

  const snapshot: MacroSnapshot = {
    solPriceUsd: toUsd(simpleData?.solana?.usd),
    solChange24h: parseNumber(simpleData?.solana?.usd_24h_change),
    solMarketCap: toUsd(simpleData?.solana?.usd_market_cap),
    btcDominance: parseNumber(globalData?.market_cap_percentage?.btc),
    marketCap24hChange: parseNumber(globalData?.market_cap_change_percentage_24h_usd),
  }

  sharedCache.set(cacheKey, snapshot, CACHE_TTL_LONG)
  return snapshot
}

interface SolscanChainInfoResponse {
  data?: {
    blockHeight?: number
    current?: {
      slot?: number
      tps?: number
    }
  }
}

async function getSolanaConnection(): Promise<Connection | null> {
  const helius = getEnv("HELIUS_API_KEY")
  if (helius) return new Connection(`https://mainnet.helius-rpc.com/?api-key=${helius}`)

  const getBlockToken = getEnv("GETBLOCK_ACCESS_TOKEN")
  if (getBlockToken) return new Connection(`https://go.getblock.io/${getBlockToken}/`)

  return null
}

export async function fetchNetworkHealth(): Promise<NetworkHealthSnapshot> {
  const cacheKey = "market-intel:network-health"
  const cached = sharedCache.get(cacheKey) as NetworkHealthSnapshot | undefined
  if (cached) return cached

  const headers: Record<string, string> = {
    "User-Agent": "OXin-Agent/1.0",
  }
  const solscanKey = getEnv("SOLSCAN_API_KEY")
  if (solscanKey) headers["token"] = solscanKey

  const chainInfo = await fetchJson<SolscanChainInfoResponse>(SOLSCAN_CHAIN_INFO_URL, {
    headers,
    timeoutMs: 5000,
  }).catch(() => ({ data: {} }))

  const chainData = chainInfo.data ?? {}
  const current = (chainData as { current?: { slot?: number; tps?: number } }).current ?? {}

  let tps: number | null = parseNumber(current?.tps)
  let slot: number | null = parseNumber(current?.slot)
  let blockHeight: number | null = parseNumber((chainData as { blockHeight?: number }).blockHeight)

  if (tps === null || slot === null) {
    const connection = await getSolanaConnection()
    if (connection) {
      try {
        const samples = await connection.getRecentPerformanceSamples(1)
        if (samples.length > 0) {
          tps = Math.round(samples[0].numTransactions / samples[0].samplePeriodSecs)
        }
        const slotInfo = await connection.getSlot().catch(() => null)
        if (typeof slotInfo === "number") {
          slot = slotInfo
        }
        const blockHeightInfo = await connection.getBlockHeight().catch(() => null)
        if (typeof blockHeightInfo === "number") {
          blockHeight = blockHeightInfo
        }
  } catch (_error) {
      }
    }
  }

  const snapshot: NetworkHealthSnapshot = {
    blockHeight,
    averageTps: tps,
    currentSlot: slot,
    healthy: (tps ?? 0) > 2000,
  }

  sharedCache.set(cacheKey, snapshot, CACHE_TTL_SHORT)
  return snapshot
}

interface SolscanTokenMetaResponse {
  data?: {
    symbol?: string
    name?: string
    circulatingSupply?: number
    holders?: number
  }
}

interface DexPairSearchResponse {
  pairs?: Array<{
    baseToken?: { symbol?: string; name?: string }
    pairAddress?: string
    priceUsd?: string | number
    liquidity?: { usd?: string | number }
    volume?: { h24?: string | number }
    fdvUsd?: string | number
  }>
}

export async function fetchRiskSignals(mints: string[]): Promise<RiskSignal[]> {
  const trimmed = [...new Set(mints.filter(Boolean))].slice(0, 6)
  if (trimmed.length === 0) return []

  const results = await Promise.all(
    trimmed.map(async (mint) => {
      const cacheKey = `market-intel:risk:${mint}`
      const cached = sharedCache.get(cacheKey) as RiskSignal | undefined
      if (cached) return cached

      const warnings: string[] = []

      const connection = await getSolanaConnection()
      let metadataName: string | undefined
      let metadataSymbol: string | undefined
      if (connection) {
        try {
          const response = await fetchJson<any>(connection.rpcEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "helius-das",
              method: "getAsset",
              params: { id: mint },
            }),
            timeoutMs: 6000,
          })

          const asset = response?.result
          metadataName = asset?.content?.metadata?.name ?? metadataName
          metadataSymbol = asset?.content?.metadata?.symbol ?? metadataSymbol
  } catch (_error) {
        }
      }

      const headers: Record<string, string> = {
        "User-Agent": "OXin-Agent/1.0",
      }
      const solscanKey = getEnv("SOLSCAN_API_KEY")
      if (solscanKey) headers["token"] = solscanKey

      const solscanMeta = await fetchJson<SolscanTokenMetaResponse>(`${SOLSCAN_TOKEN_META_URL}?tokenAddress=${mint}`, {
        headers,
        timeoutMs: 5000,
      }).catch(() => ({ data: {} }))

      const dexSearch = await fetchJson<DexPairSearchResponse>(`${DEX_SEARCH_URL}${mint}`, {
        headers: { "User-Agent": "OXin-Agent/1.0" },
        timeoutMs: 6000,
      }).catch(() => ({ pairs: [] }))

      const bestPair = dexSearch.pairs?.[0]

      const solscanData = (solscanMeta.data ?? {}) as {
        name?: string
        symbol?: string
        circulatingSupply?: number
        holders?: number
      }

      const signal: RiskSignal = {
        mint,
        name: metadataName ?? bestPair?.baseToken?.name ?? solscanData.name,
        symbol: metadataSymbol ?? bestPair?.baseToken?.symbol ?? solscanData.symbol,
        holders: solscanData.holders ?? undefined,
        circulatingSupply: solscanData.circulatingSupply ?? undefined,
        liquidityUsd: toUsd(bestPair?.liquidity?.usd) ?? undefined,
        priceUsd: toUsd(bestPair?.priceUsd) ?? undefined,
        volume24hUsd: toUsd(bestPair?.volume?.h24) ?? undefined,
        fdvUsd: toUsd(bestPair?.fdvUsd) ?? undefined,
        warnings,
      }

      if ((signal.liquidityUsd ?? 0) < 25_000) {
        warnings.push("Low liquidity (<$25k)")
      }
      if ((signal.volume24hUsd ?? 0) < 10_000) {
        warnings.push("Thin 24h volume (<$10k)")
      }
      if ((signal.holders ?? 0) < 100) {
        warnings.push("Small holder base (<100)")
      }
      
      // RUG PULL INDICATORS
      if ((signal.holders ?? 0) < 50) {
        warnings.push("⚠️ EXTREME RUG RISK: <50 holders")
      }
      if ((signal.liquidityUsd ?? 0) < 10_000) {
        warnings.push("🚨 CRITICAL: Liquidity <$10k (exit impossible)")
      }
      
      // Check for suspicious holder concentration
      const topHolderPercentage = signal.topHolders?.[0]?.percentage ?? 0
      if (topHolderPercentage > 50) {
        warnings.push("🚨 TOP HOLDER OWNS >50% (whale dump risk)")
      } else if (topHolderPercentage > 30) {
        warnings.push("⚠️ Top holder owns >30% (concentrated risk)")
      }
      
      // Volume vs liquidity ratio (pump & dump indicator)
      const volumeLiqRatio = (signal.volume24hUsd ?? 0) / Math.max(signal.liquidityUsd ?? 1, 1)
      if (volumeLiqRatio > 10) {
        warnings.push("🚨 PUMP & DUMP PATTERN: Volume 10x liquidity")
      } else if (volumeLiqRatio > 5) {
        warnings.push("⚠️ High vol/liq ratio (elevated manipulation risk)")
      }

      sharedCache.set(cacheKey, signal, CACHE_TTL_MEDIUM)
      return signal
    }),
  )

  return results.filter(Boolean)
}
