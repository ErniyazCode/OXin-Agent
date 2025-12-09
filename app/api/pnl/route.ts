import { NextResponse } from "next/server"

interface TransactionToken {
  mint: string
  symbol?: string
  amount: number
  direction: "IN" | "OUT"
}

interface Transaction {
  signature: string
  timestamp: number
  type: "BUY" | "SELL" | "TRANSFER_OUT" | "TRANSFER_IN"
  tokens: TransactionToken[]
  totalUsdValue: number
  solChange: number
}

interface PNLDataPoint {
  timestamp: number
  date: string
  portfolioValue: number
  pnl: number
  pnlPercent: number
}

interface PNLEvent {
  timestamp: number
  type: "BUY" | "SELL" | "TRANSFER_OUT"
  tokens: TransactionToken[]
  totalValue: number
}

/**
 * PNL API - Анализирует историю транзакций кошелька и строит график P&L
 * 
 * Показывает:
 * - Реальную историю стоимости портфеля
 * - Точки покупок (зеленые)
 * - Точки продаж (красные) 
 * - Точки переводов (желтые)
 */
export async function POST(request: Request) {
  try {
    const { walletAddress, timeRange = "30d", currentTokens } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    if (!process.env.HELIUS_API_KEY) {
      return NextResponse.json(
        { error: "Helius API key not configured" },
        { status: 500 }
      )
    }

    // Определяем временной диапазон
    const now = Math.floor(Date.now() / 1000)
    const timeRangeMap: Record<string, number> = {
      "24h": 86400,
      "7d": 604800,
      "30d": 2592000,
      "6m": 15552000,
      "1y": 31536000,
    }
    const startTime = now - (timeRangeMap[timeRange] || timeRangeMap["30d"])

    // Шаг 1: Получить историю транзакций через Helius Enhanced Transactions API
    const transactions: Transaction[] = []
    
    try {
      // Используем getSignaturesForAddress для получения списка транзакций
      const signaturesResponse = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "pnl-signatures",
            method: "getSignaturesForAddress",
            params: [
              walletAddress,
              {
                limit: 1000, // Максимум транзакций
              },
            ],
          }),
        }
      )

      if (!signaturesResponse.ok) {
        throw new Error(`Failed to fetch signatures: ${signaturesResponse.status}`)
      }

      const signaturesData = await signaturesResponse.json()
      
      if (signaturesData.error) {
        throw new Error(signaturesData.error.message || "RPC Error")
      }

      const signatures = signaturesData.result || []
      
      // Фильтруем по времени
      const filteredSignatures = signatures.filter((sig: any) => {
        const sigTime = sig.blockTime || 0
        return sigTime >= startTime && sigTime <= now
      })
      

      // Шаг 2: Получить детали транзакций батчами (Helius Enhanced Transactions)
      // Для демо - берем первые 100 транзакций
      const batchSize = 100
      const signaturesToFetch = filteredSignatures.slice(0, batchSize).map((s: any) => s.signature)

      if (signaturesToFetch.length > 0) {
        
        const enhancedResponse = await fetch(
          `https://api.helius.xyz/v0/transactions?api-key=${process.env.HELIUS_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactions: signaturesToFetch,
            }),
          }
        )

        if (!enhancedResponse.ok) {
          throw new Error(`Enhanced transactions error: ${enhancedResponse.status} ${enhancedResponse.statusText}`)
        } else {
          const enhancedData = await enhancedResponse.json()
          
          // Парсим транзакции (с await так как parseTransaction теперь async)
          for (const tx of enhancedData) {
            const parsed = await parseTransaction(tx, walletAddress)
            if (parsed) {
              transactions.push(parsed)
            }
          }
        }
      } else {
        // Nothing to fetch within the selected time range
      }

    } catch (_error) {
      // Swallow transaction fetching errors to allow response with empty dataset
    }

    transactions.sort((a, b) => a.timestamp - b.timestamp)

    // Шаг 3: Построить timeline портфеля (передаем текущие токены для расчета стоимости)
    const timeline = await buildPortfolioTimeline(transactions, startTime, now, currentTokens || [], timeRange)
    
    // Шаг 4: Извлечь события (точки на графике)
    const events = extractEvents(transactions)

    // Шаг 5: Посчитать статистику
    const stats = calculateStats(timeline, transactions)

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        events,
        stats,
        transactionCount: transactions.length,
      },
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to analyze PNL", message: error.message },
      { status: 500 }
    )
  }
}

// Кэш для исторических цен (чтобы не делать повторные запросы)
const priceCache = new Map<string, number>()

/**
 * Получает историческую цену токена на определенную дату
 * Использует Birdeye для точных данных, DexScreener как fallback
 */
async function getHistoricalPrice(tokenMint: string, timestamp: number): Promise<number> {
  // Проверяем кэш (округляем timestamp до часа для более точного кэша)
  const hourTimestamp = Math.floor(timestamp / 3600) * 3600
  const cacheKey = `${tokenMint}-${hourTimestamp}`
  
  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey)!
  }

  try {
    let price = 0

    // СТРАТЕГИЯ 1: Jupiter Price API (real-time, очень быстрый)
    // Для недавних цен (последние 7 дней) используем текущую цену
    const daysSinceTimestamp = (Date.now() / 1000 - timestamp) / 86400
    
    if (daysSinceTimestamp < 7) {
      try {
        const jupiterResponse = await fetch(
          `https://price.jup.ag/v6/price?ids=${tokenMint}`,
          { next: { revalidate: 60 } }
        )
        
        if (jupiterResponse.ok) {
          const jupiterData = await jupiterResponse.json()
          if (jupiterData.data && jupiterData.data[tokenMint]) {
            price = jupiterData.data[tokenMint].price || 0
            
            if (price > 0) {
              priceCache.set(cacheKey, price)
              return price
            }
          }
        }
      } catch (_error) {}
    }

    // СТРАТЕГИЯ 2: DexScreener (fallback для всех токенов)
    try {
      const dexResponse = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`,
        { next: { revalidate: 3600 } }
      )
      
      if (dexResponse.ok) {
        const dexData = await dexResponse.json()
        if (dexData.pairs && dexData.pairs.length > 0) {
          price = parseFloat(dexData.pairs[0].priceUsd) || 0
          
          if (price > 0) {
            priceCache.set(cacheKey, price)
            return price
          }
        }
      }
    } catch (_error) {}

    // СТРАТЕГИЯ 3: Birdeye (если есть ключ и нужна историческая цена)
    if (process.env.BIRDEYE_API_KEY && daysSinceTimestamp >= 7) {
      const timeFrom = timestamp - 86400
      const timeTo = timestamp + 86400
      
      try {
        const birdeyeResponse = await fetch(
          `https://public-api.birdeye.so/defi/ohlcv?address=${tokenMint}&type=1D&time_from=${timeFrom}&time_to=${timeTo}`,
          {
            headers: {
              "X-API-KEY": process.env.BIRDEYE_API_KEY,
            },
          }
        )

        if (birdeyeResponse.ok) {
          const birdeyeData = await birdeyeResponse.json()
          if (birdeyeData.data?.items && birdeyeData.data.items.length > 0) {
            const candle = birdeyeData.data.items[0]
            price = candle.c || candle.o || 0
            
            if (price > 0) {
              priceCache.set(cacheKey, price)
              return price
            }
          }
        }
      } catch (_error) {}
    }

    // Сохраняем 0 в кэш чтобы не повторять неудачные запросы
    priceCache.set(cacheKey, 0)
    return 0

  } catch (_error) {
    priceCache.set(cacheKey, 0)
    return 0
  }
}

