// Test multiple DexScreener endpoints
const ENDPOINTS = {
  search: "https://api.dexscreener.com/latest/dex/search?q=SOL",
  tokens: "https://api.dexscreener.com/latest/dex/tokens/solana",
  orders: "https://api.dexscreener.com/orders/v1/solana",
}

async function debugDex() {
  for (const [name, url] of Object.entries(ENDPOINTS)) {
    console.log(`\n🔍 Testing ${name}: ${url}`)
    
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "OXin-Debug/1.0" },
      })
      
      console.log(`Status: ${res.status}`)
      
      if (res.status === 200) {
        const data = await res.json()
        console.log(`✅ SUCCESS! Keys: ${Object.keys(data).join(', ')}`)
        console.log(`Pairs: ${data.pairs?.length ?? 0}`)
        
        if (data.pairs && data.pairs.length > 0) {
          const sample = data.pairs[0]
          console.log(`Sample:`, {
            symbol: sample.baseToken?.symbol,
            liq: sample.liquidity?.usd,
            vol: sample.volume?.h24,
          })
        }
      }
    } catch (error) {
      console.log(`❌ ${error.message}`)
    }
  }
}

debugDex()
