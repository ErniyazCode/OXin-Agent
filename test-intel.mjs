// Test market intel fetching
import { Connection } from "@solana/web3.js"

const DEX_PAIRS_URL = "https://api.dexscreener.com/latest/dex/pairs/solana"
const DEX_BOOSTED_URL = "https://api.dexscreener.com/token-boosts/latest/v1"

async function testFetch() {
  console.log("🔍 Testing DexScreener endpoints...\n")

  try {
    console.log("1️⃣ Fetching Solana pairs...")
    const pairsRes = await fetch(DEX_PAIRS_URL, {
      headers: { "User-Agent": "OXin-Test/1.0" },
    })
    const pairsData = await pairsRes.json()
    console.log(`✅ Got ${pairsData.pairs?.length || 0} pairs`)
    
    if (pairsData.pairs?.length > 0) {
      const sample = pairsData.pairs[0]
      console.log("Sample pair:", {
        symbol: sample.baseToken?.symbol,
        address: sample.pairAddress,
        liquidity: sample.liquidity?.usd,
        volume24h: sample.volume?.h24,
        created: sample.pairCreatedAt,
      })
    }
  } catch (error) {
    console.error("❌ Pairs fetch failed:", error.message)
  }

  console.log("\n2️⃣ Fetching boosted tokens...")
  try {
    const boostedRes = await fetch(DEX_BOOSTED_URL, {
      headers: { "User-Agent": "OXin-Test/1.0" },
    })
    const boostedData = await boostedRes.json()
    console.log(`✅ Got ${Array.isArray(boostedData) ? boostedData.length : 0} boosted tokens`)
    
    if (Array.isArray(boostedData) && boostedData.length > 0) {
      console.log("Sample boosted:", {
        address: boostedData[0].tokenAddress || boostedData[0].address,
        symbol: boostedData[0].info?.symbol,
      })
    }
  } catch (error) {
    console.error("❌ Boosted fetch failed:", error.message)
  }

  console.log("\n3️⃣ Testing recommendation logic...")
  
  // Simulate some meme data
  const mockMemes = [
    {
      name: "TestCoin1",
      symbol: "TEST1",
      address: "11111111111111111111111111111111",
      liquidityUsd: 150000,
      volume24hUsd: 120000,
      change24h: 25,
      change1h: 5,
    },
    {
      name: "TestCoin2",
      symbol: "TEST2",
      address: "22222222222222222222222222222222",
      liquidityUsd: 60000,
      volume24hUsd: 40000,
      change24h: 15,
      change1h: 3,
    },
    {
      name: "TestCoin3",
      symbol: "TEST3",
      address: "33333333333333333333333333333333",
      liquidityUsd: 20000,
      volume24hUsd: 15000,
      change24h: 8,
      change1h: 1,
    },
  ]

  const prime = mockMemes.filter(
    (m) => m.liquidityUsd >= 100000 && m.volume24hUsd >= 80000
  )
  const tactical = mockMemes.filter(
    (m) =>
      m.liquidityUsd >= 50000 &&
      m.volume24hUsd >= 30000 &&
      !prime.includes(m)
  )
  const watchlist = mockMemes.filter(
    (m) =>
      m.liquidityUsd >= 15000 &&
      m.liquidityUsd < 50000 &&
      !prime.includes(m) &&
      !tactical.includes(m)
  )

  console.log(`HIGH confidence (prime): ${prime.length} tokens`)
  console.log(`MEDIUM confidence (tactical): ${tactical.length} tokens`)
  console.log(`LOW confidence (watchlist): ${watchlist.length} tokens`)

  if (prime.length > 0) {
    console.log("\n🎯 HIGH-CONVICTION PLAY:")
    console.log(`  ${prime[0].symbol} — ${prime[0].address}`)
    console.log(`  Liq $${prime[0].liquidityUsd.toLocaleString()}, Vol $${prime[0].volume24hUsd.toLocaleString()}`)
  }

  console.log("\n✅ Test complete!")
}

testFetch()