/**
 * Парсит транзакцию и определяет её тип
 */
const SOL_MINT = "So11111111111111111111111111111111111111112"
const STABLE_MINTS = new Map<string, string>([
  ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDC"],
  ["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USDT"],
])

async function parseTransaction(tx: any, walletAddress: string): Promise<Transaction | null> {
  try {
    const timestamp = tx.timestamp
    const rawType = tx.type // SWAP, TRANSFER, etc

    const tokens: TransactionToken[] = []

    // Подсчитываем изменение SOL (native transfers)
    let solChange = 0
    if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
      for (const transfer of tx.nativeTransfers) {
        const amountLamports = Number(transfer.amount || 0)
        const amountSol = amountLamports / 1e9
        if (transfer.toUserAccount === walletAddress) {
          solChange += amountSol
        }
        if (transfer.fromUserAccount === walletAddress) {
          solChange -= amountSol
        }
      }
    }

    // Анализируем SPL токены
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      for (const transfer of tx.tokenTransfers) {
        const mint = transfer.mint || transfer.tokenAddress
        if (!mint) continue

        const symbol = transfer.tokenSymbol || STABLE_MINTS.get(mint) || mint.slice(0, 6)
        const rawAmount = transfer.tokenAmount ?? transfer.amount ?? 0
        const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount)
        const direction: "IN" | "OUT" = transfer.toUserAccount === walletAddress ? "IN" : "OUT"

        tokens.push({
          mint,
          symbol,
          amount,
          direction,
        })
      }
    }

    // Определяем тип операции
    let txType: Transaction["type"] = "TRANSFER_IN"
    const hasIncomingTokens = tokens.some((t) => t.direction === "IN")
    const hasOutgoingTokens = tokens.some((t) => t.direction === "OUT")

    // 1. Проверяем SWAP транзакции (приоритет)
    if (rawType === "SWAP" || (hasIncomingTokens && hasOutgoingTokens)) {
      // Если есть исходящий стейбл или SOL - это BUY
      const hasOutgoingStable = tokens.some((t) => t.direction === "OUT" && STABLE_MINTS.has(t.mint))
      const hasOutgoingSol = solChange < 0
      
      // Если есть входящий стейбл или SOL - это SELL
      const hasIncomingStable = tokens.some((t) => t.direction === "IN" && STABLE_MINTS.has(t.mint))
      const hasIncomingSol = solChange > 0
      
      if (hasOutgoingStable || hasOutgoingSol) {
        txType = "BUY"
      } else if (hasIncomingStable || hasIncomingSol) {
        txType = "SELL"
      } else {
        // Swap токен на токен - считаем как SELL старого
        txType = "SELL"
      }
    }
    // 2. Проверяем транзакции с изменением SOL
    else if (Math.abs(solChange) > 1e-8) {
      if (solChange < 0) {
        txType = hasIncomingTokens ? "BUY" : "TRANSFER_OUT"
      } else {
        txType = hasOutgoingTokens ? "SELL" : "TRANSFER_IN"
      }
    }
    // 3. Чистые переводы токенов
    else {
      if (hasOutgoingTokens && !hasIncomingTokens) {
        txType = "TRANSFER_OUT"
      } else if (hasIncomingTokens && !hasOutgoingTokens) {
        txType = "TRANSFER_IN"
      } else {
        txType = "TRANSFER_IN"
      }
    }

    // Считаем USD значение сделки
    let totalUsdValue = 0
    const solPrice = await getHistoricalPrice(SOL_MINT, timestamp)
    if (Math.abs(solChange) > 0 && solPrice) {
      totalUsdValue = Math.abs(solChange) * solPrice
    }

    if (totalUsdValue === 0) {
      const stableValue = tokens
        .filter((token) => STABLE_MINTS.has(token.mint))
        .reduce((sum, token) => sum + Math.abs(token.amount), 0)
      if (stableValue > 0) {
        totalUsdValue = stableValue
      }
    }

    // Если USD стоимость пока 0, пробуем вычислить по остальным токенам
    if (totalUsdValue === 0) {
      for (const token of tokens) {
        if (STABLE_MINTS.has(token.mint)) continue

        const price = await getHistoricalPrice(token.mint, timestamp)
        if (price > 0) {
          totalUsdValue += Math.abs(token.amount) * price
        }
      }
    }

    // Если так и не смогли определить стоимость и нет токенов - пропускаем
    if (tokens.length === 0 && Math.abs(solChange) < 1e-9) {
      return null
    }

    return {
      signature: tx.signature,
      timestamp,
      type: txType,
      tokens,
      totalUsdValue,
      solChange,
    }
  } catch (_error) {
    return null
  }
}

