// Test recommendation logic with age filtering
const DEX_TRENDING_URL = "https://api.dexscreener.com/token-trending/solana"

function formatUsd(value) {
  if (!value) return "n/a"
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatAge(createdAt) {
  if (!createdAt) return "age unknown"
  const ageHours = (Date.now() / 1000 - createdAt) / 3600
  if (ageHours < 24) return `${ageHours.toFixed(1)}h old (FRESH)`
  return `${(ageHours / 24).toFixed(1)} days old`
}

async function testRecommendations() {
  console.log("🔍 Fetching trending tokens from DexScreener...\n")

  try {
    const res = await fetch(DEX_TRENDING_URL, {
      headers: { "User-Agent": "OXin-Test/1.0" },
    })
    const data = await res.json()
    
    if (!data.pairs || data.pairs.length === 0) {
      console.log("❌ No pairs returned")
      return
    }

    console.log(`✅ Got ${data.pairs.length} trending pairs\n`)

    // Filter and enrich
    const enriched = data.pairs
      .map((pair) => ({
        name: pair.baseToken?.name ?? "Unnamed",
        symbol: pair.baseToken?.symbol ?? "?",
        address: pair.pairAddress ?? pair.address ?? "",
        createdAt: pair.pairCreatedAt ?? null,
        liquidityUsd: pair.liquidity?.usd ?? null,
        volume24hUsd: pair.volume?.h24 ?? null,
        change24h: pair.priceChange?.h24 ?? null,
        change1h: pair.priceChange?.h1 ?? null,
      }))
      .filter((token) => {
        // Same filter as production
        return (
          token.address &&
          token.liquidityUsd !== null &&
          token.volume24hUsd !== null &&
          token.liquidityUsd > 0 &&
          token.volume24hUsd > 0
        )
      })
      .sort((a, b) => {
        const scoreA = (a.volume24hUsd ?? 0) + (a.liquidityUsd ?? 0) * 0.5
        const scoreB = (b.volume24hUsd ?? 0) + (b.liquidityUsd ?? 0) * 0.5
        return scoreB - scoreA
      })

    console.log(`✅ ${enriched.length} tokens passed data filter\n`)

    // Categorize
    const prime = enriched.filter(
      (m) => m.liquidityUsd >= 100_000 && m.volume24hUsd >= 80_000
    )
    const tactical = enriched.filter(
      (m) =>
        m.liquidityUsd >= 50_000 &&
        m.volume24hUsd >= 30_000 &&
        !prime.includes(m)
    )
    const fresh = enriched.filter((m) => {
      if (!m.createdAt) return false
      const ageHours = (Date.now() / 1000 - m.createdAt) / 3600
      return (
        ageHours < 24 &&
        m.liquidityUsd >= 30_000 &&
        m.volume24hUsd >= 20_000 &&
        !prime.includes(m) &&
        !tactical.includes(m)
      )
    })

    console.log("📊 RECOMMENDATION BREAKDOWN:\n")
    console.log(`🎯 HIGH confidence (prime): ${prime.length} tokens`)
    console.log(`⚡ MEDIUM confidence (tactical): ${tactical.length} tokens`)
    console.log(`🚀 FRESH launches (<24h): ${fresh.length} tokens\n`)

    if (prime.length > 0) {
      console.log("🎯 TOP HIGH-CONVICTION PLAY:")
      const top = prime[0]
      console.log(`  Name: ${top.name} (${top.symbol})`)
      console.log(`  Contract: ${top.address}`)
      console.log(`  Age: ${formatAge(top.createdAt)}`)
      console.log(`  Liquidity: ${formatUsd(top.liquidityUsd)}`)
      console.log(`  Volume 24h: ${formatUsd(top.volume24hUsd)}`)
      console.log(`  Change 24h: ${top.change24h?.toFixed(2)}%`)
      console.log(`  Change 1h: ${top.change1h?.toFixed(2)}%\n`)
    }

    if (tactical.length > 0) {
      console.log("⚡ TOP TACTICAL PLAY:")
      const top = tactical[0]
      console.log(`  Name: ${top.name} (${top.symbol})`)
      console.log(`  Contract: ${top.address}`)
      console.log(`  Age: ${formatAge(top.createdAt)}`)
      console.log(`  Liquidity: ${formatUsd(top.liquidityUsd)}`)
      console.log(`  Volume 24h: ${formatUsd(top.volume24hUsd)}\n`)
    }

    if (fresh.length > 0) {
      console.log("🚀 TOP FRESH LAUNCH:")
      const top = fresh[0]
      console.log(`  Name: ${top.name} (${top.symbol})`)
      console.log(`  Contract: ${top.address}`)
      console.log(`  Age: ${formatAge(top.createdAt)}`)
      console.log(`  Liquidity: ${formatUsd(top.liquidityUsd)}`)
      console.log(`  Volume 24h: ${formatUsd(top.volume24hUsd)}\n`)
    }

    if (prime.length === 0 && tactical.length === 0 && fresh.length === 0) {
      console.log("⚠️ NO QUALIFIED PLAYS DETECTED")
      console.log("All tokens below safety thresholds.\n")
      
      if (enriched.length > 0) {
        console.log("Top 3 tokens (for reference only):")
        enriched.slice(0, 3).forEach((token, i) => {
          console.log(`  ${i + 1}. ${token.symbol} — ${formatAge(token.createdAt)}`)
          console.log(`     Liq: ${formatUsd(token.liquidityUsd)} | Vol: ${formatUsd(token.volume24hUsd)}`)
        })
      }
    }

    console.log("\n✅ Test complete!")
  } catch (error) {
    console.error("❌ Test failed:", error.message)
  }
}

testRecommendations()
