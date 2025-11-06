import { type NextRequest, NextResponse } from "next/server"
import { Connection, PublicKey } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

interface Token {
  mint: string
  balance: number
  decimals: number
  symbol?: string
  name?: string
  logoURI?: string
  price?: number
  value?: number
  change24h?: number
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    // Try Helius first, fallback to GetBlock
    let rpcUrl: string
    let rpcProvider = "helius"

    if (process.env.HELIUS_API_KEY) {
      rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      rpcProvider = "helius"
    } else if (process.env.GETBLOCK_ACCESS_TOKEN) {
      rpcUrl = `https://go.getblock.io/${process.env.GETBLOCK_ACCESS_TOKEN}/`
      rpcProvider = "getblock"
    } else {
      // Fallback to public RPC (slower, rate limited)
      rpcUrl = "https://api.mainnet-beta.solana.com"
      rpcProvider = "public"
    }
    const connection = new Connection(rpcUrl, "confirmed")

    const publicKey = new PublicKey(walletAddress)

    // Get all token accounts for the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    })

    const tokens: Token[] = []

    // Get SOL balance
    const solBalance = await connection.getBalance(publicKey)
    const solToken: Token = {
      mint: "So11111111111111111111111111111111111111112",
      balance: solBalance / 1e9,
      decimals: 9,
      symbol: "SOL",
      name: "Solana",
      logoURI:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    }

    // Fetch SOL price from CoinGecko
    try {
      const coinGeckoApiKey = process.env.COINGECKO_API_KEY
      if (coinGeckoApiKey) {
        const priceResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${coinGeckoApiKey}`,
        )
        const priceData = await priceResponse.json()
        if (priceData.solana) {
          solToken.price = priceData.solana.usd
          solToken.value = solToken.balance * priceData.solana.usd
          solToken.change24h = priceData.solana.usd_24h_change
        }
      }
  } catch (_error) {}

    tokens.push(solToken)

    for (const { account } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed.info
      const balance = parsedInfo.tokenAmount.uiAmount
      const decimals = parsedInfo.tokenAmount.decimals
      const mint = parsedInfo.mint

      // Skip tokens with zero balance
      if (balance === 0) continue

      const token: Token = {
        mint,
        balance,
        decimals,
      }

      // Try DexScreener first (best for meme tokens and pump.fun tokens)
      try {
        const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
        if (dexResponse.ok) {
          const dexData = await dexResponse.json()
          if (dexData.pairs && dexData.pairs.length > 0) {
            const pair = dexData.pairs[0]
            token.symbol = pair.baseToken.symbol
            token.name = pair.baseToken.name
            token.price = Number.parseFloat(pair.priceUsd) || 0
            token.value = balance * (token.price || 0)
            token.change24h = pair.priceChange?.h24 || 0
            // Получаем логотип из DexScreener
            if (pair.info?.imageUrl) {
              token.logoURI = pair.info.imageUrl
            }
          }
        }
  } catch (_error) {}

      // If DexScreener didn't work, try Helius DAS API for metadata
      if (!token.symbol || !token.name) {
        try {
          const dasResponse = await fetch(rpcUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "helius-das",
              method: "getAsset",
              params: {
                id: mint,
              },
            }),
          })

          if (dasResponse.ok) {
            const dasData = await dasResponse.json()
            if (dasData.result) {
              const metadata = dasData.result.content?.metadata
              if (metadata) {
                token.symbol = metadata.symbol || token.symbol
                token.name = metadata.name || token.name
              }
              const links = dasData.result.content?.links
              if (links?.image) {
                token.logoURI = links.image
              }
            }
          }
  } catch (_error) {}
      }

      // If still no price, try to get it from DexScreener again with the symbol
      if (!token.price && token.symbol) {
        try {
          const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${token.symbol}`)
          if (dexResponse.ok) {
            const dexData = await dexResponse.json()
            const matchingPair = dexData.pairs?.find(
              (p: any) => p.baseToken.address.toLowerCase() === mint.toLowerCase(),
            )
            if (matchingPair) {
              token.price = Number.parseFloat(matchingPair.priceUsd) || 0
              token.value = balance * (token.price || 0)
              token.change24h = matchingPair.priceChange?.h24 || 0
              // Получаем логотип если его еще нет
              if (!token.logoURI && matchingPair.info?.imageUrl) {
                token.logoURI = matchingPair.info.imageUrl
              }
            }
          }
  } catch (_error) {}
      }

      tokens.push(token)
    }

    // Sort tokens by value (highest first)
    const sortedTokens = tokens.sort((a, b) => (b.value || 0) - (a.value || 0))

    return NextResponse.json({ tokens: sortedTokens })
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 })
  }
}