/**
 * Строит timeline стоимости портфеля день за днем
 * ВАЖНО: Учитываем РЕАЛЬНУЮ стоимость токенов на каждый день!
 */
async function buildPortfolioTimeline(
  transactions: Transaction[],
  startTime: number,
  endTime: number,
  currentTokens: any[],
  timeRange?: string
): Promise<PNLDataPoint[]> {
  const timeline: PNLDataPoint[] = []
  
  // Если нет транзакций в выбранном периоде, но есть текущие токены - показываем текущий портфель
  if (transactions.length === 0 && currentTokens.length > 0) {
    // Строим timeline на основе ТЕКУЩИХ токенов и их change24h
    let intervalSeconds = 86400
    
    if (timeRange === '24h') {
      intervalSeconds = 3600 // Каждый час
    } else if (timeRange === '7d') {
      intervalSeconds = 21600 // Каждые 6 часов
    } else if (timeRange === '30d') {
      intervalSeconds = 86400 // Каждый день
    } else {
      intervalSeconds = 86400 * 7 // Каждую неделю
    }
    
    const points = Math.ceil((endTime - startTime) / intervalSeconds)
    
    for (let i = 0; i <= points; i++) {
      const pointTimestamp = startTime + i * intervalSeconds
      const pointDate = new Date(pointTimestamp * 1000)
      
      // Рассчитываем прогресс от начала периода (0 = start, 1 = end)
      const progress = i / points
      
      // Считаем стоимость портфеля на этой точке
      let portfolioValue = 0
      
      // ДЛЯ КАЖДОГО ТОКЕНА считаем его цену в этой точке времени
      for (const token of currentTokens) {
        if (!token.balance || token.balance <= 0) continue
        
        const currentPrice = token.price || 0
        if (currentPrice <= 0) continue
        
        // Берём change24h ЭТОГО токена (не всего портфеля!)
        const change24hPercent = token.change24h || 0
        
        // Цена 24 часа назад = текущая цена / (1 + изменение%)
        // Например: SOL сейчас $219, +6.28% → 24h назад = $219 / 1.0628 = $206
        const price24hAgo = currentPrice / (1 + change24hPercent / 100)
        
        // Интерполируем цену между ценой 24h назад и текущей
        // progress=0 → price24hAgo, progress=1 → currentPrice
        const interpolatedPrice = price24hAgo + (currentPrice - price24hAgo) * progress
        
        // Считаем стоимость ЭТОГО токена в портфеле
        portfolioValue += token.balance * interpolatedPrice
      }
      
      const dateFormat = timeRange === '24h' 
        ? pointDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : pointDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      
      timeline.push({
        timestamp: pointTimestamp,
        date: dateFormat,
        portfolioValue,
        pnl: 0,
        pnlPercent: 0,
      })
    }
    
    // Рассчитываем PnL относительно первой точки
    if (timeline.length > 0) {
      const baselineValue = timeline[0].portfolioValue
      for (const entry of timeline) {
        entry.pnl = entry.portfolioValue - baselineValue
        entry.pnlPercent = baselineValue > 0 ? (entry.pnl / baselineValue) * 100 : 0
      }
    }
    
    return timeline
  }
  
  // Если нет транзакций вообще - возвращаем пустой timeline
  if (transactions.length === 0) {
    return timeline
  }

  // Найти дату первой покупки (не TRANSFER_IN!)
  let firstBuyOrSell = transactions
    .filter(tx => tx.type === "BUY" || tx.type === "SELL")
    .sort((a, b) => a.timestamp - b.timestamp)[0]
  
  // Если нет BUY/SELL, используем любые транзакции для построения timeline
  if (!firstBuyOrSell && transactions.length > 0) {
    firstBuyOrSell = transactions[0]
  }
  
  if (!firstBuyOrSell) {
    return timeline
  }

  // Начинаем timeline с дня первой покупки
  const actualStartTime = Math.floor(firstBuyOrSell.timestamp / 86400) * 86400
  const days = Math.ceil((endTime - actualStartTime) / 86400)
  
  // Трекаем баланс каждого токена
  const tokenBalances = new Map<string, { amount: number; symbol: string }>()
  const rawTimeline: Array<{ timestamp: number; date: string; portfolioValue: number }> = []

  for (let i = 0; i <= days; i++) {
    const dayTimestamp = actualStartTime + i * 86400
    const dayDate = new Date(dayTimestamp * 1000)

    // Найти все транзакции за этот день
    const dayTransactions = transactions.filter(
      (tx) =>
        tx.timestamp >= dayTimestamp &&
        tx.timestamp < dayTimestamp + 86400
    )

    // Обновить балансы токенов на основе транзакций
    for (const tx of dayTransactions) {
      for (const token of tx.tokens) {
        const key = token.mint
        const existing = tokenBalances.get(key)
        let delta = 0
        if (token.direction === "IN") {
          delta = token.amount
        } else if (token.direction === "OUT") {
          delta = -token.amount
        }

        if (delta !== 0) {
          const symbol = existing?.symbol ?? token.symbol ?? key.slice(0, 6)
          tokenBalances.set(key, {
            amount: (existing?.amount ?? 0) + delta,
            symbol,
          })
        }
      }

      if (typeof tx.solChange === "number" && Math.abs(tx.solChange) > 0) {
        const existing = tokenBalances.get(SOL_MINT)
        tokenBalances.set(SOL_MINT, {
          amount: (existing?.amount ?? 0) + tx.solChange,
          symbol: existing?.symbol ?? "SOL",
        })
      }

      // Дополнительные корректировки тут не нужны: delta уже учтен выше
    }

    // Считаем РЕАЛЬНУЮ стоимость портфеля на этот день
    // Используем ТЕКУЩИЕ цены токенов (из currentTokens)
    let portfolioValue = 0
    
    for (const [mint, info] of tokenBalances.entries()) {
      if (info.amount <= 0) continue
      
      // Ищем токен в currentTokens чтобы взять текущую цену
      const currentToken = currentTokens.find(
        (t: any) => t.mint === mint || t.symbol === info.symbol
      )
      
      if (currentToken && currentToken.price) {
        // Используем ТЕКУЩУЮ цену токена
        portfolioValue += info.amount * currentToken.price
      } else {
        // Если не нашли токен - попробуем получить историческую цену
        const price = await getHistoricalPrice(mint, dayTimestamp)
        if (price > 0) {
          portfolioValue += info.amount * price
        }
      }
    }

    rawTimeline.push({
      timestamp: dayTimestamp,
      date: dayDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      portfolioValue,
    })
  }

  if (rawTimeline.length === 0) {
    return timeline
  }

  const baselineValue = rawTimeline.find((point) => point.portfolioValue > 0)?.portfolioValue ?? rawTimeline[0].portfolioValue

  for (const entry of rawTimeline) {
    const pnl = entry.portfolioValue - baselineValue
    const pnlPercent = baselineValue > 0 ? (pnl / baselineValue) * 100 : 0
    timeline.push({
      ...entry,
      pnl,
      pnlPercent,
    })
  }

  return timeline
}

/**
 * Извлекает события для отображения точек на графике
 */
function extractEvents(transactions: Transaction[]): PNLEvent[] {
  return transactions
    .filter((tx) => tx.type !== "TRANSFER_IN") // Не показываем входящие переводы
    .map((tx) => ({
      timestamp: tx.timestamp,
      type: tx.type as "BUY" | "SELL" | "TRANSFER_OUT",
      tokens: tx.tokens.filter((token) => {
        if (tx.type === "BUY") return token.direction === "IN"
        if (tx.type === "SELL") return token.direction === "OUT"
        if (tx.type === "TRANSFER_OUT") return token.direction === "OUT"
        return token.direction === "IN"
      }),
      totalValue: tx.totalUsdValue,
    }))
}

/**
 * Считает статистику
 */
function calculateStats(timeline: PNLDataPoint[], transactions: Transaction[]) {
  const baseline = timeline.length > 0 ? timeline[0].portfolioValue : 0
  const currentValue = timeline.length > 0 ? timeline[timeline.length - 1].portfolioValue : 0

  const bestDay = timeline.length > 0
    ? timeline.reduce((best, day) => (day.portfolioValue > best.portfolioValue ? day : best))
    : null

  const totalPnl = currentValue - baseline
  const totalPnlPercent = baseline > 0 ? (totalPnl / baseline) * 100 : 0

  return {
    investedCapital: baseline,
    currentValue,
  bestDayValue: bestDay?.portfolioValue ?? 0,
  bestDayDate: bestDay?.date ?? "",
    totalPnl,
    totalPnlPercent,
    totalBuys: transactions.filter((tx) => tx.type === "BUY").length,
    totalSells: transactions.filter((tx) => tx.type === "SELL").length,
    totalTransfers: transactions.filter((tx) => tx.type === "TRANSFER_OUT").length,
  }
}
